import { ID, Query } from "node-appwrite";
import { ReferenceView, GenerationMode, GenerationStatus, ProjectStatus } from "@/lib/enums";
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
  if (!asset || asset.status !== "ready") {
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
    return new Uint8Array(buf);
  } catch {
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
}

export async function startFastGeneration(params: StartFastGenerationParams) {
  const { projectId, brandId, viewTagToAssetId } = params;
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
    },
  });

  logg.info("normalizing images");
  const viewBytes = await normalizeAllViews(viewTagToAssetId);

  const views = Array.from(viewBytes.entries())
    .sort(([a], [b]) => {
      const order = ["front", "left", "back", "right"];
      return order.indexOf(a) - order.indexOf(b);
    })
    .map(([tag, bytes]) => ({ tag: tag as ReferenceView, bytes }));

  const { buildSubmission } = await import("@/server/hunyuan/manifest");
  const submission = buildSubmission(views);

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

  const jobId = project.generationJobId;
  if (!jobId) {
    return { projectId, generationStatus: project.generationStatus as GenerationStatus };
  }

  const startedAt = project.generationStartedAt ? new Date(project.generationStartedAt).getTime() : 0;
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
    return {
      projectId,
      generationStatus: GenerationStatus.FAILED,
      generationError: pollResult.error,
    };
  }

  // ─── Success: finalize ───
  logg.info("Modal job succeeded, finalizing", { runId: pollResult.run_id });

  const tablesDB = getTablesDB();

  // Claim via RUNNING→FINALIZING guard
  const updated = await tablesDB.updateRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.projects,
    queries: [
      Query.equal("$id", projectId),
      Query.equal("generationStatus", GenerationStatus.RUNNING),
      Query.equal("generationJobId", jobId),
    ],
    data: { generationStatus: GenerationStatus.FINALIZING },
  });
  if (updated.rows.length === 0) {
    logg.debug("already finalizing or terminal, skipping");
    return {
      projectId,
      generationStatus: (updated.rows[0]?.generationStatus as GenerationStatus) ?? GenerationStatus.RUNNING,
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
    return {
      projectId,
      generationStatus: GenerationStatus.FAILED,
      generationError: `GLB download failed: ${(e as Error).message}`,
    };
  }

  // Upload to storage
  const assetId = ID.unique();
  try {
    const storage = new Storage(createAdminClient());
    await storage.createFile({
      bucketId: BUCKETS.projectAsset,
      fileId: assetId,
      file: new File([Buffer.from(glbBytes)], `${assetId}.glb`, { type: "model/gltf-binary" }),
      permissions: ["read:any"],
    });
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
    return {
      projectId,
      generationStatus: GenerationStatus.FAILED,
      generationError: `Storage upload failed: ${(e as Error).message}`,
    };
  }

  // Create asset row
  await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.assets,
    rowId: assetId,
    data: {
      projectId,
      brandId: project.brandId,
      type: "model_3d",
      status: "ready",
      url: buildFileUrl(BUCKETS.projectAsset, assetId),
      thumbnailUrl: buildFileUrl(BUCKETS.projectAsset, assetId),
      metadata: JSON.stringify({
        runId: pollResult.run_id,
        elapsed: pollResult.elapsed_s,
        glbPath,
      }),
      createdAt: nowISO(),
    },
  });

  // Link to project
  await tablesDB.updateRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.projects,
    rowId: projectId,
    data: {
      generationStatus: GenerationStatus.SUCCEEDED,
      generationAssetId: assetId,
      generationCompletedAt: nowISO(),
      updatedAt: nowISO(),
    },
  });

  // Reconcile publish permissions
  const { reconcileStoragePermissions } = await import("@/server/services/maintenance.service");
  await reconcileStoragePermissions();

  logg.info("generation finalized", { assetId, elapsed: pollResult.elapsed_s });

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

  const viewsJson = project.generationViews ? JSON.parse(project.generationViews as string) : {};
  const viewBytes = await normalizeAllViews(viewsJson);

  const views = Array.from(viewBytes.entries())
    .sort(([a], [b]) => {
      const order = ["front", "left", "back", "right"];
      return order.indexOf(a) - order.indexOf(b);
    })
    .map(([tag, bytes]) => ({ tag: tag as ReferenceView, bytes }));

  const { buildSubmission } = await import("@/server/hunyuan/manifest");
  const submission = buildSubmission(views);

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