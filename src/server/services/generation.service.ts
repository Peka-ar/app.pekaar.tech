import { ID, Query } from "node-appwrite";
import { AssetStatus, AssetType, ReferenceView, GenerationMode, GenerationStatus, ProjectStatus } from "@/lib/enums";
import { SYSTEM_ACTOR, canTransition } from "@/server/domain/project-state-machine";
import { createAdminClient } from "@/server/appwrite";
import { Permission, Role as AppwriteRole, Storage, ImageFormat } from "node-appwrite";
import { getTablesDB, getRowSafe, type ProjectsRow, type UsersRow, type AssetsRow } from "@/server/db/client";
import { logger } from "@/server/logging";
import { findGlbPath, GENERATION_QUALITY } from "@/server/hunyuan/manifest";
import {
  submitJob,
  pollJob,
  downloadArtifact,
  withFailover,
  Hy3dExpiredError,
  Hy3dTransientError,
} from "@/server/hunyuan/client";
import { buildFileUrl, APPWRITE_MODELS_BUCKET_ID, APPWRITE_REFERENCE_IMAGES_BUCKET_ID } from "@/lib/appwrite-config";
import { ValidationError, NotFoundError } from "@/server/http/errors";
import { APPWRITE_DATABASE_ID } from "@/lib/appwrite-config";

const log = logger;

const BUCKETS = {
  projectAsset: APPWRITE_MODELS_BUCKET_ID,
  referenceImage: APPWRITE_REFERENCE_IMAGES_BUCKET_ID,
};

const TABLES = {
  projects: "projects",
  assets: "assets",
  users: "users",
};

export const GENERATION_COSTS: Record<string, number> = {
  [GenerationMode.PREMIUM]: 10,
  [GenerationMode.FAST]: 2,
  REGENERATE: 1,
};

const JOB_TIMEOUT_MS = 15 * 60 * 1000;

function nowISO(): string {
  return new Date().toISOString();
}

// ──────────────────────────── Credit refund ─────────────────────────────

export async function refundCredits(userId: string, amount: number) {
  const tablesDB = getTablesDB();
  try {
    await tablesDB.incrementRowColumn({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.users,
      rowId: userId,
      column: "usageLimits",
      value: amount,
    });
    return;
  } catch {}
  // Fallback for environments without incrementRowColumn
  const user = await getRowSafe<UsersRow>(TABLES.users, userId);
  if (!user) return;
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.users,
    rowId: userId,
    data: {
      usageLimits: (user.usageLimits ?? 0) + amount,
    },
  });
}

// ──────────────────────────── Image normalization ────────────────────────

async function normalizeImage(
  assetId: string,
): Promise<Uint8Array> {
  const asset = await getRowSafe<AssetsRow>(TABLES.assets, assetId);
  if (!asset || asset.status !== AssetStatus.READY) {
    throw new ValidationError(`Asset ${assetId} is not ready`);
  }
  if (asset.size > 10 * 1024 * 1024) {
    throw new ValidationError(
      `Image ${assetId} is ${(asset.size / 1e6).toFixed(1)} MB — Appwrite preview requires <10 MB. Try a smaller or cropped version.`,
    );
  }
  try {
    const storage = new Storage(createAdminClient());
    const buf = await storage.getFilePreview({
      bucketId: BUCKETS.referenceImage,
      fileId: assetId,
      width: 1536,
      output: ImageFormat.Jpg,
      quality: 90,
    });
    const bytes = new Uint8Array(buf);
    if (bytes.byteLength > 8 * 1024 * 1024) {
      throw new ValidationError(
        `Image ${assetId} is too large for the AI pipeline after normalization (${(bytes.byteLength / 1e6).toFixed(1)} MB > 8 MB). Try a smaller or cropped version.`,
      );
    }
    return bytes;
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError(
      `Failed to normalize image ${assetId}. Ensure the asset is an image under 10 MB.`,
    );
  }
}

async function normalizeAllViews(
  views: Record<string, string>,
): Promise<Map<string, Uint8Array>> {
  const result = new Map<string, Uint8Array>();
  for (const [tag, assetId] of Object.entries(views)) {
    result.set(tag, await normalizeImage(assetId));
  }
  return result;
}

// ──────────────────────────── Start (brand) ─────────────────────────────

export interface StartFastGenerationParams {
  projectId: string;
  brandId: string;
  viewTagToAssetId: Record<string, string>;
  creditCost?: number;
}

