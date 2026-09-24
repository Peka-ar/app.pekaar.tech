import { ID, Query, TablesDB } from "node-appwrite";
import { AssetStatus, AssetType, ReferenceView, GenerationMode, GenerationStatus, ProjectStatus } from "@/lib/enums";
import { SYSTEM_ACTOR, canTransition } from "@/server/domain/project-state-machine";
import { createAdminClient } from "@/server/appwrite";
import { Storage, ImageFormat } from "node-appwrite";
import { getTablesDB, getRowSafe, type ProjectsRow, type AssetsRow } from "@/server/db/client";
import { logger } from "@/server/logging";
import { findGlbPath, GENERATION_QUALITY } from "@/server/hunyuan/manifest";
import {
  submitJob,
  pollJob,
  downloadArtifact,
  withFailover,
  Hy3dExpiredError,
  Hy3dTransientError,
  isSafeToResubmit,
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

// quality:"max" jobs take ~15 min wall — 15 min previously left ~14 s of margin.
const JOB_TIMEOUT_MS = 30 * 60 * 1000;
const STALE_CLAIM_MS = 10 * 60 * 1000; // FINALIZING recovery threshold

function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Is a FINALIZING row stale? null/unparseable claimedAt = pre-deploy or
 * crashed before write → stale (recoverable). Fresh claims are not.
 */
export function isStaleClaim(claimedAt?: string | null): boolean {
  if (!claimedAt) return true;
  const then = new Date(claimedAt).getTime();
  if (!Number.isFinite(then)) return true;
  return Date.now() - then > STALE_CLAIM_MS;
}

// ──────────────────────────── Credit refund ─────────────────────────────

export async function refundCredits(userId: string, amount: number): Promise<void> {
  const tablesDB = getTablesDB();
  let retries = 0;
  while (retries < 3) {
    try {
      await tablesDB.incrementRowColumn({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: TABLES.users,
        rowId: userId,
        column: "usageLimits",
        value: amount,
      });
      return;
    } catch (e) {
      retries++;
      if (retries < 3) await new Promise((r) => setTimeout(r, 250 * retries));
      else throw e;
    }
  }
}

/**
 * Logs every refund attempt; on failure logs an error but never throws.
 */
async function refundCreditsLogged(userId: string, amount: number, meta?: Record<string, unknown>): Promise<void> {
  try {
    await refundCredits(userId, amount);
    log.debug("credits refunded", { ...meta, userId, amount });
  } catch (e) {
    log.error("credit refund failed", { ...meta, userId, amount, err: e instanceof Error ? e.message : String(e) });
  }
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

// ──────────────────────────── Guarded failure ─────────────────────────────

/**
 * Builds the WHERE conditions for a guarded failure write.
 * Appwrite `Query.or` requires >= 2 conditions — a single jobId/status must
 * be pushed as a plain `equal()` or the server rejects the whole update
 * (which would silently break the failure+refund path).
 */
export function buildFailureGuardQueries(
  projectId: string,
  jobIds: string[],
  statuses: GenerationStatus[],
): string[] {
  const queries = [Query.equal("$id", projectId)];
  if (jobIds.length === 1) {
    queries.push(Query.equal("generationJobId", jobIds[0]));
  } else if (jobIds.length > 1) {
    queries.push(Query.or(jobIds.map((jid) => Query.equal("generationJobId", jid))));
  } else {
    queries.push(Query.isNull("generationJobId"));
  }
  if (statuses.length === 1) {
    queries.push(Query.equal("generationStatus", statuses[0]));
  } else {
    queries.push(Query.or(statuses.map((s) => Query.equal("generationStatus", s))));
  }
  return queries;
}

/**
 * Guards a FAILED state write: only one caller can win (via status+jobId conditions).
 * The winner logs/refunds; losers do nothing. Returns true if this call won.
 */
async function failGenerationGuarded(
  tablesDB: TablesDB,
  projectId: string,
  jobIds: string[],
  statuses: GenerationStatus[],
  data: { generationError: string; generationCompletedAt?: string },
  refundAmount: number,
  brandId: string,
  logg: ReturnType<typeof logger.child>,
): Promise<boolean> {
  const updated = await tablesDB.updateRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.projects,
    queries: buildFailureGuardQueries(projectId, jobIds, statuses),
    data: { generationStatus: GenerationStatus.FAILED, generationError: data.generationError, generationCompletedAt: data.generationCompletedAt },
  });
  if (updated.rows.length === 0) {
    logg.debug("failure-write lost the guard race (another poller already failed the project)", { projectId });
    return false; // someone else already moved it
  }
  await refundCreditsLogged(brandId, refundAmount, { projectId });
  return true;
}