export async function startFastGeneration(params: StartFastGenerationParams) {
  const { projectId, brandId, viewTagToAssetId } = params;
  const creditCost = params.creditCost ?? GENERATION_COSTS[GenerationMode.FAST];
  const logg = log.child({ projectId, brandId });

  const project = await getRowSafe<ProjectsRow>(TABLES.projects, projectId);
  if (!project || project.brandId !== brandId) throw new NotFoundError("Project not found");

  if (project.generationMode !== GenerationMode.FAST) {
    throw new ValidationError("This project is not in AI Draft mode");
  }
  if (project.status !== ProjectStatus.PENDING && project.status !== ProjectStatus.REVISIONS) {
    throw new ValidationError("Project is not in a startable state");
  }

  const tablesDB = getTablesDB();
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.projects,
    rowId: projectId,
    data: {
      generationStatus: GenerationStatus.SUBMITTED,
      generationJobId: null,
      generationRunId: null,
      generationAssetId: null,
      generationError: null,
      generationStartedAt: nowISO(),
      generationCompletedAt: null,
      generationCreditCost: String(creditCost),
    },
  });

  let submission: Awaited<ReturnType<typeof import("@/server/hunyuan/manifest").buildSubmission>>;
  try {
    logg.info("normalizing images");
    const viewBytes = await normalizeAllViews(viewTagToAssetId);

    const views = Array.from(viewBytes.entries())
      .sort(([a], [b]) => {
        const order = ["front", "left", "back", "right"];
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([tag, bytes]) => ({ tag: tag as ReferenceView, bytes }));

    const { buildSubmission } = await import("@/server/hunyuan/manifest");
    submission = buildSubmission(views);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logg.error("normalization or manifest failed", { error: err.message });
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      rowId: projectId,
      data: {
        generationStatus: GenerationStatus.FAILED,
        generationError: err.message.slice(0, 2000),
        generationCompletedAt: nowISO(),
      },
    });
    throw e;
  }

  logg.info("submitting to Modal", { mode: submission.mode, fileCount: submission.files.length });

  let jobId: string;
  try {
    const result = await withFailover((config) =>
      submitJob(config, {
        mode: submission.mode,
        files: submission.files,
        manifest: submission.manifest,
        options: { quality: GENERATION_QUALITY, remove_bg: true },
      }),
    );
    jobId = result.job_id;
    logg.info("job submitted", { jobId, mode: result.mode });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logg.error("submission failed", { error: err.message });
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      rowId: projectId,
      data: {
        generationStatus: GenerationStatus.FAILED,
        generationError: err.message,
      },
    });
    throw e;
  }

  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.projects,
    rowId: projectId,
    data: {
      generationStatus: GenerationStatus.RUNNING,
      generationJobId: jobId,
    },
  });

  logg.info("generation started", { jobId });
  return { jobId, mode: submission.mode };
}

// ──────────────────────────── Poll + finalize ────────────────────────────

export interface PollResult {
  projectId: string;
  generationStatus: GenerationStatus;
  generationError?: string;
  generationCompletedAt?: string;
}

export async function pollAndFinalize(projectId: string): Promise<PollResult> {
  const logg = log.child({ projectId });

  const project = await getRowSafe<ProjectsRow>(TABLES.projects, projectId);
  if (!project) throw new NotFoundError("Project not found");

  const refundCost = () => {
    const stored = project.generationCreditCost ? Number(project.generationCreditCost) : NaN;
    return Number.isFinite(stored) && stored > 0 ? stored : GENERATION_COSTS[GenerationMode.FAST];
  };

  if (
    project.generationStatus !== GenerationStatus.RUNNING &&
    project.generationStatus !== GenerationStatus.SUBMITTED
  ) {
    return {
      projectId,
      generationStatus: project.generationStatus as GenerationStatus,
      generationError: project.generationError ?? undefined,
      generationCompletedAt: project.generationCompletedAt ?? undefined,
    };
  }

  const startedAt = project.generationStartedAt
    ? new Date(project.generationStartedAt).getTime()
    : (project.$createdAt ? new Date(project.$createdAt).getTime() : 0);
  const jobId = project.generationJobId;
  if (!jobId) {
    if (project.generationStatus === GenerationStatus.SUBMITTED && startedAt && Date.now() - startedAt > JOB_TIMEOUT_MS) {
      logg.warn("job missing or stale SUBMITTED, failing", { jobId });
      const tablesDB0 = getTablesDB();
      await tablesDB0.updateRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.projects,
        rowId: projectId,
        data: {
          generationStatus: GenerationStatus.FAILED,
          generationError: "Generation failed to start — no job was created",
          generationCompletedAt: nowISO(),
        },
      });
      try { await refundCredits(project.brandId, refundCost()); } catch {}
      return { projectId, generationStatus: GenerationStatus.FAILED, generationError: "Generation failed to start — no job was created" };
    }
    return { projectId, generationStatus: project.generationStatus as GenerationStatus };
  }
  if (startedAt && Date.now() - startedAt > JOB_TIMEOUT_MS) {
    logg.warn("job timed out", { jobId });
    const tablesDB = getTablesDB();
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      rowId: projectId,
      data: {
        generationStatus: GenerationStatus.FAILED,
        generationError: "Generation timed out after 15 minutes",
        generationCompletedAt: nowISO(),
      },
    });
    try { await refundCredits(project.brandId, refundCost()); } catch {}
    return {
      projectId,
      generationStatus: GenerationStatus.FAILED,
      generationError: "Generation timed out after 15 minutes",
    };
  }

  let pollResult;
  try {
    pollResult = await withFailover((config) => pollJob(config, jobId));
  } catch (e) {
    if (e instanceof Hy3dExpiredError) {
      logg.warn("job expired on Modal", { jobId });
      const tablesDB = getTablesDB();
      await tablesDB.updateRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.projects,
        rowId: projectId,
        data: {
          generationStatus: GenerationStatus.FAILED,
          generationError: "Generation results expired on Modal (7-day retention exceeded)",
          generationCompletedAt: nowISO(),
        },
      });
      try { await refundCredits(project.brandId, refundCost()); } catch {}
      return {
        projectId,
        generationStatus: GenerationStatus.FAILED,
        generationError: "Generation results expired",
      };
    }
    if (e instanceof Hy3dTransientError) {
      logg.debug("transient poll error, will retry", { error: (e as Error).message });
      return { projectId, generationStatus: GenerationStatus.RUNNING };
    }
    throw e;
  }

  if (pollResult.status === "running") {
    return { projectId, generationStatus: GenerationStatus.RUNNING };
  }

  if (pollResult.status === "failed") {
    logg.error("Modal job failed", { jobId, error: pollResult.error });
    const tablesDB = getTablesDB();
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      rowId: projectId,
      data: {
        generationStatus: GenerationStatus.FAILED,
        generationError: pollResult.error.slice(0, 2000),
        generationCompletedAt: nowISO(),
      },
    });
    try { await refundCredits(project.brandId, refundCost()); } catch {}
    return {
      projectId,
      generationStatus: GenerationStatus.FAILED,
      generationError: pollResult.error,
    };
  }

  // ─── Success: finalize ───
  logg.info("Modal job succeeded, finalizing", { runId: pollResult.run_id });

  const tablesDB = getTablesDB();

  // Claim via RUNNING|SUBMITTED → FINALIZING guard (withFailover may succeed before status flips to RUNNING)
  let claimed = false;
  for (const claimStatus of [GenerationStatus.RUNNING, GenerationStatus.SUBMITTED] as const) {
    const updated = await tablesDB.updateRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      queries: [
        Query.equal("$id", projectId),
        Query.equal("generationStatus", claimStatus),
        Query.equal("generationJobId", jobId),
      ],
      data: { generationStatus: GenerationStatus.FINALIZING },
    });
    if (updated.rows.length > 0) { claimed = true; break; }
  }
  if (!claimed) {
    const fresh = await getRowSafe<ProjectsRow>(TABLES.projects, projectId);
    logg.debug("already finalizing or terminal, skipping", { status: fresh?.generationStatus });
    return {
      projectId,
      generationStatus: (fresh?.generationStatus as GenerationStatus) ?? GenerationStatus.RUNNING,
    };
  }

  // Download GLB
  const glbPath = findGlbPath(pollResult.files);
  if (!glbPath) {
    logg.error("no textured GLB in job output", { files: pollResult.files });
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      rowId: projectId,
      data: {
        generationStatus: GenerationStatus.FAILED,
        generationError: "No textured GLB in job output",
        generationCompletedAt: nowISO(),
      },
    });
    try { await refundCredits(project.brandId, refundCost()); } catch {}
    return {
      projectId,
      generationStatus: GenerationStatus.FAILED,
      generationError: "No textured GLB in job output",
    };
  }

  let glbBytes: Uint8Array;
  try {
    glbBytes = await withFailover((config) =>
      downloadArtifact(config, pollResult.run_id, glbPath),
    );
  } catch (e) {
    logg.error("GLB download failed", { error: (e as Error).message });
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      rowId: projectId,
      data: {
        generationStatus: GenerationStatus.FAILED,
        generationError: `GLB download failed: ${(e as Error).message}`,
        generationCompletedAt: nowISO(),
      },
    });
    try { await refundCredits(project.brandId, refundCost()); } catch {}
    return {
      projectId,
      generationStatus: GenerationStatus.FAILED,
      generationError: `GLB download failed: ${(e as Error).message}`,
    };
  }

  // Upload to storage
  const assetId = ID.unique();
  let uploaded = false;
  try {
    const storage = new Storage(createAdminClient());
    await storage.createFile({
      bucketId: BUCKETS.projectAsset,
      fileId: assetId,
      file: new File([Buffer.from(glbBytes)], `${assetId}.glb`, { type: "model/gltf-binary" }),
      permissions: ["read:any"],
    });
    uploaded = true;
    await storage.updateFile({
      bucketId: BUCKETS.projectAsset,
      fileId: assetId,
      permissions: [Permission.read(AppwriteRole.any())],
    });
  } catch (e) {
    logg.error("storage upload failed", { error: (e as Error).message });
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      rowId: projectId,
      data: {
        generationStatus: GenerationStatus.FAILED,
        generationError: `Storage upload failed: ${(e as Error).message}`,
        generationCompletedAt: nowISO(),
      },
    });
    try { await refundCredits(project.brandId, refundCost()); } catch {}
    return {
      projectId,
      generationStatus: GenerationStatus.FAILED,
      generationError: `Storage upload failed: ${(e as Error).message}`,
    };
  }

  // Create asset row — must match AssetsRow contract so publish/reconcile/proxy can find it
  try {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.assets,
      rowId: assetId,
      data: {
        projectId,
        ownerId: project.brandId,
        type: AssetType.MODEL_GLB,
        status: AssetStatus.READY,
        provider: "appwrite",
        fileId: assetId,
        url: buildFileUrl(BUCKETS.projectAsset, assetId),
        originalName: `${assetId}.glb`,
        mimeType: "model/gltf-binary",
        size: glbBytes.byteLength,
        checksum: null,
      },
    });
  } catch (e) {
    logg.error("asset row creation failed, cleaning up storage file", { assetId, error: (e as Error).message });
    if (uploaded) {
      try { await new Storage(createAdminClient()).deleteFile({ bucketId: BUCKETS.projectAsset, fileId: assetId }); } catch {}
    }
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      rowId: projectId,
      data: {
        generationStatus: GenerationStatus.FAILED,
        generationError: `Asset row creation failed: ${(e as Error).message}`,
        generationCompletedAt: nowISO(),
      },
    });
    try { await refundCredits(project.brandId, refundCost()); } catch {}
    return { projectId, generationStatus: GenerationStatus.FAILED, generationError: `Asset row creation failed: ${(e as Error).message}` };
  }

  // Link to project — SYSTEM_ACTOR completes the project so the brand can publish (brand chose this per §8 #2)
  const shouldComplete = canTransition(project.status as ProjectStatus, ProjectStatus.COMPLETED, SYSTEM_ACTOR);
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.projects,
    rowId: projectId,
    data: {
      generationStatus: GenerationStatus.SUCCEEDED,
      generationRunId: pollResult.run_id,
      generationAssetId: assetId,
      generationCompletedAt: nowISO(),
      ...(shouldComplete ? { status: ProjectStatus.COMPLETED } : {}),
      updatedAt: nowISO(),
    },
  });

  logg.info("generation finalized", { assetId, elapsed: pollResult.elapsed_s, autoCompleted: shouldComplete });

  return {
    projectId,
    generationStatus: GenerationStatus.SUCCEEDED,
    generationCompletedAt: nowISO(),
  };
}