/**
 * Post-claim failure guard: also checks generationClaimedAt to prevent a re-claimer
 * from stealing the claim mid-finalize and then both sides refunding.
 */
async function failPostClaimGuarded(
  tablesDB: TablesDB,
  projectId: string,
  jobId: string,
  claimedAt: string,
  data: { generationError: string; generationCompletedAt?: string },
  refundAmount: number,
  brandId: string,
  logg: ReturnType<typeof logger.child>,
): Promise<boolean> {
  const updated = await tablesDB.updateRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.projects,
    queries: [
      Query.equal("$id", projectId),
      Query.equal("generationJobId", jobId),
      Query.equal("generationStatus", GenerationStatus.FINALIZING),
      Query.equal("generationClaimedAt", claimedAt),
    ],
    data: { generationStatus: GenerationStatus.FAILED, generationError: data.generationError, generationCompletedAt: data.generationCompletedAt },
  });
  if (updated.rows.length === 0) {
    logg.debug("post-claim failure-write lost the guard race (claim stolen or already terminal)", { projectId, claimedAt });
    return false;
  }
  await refundCreditsLogged(brandId, refundAmount, { projectId });
  return true;
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
    throw new ValidationError("This project is not in AI pipeline mode");
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
    const result = await withFailover(
      (config) =>
        submitJob(config, {
          mode: submission.mode,
          files: submission.files,
          manifest: submission.manifest,
          options: { quality: GENERATION_QUALITY, remove_bg: true },
        }),
      // POST /jobs is non-idempotent: fail over only when the request provably never landed.
      { canFailover: isSafeToResubmit },
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

  // Terminal states → return early (no refunds possible here)
  if (project.generationStatus === GenerationStatus.SUCCEEDED || project.generationStatus === GenerationStatus.FAILED) {
    return {
      projectId,
      generationStatus: project.generationStatus as GenerationStatus,
      generationError: project.generationError ?? undefined,
      generationCompletedAt: project.generationCompletedAt ?? undefined,
    };
  }

  // SUBMITTED without jobId → stale check
  if (project.generationStatus === GenerationStatus.SUBMITTED && !project.generationJobId) {
    const startedAt = project.generationStartedAt ? new Date(project.generationStartedAt).getTime() : (project.$createdAt ? new Date(project.$createdAt).getTime() : 0);
    if (startedAt && Date.now() - startedAt > JOB_TIMEOUT_MS) {
      logg.warn("job missing or stale SUBMITTED, failing", { jobId: null });
      const tablesDB0 = getTablesDB();
      const won = await failGenerationGuarded(tablesDB0, projectId, [], ["SUBMITTED"], {
        generationError: "Generation failed to start — no job was created",
        generationCompletedAt: nowISO(),
      }, refundCost(), project.brandId, logg);
      if (won) return { projectId, generationStatus: GenerationStatus.FAILED, generationError: "Generation failed to start — no job was created" };
      return { projectId, generationStatus: project.generationStatus as GenerationStatus };
    }
    return { projectId, generationStatus: project.generationStatus as GenerationStatus };
  }

  // A FINALIZING (or odd-state) row with no jobId can't be polled. A stale
  // FINALIZING with no jobId is unrecoverable → fail it via status guard.
  const jobId = project.generationJobId;
  if (!jobId) {
    if (isStaleClaim(project.generationClaimedAt) && project.generationStatus === GenerationStatus.FINALIZING) {
      const tablesDB0 = getTablesDB();
      const won = await failGenerationGuarded(tablesDB0, projectId, [], ["FINALIZING"], {
        generationError: "Finalization was interrupted and no job was recorded",
        generationCompletedAt: nowISO(),
      }, refundCost(), project.brandId, logg);
      if (won) return { projectId, generationStatus: GenerationStatus.FAILED, generationError: "Finalization was interrupted" };
    }
    return { projectId, generationStatus: project.generationStatus as GenerationStatus };
  }

  // Age of the generation — used for the timeout check ONLY after Modal
  // confirms the job is still running (see the running branch below): a job
  // that succeeded late must win over the age check, never be failed+refunded.
  const startedAt = project.generationStartedAt ? new Date(project.generationStartedAt).getTime() : (project.$createdAt ? new Date(project.$createdAt).getTime() : 0);
  const isFinalizing = project.generationStatus === GenerationStatus.FINALIZING;

  let pollResult;
  try {
    pollResult = await withFailover((config) => pollJob(config, jobId));
  } catch (e) {
    if (e instanceof Hy3dExpiredError) {
      logg.warn("job expired on Modal", { jobId });
      const tablesDB = getTablesDB();
      const won = await failGenerationGuarded(tablesDB, projectId, [jobId], ["RUNNING", "SUBMITTED", "FINALIZING"], {
        generationError: "Generation results expired on Modal (7-day retention exceeded)",
        generationCompletedAt: nowISO(),
      }, refundCost(), project.brandId, logg);
      if (won) return { projectId, generationStatus: GenerationStatus.FAILED, generationError: "Generation results expired" };
      return { projectId, generationStatus: project.generationStatus as GenerationStatus };
    }
    if (e instanceof Hy3dTransientError) {
      logg.debug("transient poll error, will retry", { error: (e as Error).message });
      return { projectId, generationStatus: GenerationStatus.RUNNING };
    }
    throw e;
  }

  if (pollResult.status === "running") {
    // Hung-job timeout: still running past the 30-min budget → fail + refund.
    // Skipped for FINALIZING rows (job already succeeded once; a stale claim
    // just needs re-download — the 7-day Modal expiry resolves true lock-ups).
    if (!isFinalizing && startedAt && Date.now() - startedAt > JOB_TIMEOUT_MS) {
      logg.warn("job timed out", { jobId });
      const tablesDB = getTablesDB();
      const won = await failGenerationGuarded(tablesDB, projectId, [jobId], ["RUNNING", "SUBMITTED"], {
        generationError: "Generation timed out after 30 minutes",
        generationCompletedAt: nowISO(),
      }, refundCost(), project.brandId, logg);
      if (won) return { projectId, generationStatus: GenerationStatus.FAILED, generationError: "Generation timed out after 30 minutes" };
      return { projectId, generationStatus: project.generationStatus as GenerationStatus };
    }
    // Report the row's actual status — a stale FINALIZING re-poll that sees
    // "running" must not misreport RUNNING (the claim already happened).
    return { projectId, generationStatus: project.generationStatus as GenerationStatus };
  }

  if (pollResult.status === "failed") {
    logg.error("Modal job failed", { jobId, error: pollResult.error });
    const tablesDB = getTablesDB();
    const won = await failGenerationGuarded(tablesDB, projectId, [jobId], ["RUNNING", "SUBMITTED", "FINALIZING"], {
      generationError: pollResult.error.slice(0, 2000),
      generationCompletedAt: nowISO(),
    }, refundCost(), project.brandId, logg);
    if (won) return { projectId, generationStatus: GenerationStatus.FAILED, generationError: pollResult.error };
    return { projectId, generationStatus: project.generationStatus as GenerationStatus };
  }

  // ─── Success: finalize ───
  logg.info("Modal job succeeded, finalizing", { runId: pollResult.run_id });

  const tablesDB = getTablesDB();
  const claimedAt = nowISO();

  // Claim via RUNNING|SUBMITTED → FINALIZING, or stale FINALIZING → FINALIZING (re-claim)
  let claimed = false;
  const claimData = { generationStatus: GenerationStatus.FINALIZING, generationClaimedAt: claimedAt };
  for (const claimStatus of [GenerationStatus.RUNNING, GenerationStatus.SUBMITTED] as const) {
    const updated = await tablesDB.updateRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      queries: [Query.equal("$id", projectId), Query.equal("generationStatus", claimStatus), Query.equal("generationJobId", jobId)],
      data: claimData,
    });
    if (updated.rows.length > 0) { claimed = true; break; }
  }
  // If not claimed yet, try re-claiming a stale FINALIZING row
  if (!claimed) {
    const staleBefore = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
    const reupdate1 = await tablesDB.updateRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      queries: [Query.equal("$id", projectId), Query.equal("generationStatus", GenerationStatus.FINALIZING), Query.equal("generationJobId", jobId), Query.lessThan("generationClaimedAt", staleBefore)],
      data: { generationClaimedAt: claimedAt },
    });
    const reupdate2 = await tablesDB.updateRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.projects,
      queries: [Query.equal("$id", projectId), Query.equal("generationStatus", GenerationStatus.FINALIZING), Query.equal("generationJobId", jobId), Query.isNull("generationClaimedAt")],
      data: { generationClaimedAt: claimedAt },
    });
    if (reupdate1.rows.length > 0 || reupdate2.rows.length > 0) { claimed = true; }
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
    const won = await failPostClaimGuarded(tablesDB, projectId, jobId, claimedAt, {
      generationError: "No textured GLB in job output",
      generationCompletedAt: nowISO(),
    }, refundCost(), project.brandId, logg);
    if (won) return { projectId, generationStatus: GenerationStatus.FAILED, generationError: "No textured GLB in job output" };
    return { projectId, generationStatus: project.generationStatus as GenerationStatus };
  }

  let glbBytes: Uint8Array;
  try {
    const t0 = Date.now();
    logg.info("downloading GLB", { path: glbPath, runId: pollResult.run_id });
    glbBytes = await withFailover((config) => downloadArtifact(config, pollResult.run_id, glbPath));
    logg.info("GLB downloaded", { bytes: glbBytes.byteLength, ms: Date.now() - t0 });
  } catch (e) {
    logg.error("GLB download failed", { error: (e as Error).message });
    const won = await failPostClaimGuarded(tablesDB, projectId, jobId, claimedAt, {
      generationError: `GLB download failed: ${(e as Error).message}`,
      generationCompletedAt: nowISO(),
    }, refundCost(), project.brandId, logg);
    if (won) return { projectId, generationStatus: GenerationStatus.FAILED, generationError: `GLB download failed: ${(e as Error).message}` };
    return { projectId, generationStatus: project.generationStatus as GenerationStatus };
  }

  // Upload to storage — private at creation
  const assetId = ID.unique();
  let uploaded = false;
  try {
    const t0 = Date.now();
    logg.info("uploading GLB to storage", { assetId, bytes: glbBytes.byteLength });
    const storage = new Storage(createAdminClient());
    await storage.createFile({
      bucketId: BUCKETS.projectAsset,
      fileId: assetId,
      file: new File([Buffer.from(glbBytes)], `${assetId}.glb`, { type: "model/gltf-binary" }),
      permissions: [],
    });
    uploaded = true;
    logg.info("GLB uploaded", { assetId, ms: Date.now() - t0 });
  } catch (e) {
    logg.error("storage upload failed", { error: (e as Error).message });
    const won = await failPostClaimGuarded(tablesDB, projectId, jobId, claimedAt, {
      generationError: `Storage upload failed: ${(e as Error).message}`,
      generationCompletedAt: nowISO(),
    }, refundCost(), project.brandId, logg);
    if (won) return { projectId, generationStatus: GenerationStatus.FAILED, generationError: `Storage upload failed: ${(e as Error).message}` };
    return { projectId, generationStatus: project.generationStatus as GenerationStatus };
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
    const won = await failPostClaimGuarded(tablesDB, projectId, jobId, claimedAt, {
      generationError: `Asset row creation failed: ${(e as Error).message}`,
      generationCompletedAt: nowISO(),
    }, refundCost(), project.brandId, logg);
    if (won) return { projectId, generationStatus: GenerationStatus.FAILED, generationError: `Asset row creation failed: ${(e as Error).message}` };
    return { projectId, generationStatus: project.generationStatus as GenerationStatus };
  }

  // Link to project — SYSTEM_ACTOR completes the project so the brand can publish
  // No `updatedAt` in data: the projects table has no such column (TablesDB maintains $updatedAt itself).
  const shouldComplete = canTransition(project.status as ProjectStatus, ProjectStatus.COMPLETED, SYSTEM_ACTOR);
  try {
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
      },
    });
  } catch (e) {
    // Final link update failed — cleanup and fail-guarded
    logg.error("final link update failed", { assetId, error: (e as Error).message });
    try { await new Storage(createAdminClient()).deleteFile({ bucketId: BUCKETS.projectAsset, fileId: assetId }); } catch {}
    try { await tablesDB.deleteRow({ databaseId: APPWRITE_DATABASE_ID, tableId: TABLES.assets, rowId: assetId }); } catch {}
    const won = await failPostClaimGuarded(tablesDB, projectId, jobId, claimedAt, {
      generationError: `Finalization failed: ${(e as Error).message}`,
      generationCompletedAt: nowISO(),
    }, refundCost(), project.brandId, logg);
    if (won) return { projectId, generationStatus: GenerationStatus.FAILED, generationError: `Finalization failed: ${(e as Error).message}` };
    return { projectId, generationStatus: project.generationStatus as GenerationStatus };
  }

  // Archive prior READY model rows (GLB/USDZ) — AFTER the new model is linked.
  // Archiving earlier left a PUBLISHED project with zero READY models whenever
  // download/upload failed mid-finalize; here the new asset is already the
  // generationAssetId, so old rows can never be the project's only model.
  try {
    await tablesDB.updateRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: TABLES.assets,
      queries: [
        Query.equal("projectId", projectId),
        Query.equal("status", AssetStatus.READY),
        Query.or([Query.equal("type", AssetType.MODEL_GLB), Query.equal("type", AssetType.MODEL_USDZ)]),
        Query.notEqual("$id", assetId),
      ],
      data: { status: AssetStatus.ARCHIVED },
    });
  } catch (e) {
    logg.warn("archive-old-models failed, proceeding anyway", { err: e instanceof Error ? e.message : String(e) });
  }

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
    throw new ValidationError("This project is not in AI pipeline mode");
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
    const result = await withFailover(
      (config) =>
        submitJob(config, {
          mode: submission.mode,
          files: submission.files,
          manifest: submission.manifest,
          options: { quality: GENERATION_QUALITY, remove_bg: true },
        }),
      // POST /jobs is non-idempotent: fail over only when the request provably never landed.
      { canFailover: isSafeToResubmit },
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
  
  // RUNNING | SUBMITTED
  const { rows: runningRows } = await tablesDB.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.projects,
    queries: [Query.or([Query.equal("generationStatus", GenerationStatus.RUNNING), Query.equal("generationStatus", GenerationStatus.SUBMITTED)])],
  });

  // Stale FINALIZING — JS-filtered by claim age (fresh claims belong to an active finalizer)
  const finalizingAll = await tablesDB.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: TABLES.projects,
    queries: [Query.equal("generationStatus", GenerationStatus.FINALIZING)],
  });
  const finalizingRows = finalizingAll.rows.filter((p) =>
    isStaleClaim((p as { generationClaimedAt?: string | null }).generationClaimedAt),
  );

  const projects = [...runningRows, ...finalizingRows];
  logg.info("sweep found projects", { count: projects.length, running: runningRows.length, finalizing: finalizingRows.length });

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