// ──────────────────────────── Regenerate (brand) ─────────────────────────

export interface RegenerateParams {
  projectId: string;
  brandId: string;
  skipOwnershipCheck?: boolean;
}

export async function regenerateFastGeneration(params: RegenerateParams) {
  const { projectId, brandId, skipOwnershipCheck } = params;
  const logg = log.child({ projectId, brandId });

  const project = await getRowSafe<ProjectsRow>(TABLES.projects, projectId);
  if (!project) throw new NotFoundError("Project not found");
  if (!skipOwnershipCheck && project.brandId !== brandId) throw new NotFoundError("Project not found");
  if (project.generationMode !== GenerationMode.FAST) {
    throw new ValidationError("This project is not in AI Draft mode");
  }

  const regenerableStates = [ProjectStatus.PENDING, ProjectStatus.COMPLETED];
  if (!regenerableStates.includes(project.status as "PENDING" | "COMPLETED")) {
    throw new ValidationError("Project is not in a regenerable state");
  }
  const genTerminal = [GenerationStatus.SUCCEEDED, GenerationStatus.FAILED];
  if (!genTerminal.includes(project.generationStatus as "SUCCEEDED" | "FAILED")) {
    throw new ValidationError("Generation is not in a regenerable state");
  }

  const tablesDB = getTablesDB();

  let submission: Awaited<ReturnType<typeof import("@/server/hunyuan/manifest").buildSubmission>>;
  try {
    let viewsJson: Record<string, string>;
    try {
      viewsJson = project.generationViews ? (JSON.parse(project.generationViews as string) as Record<string, string>) : {};
    } catch {
      throw new ValidationError("Stored generation views are corrupt — please create a new task");
    }
    const viewBytes = await normalizeAllViews(viewsJson);

    const views = Array.from(viewBytes.entries())
      .sort(([a], [b]) => {
        const order = ["front", "left", "back", "right"];
        return order.indexOf(a) - order.indexOf(b);
      })
      .map(([tag, bytes]) => ({ tag: tag as ReferenceView, bytes }));

    const { buildSubmission } = await import("@/server/hunyuan/manifest");
    submission = buildSubmission(views);
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logg.error("regeneration normalization failed", { error: err.message });
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      rowId: projectId,
      data: {
        generationStatus: GenerationStatus.FAILED,
        generationError: err.message.slice(0, 2000),
        generationCompletedAt: nowISO(),
      },
    });
    throw e;
  }

  logg.info("submitting regeneration", { mode: submission.mode });

  let jobId: string;
  try {
    const result = await withFailover((config) =>
      submitJob(config, {
        mode: submission.mode,
        files: submission.files,
        manifest: submission.manifest,
        options: { quality: GENERATION_QUALITY, remove_bg: true },
      }),
    );
    jobId = result.job_id;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    logg.error("regeneration submission failed", { error: err.message });
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      rowId: projectId,
      data: {
        generationStatus: GenerationStatus.FAILED,
        generationError: err.message,
      },
    });
    throw e;
  }

  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.projects,
    rowId: projectId,
    data: {
      generationStatus: GenerationStatus.RUNNING,
      generationJobId: jobId,
      generationRunId: null,
      generationAssetId: null,
      generationError: null,
      generationStartedAt: nowISO(),
      generationCompletedAt: null,
      generationCreditCost: String(GENERATION_COSTS.REGENERATE),
    },
  });

  logg.info("regeneration started", { jobId });
  return { jobId, mode: submission.mode };
}

// ──────────────────────────── Cron sweep ─────────────────────────────────

export async function finalizeStaleGenerations(): Promise<{
  scanned: number;
  finalized: number;
  failed: number;
}> {
  const logg = log.child({ task: "cron-sweep" });

  const tablesDB = getTablesDB();
  const { rows: projects } = await tablesDB.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.projects,
    queries: [
      Query.or([
        Query.equal("generationStatus", GenerationStatus.RUNNING),
        Query.equal("generationStatus", GenerationStatus.SUBMITTED),
      ]),
    ],
  });

  logg.info("sweep found projects", { count: projects.length });

  let finalized = 0;
  let failed = 0;

  for (const project of projects) {
    try {
      const result = await pollAndFinalize(project.$id);
      if (result.generationStatus === GenerationStatus.SUCCEEDED) finalized++;
      if (result.generationStatus === GenerationStatus.FAILED) failed++;
    } catch (e) {
      logg.error("sweep failed for project", {
        projectId: project.$id,
        error: (e as Error).message,
      });
      failed++;
    }
  }

  logg.info("sweep complete", { scanned: projects.length, finalized, failed });
  return { scanned: projects.length, finalized, failed };
}