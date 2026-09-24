"use server";

import { revalidatePath } from "next/cache";
import { TaskJob } from "@/lib/project-augment";
import { ActionResult, toActionResult } from "@/server/http/result";
import {
  createProjectService,
  brandPublishProjectService,
  brandSendForRevisionsService,
  deletePendingProjectService,
  getUserProjectsService,
  listAppwriteModelAssetsForProject,
  updateProjectDimensionsService,
} from "@/server/services/project.service";
import {
  pollAndFinalize,
  regenerateFastGeneration,
  GENERATION_COSTS,
  refundCredits,
} from "@/server/services/generation.service";
import { setFilePublicWithRetry } from "@/server/storage";
import { requirePrincipal, Role } from "@/server/auth-guards";
import { getRowSafe, getTablesDB, DB, type UsersRow, type ProjectsRow } from "@/server/db/client";
import { QuotaExceededError, NotFoundError } from "@/server/http/errors";
import { GenerationMode, GenerationStatus } from "@/lib/enums";
import { Query } from "node-appwrite";
import { logger } from "@/server/logging";
import { enforceRateLimit } from "@/server/http/rate-limit";

export async function createProject(
  name: string,
  assetIds: string[],
  sku?: string,
  instructions?: string,
  dimensions?: Record<string, unknown> | null,
  generationMode?: "PREMIUM" | "FAST",
  generationViews?: Record<string, string> | null,
): Promise<ActionResult<{ projectId: string; remaining: number }>> {
  const result = await toActionResult(() =>
    createProjectService(name, assetIds, sku, instructions, dimensions, generationMode, generationViews),
  );
  if (result.ok) {
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    revalidatePath("/admin/tasks");
  }
  return result;
}

export async function brandPublishProject(projectId: string): Promise<ActionResult<{ success: true }>> {
  const result = await toActionResult(() => brandPublishProjectService(projectId));
  if (result.ok) {
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    revalidatePath(`/embed/${projectId}`);
    revalidatePath("/admin/tasks");
  }
  return result;
}

export async function brandSendForRevisions(
  projectId: string,
  note: string,
): Promise<ActionResult<{ success: true }>> {
  return toActionResult(async () => {
    const { wasPublished } = await brandSendForRevisionsService(projectId, note);
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    revalidatePath("/admin/tasks");
    if (wasPublished) {
      const modelAssets = await listAppwriteModelAssetsForProject(projectId);
      await Promise.allSettled(modelAssets.map((a) => setFilePublicWithRetry(a, false)));
      revalidatePath(`/embed/${projectId}`);
    }
    return { success: true };
  });
}

export async function pollGeneration(
  projectId: string,
): Promise<ActionResult<{ generationStatus: string; generationError?: string; generationCompletedAt?: string }>> {
  return toActionResult(async () => {
    const principal = await requirePrincipal();
    // Ownership: brands may only poll their own projects (admins: any).
    // 404 (not 403) to avoid project-id enumeration — same as the API route.
    const project = await getRowSafe<ProjectsRow>(DB.projects, projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (principal.role !== Role.ADMIN && project.brandId !== principal.userId) {
      throw new NotFoundError("Project not found");
    }
    // 30 polls/min per principal — shared by the Check Status button and the
    // on-load auto-poll batch (which counts as a single call).
    await enforceRateLimit(`poll-gen:${principal.userId}`, { limit: 30, windowSeconds: 60 });
    return pollAndFinalize(projectId);
  });
}

/**
 * Auto-poll on /tasks mount: polls every non-terminal FAST generation the
 * principal can see (brand: own projects; admin: latest 10) in one round trip,
 * so the page refreshes into fresh statuses without a manual Check Status click.
 * Server-side scoping means ownership holds by construction — no client ids.
 * Returns polled=0 when nothing is active (client then skips the refresh).
 */
export async function pollActiveGenerations(): Promise<ActionResult<{ polled: number }>> {
  return toActionResult(async () => {
    const principal = await requirePrincipal();
    await enforceRateLimit(`poll-gen:${principal.userId}`, { limit: 30, windowSeconds: 60 });

    const ACTIVE = [
      GenerationStatus.SUBMITTED,
      GenerationStatus.RUNNING,
      GenerationStatus.FINALIZING,
    ] as const;
    const queries = [
      ...(principal.role === Role.ADMIN ? [] : [Query.equal("brandId", principal.userId)]),
      Query.equal("generationMode", GenerationMode.FAST),
      Query.equal("generationStatus", [...ACTIVE]),
      Query.orderDesc("$createdAt"),
      Query.limit(principal.role === Role.ADMIN ? 10 : 25),
    ];
    const { rows } = await getTablesDB().listRows<ProjectsRow>({
      databaseId: DB.databaseId,
      tableId: DB.projects,
      queries,
    });
    if (rows.length === 0) return { polled: 0 };

    // Claim guards + stale-claim re-claims make overlapping polls idempotent.
    const results = await Promise.allSettled(rows.map((r) => pollAndFinalize(r.$id)));
    const rejected = results.filter((r) => r.status === "rejected");
    if (rejected.length > 0) {
      logger.warn("pollActiveGenerations: some polls failed", {
        count: rejected.length,
        errors: rejected.map((r) => (r.status === "rejected" ? (r.reason instanceof Error ? r.reason.message : String(r.reason)) : "")),
      });
    }
    // polled = completed polls — a fully-failed batch returns 0 so the client
    // skips the pointless refresh.
    return { polled: results.length - rejected.length };
  });
}

export async function regenerateGeneration(
  projectId: string,
): Promise<ActionResult<{ success: true }>> {
  return toActionResult(async () => {
    const principal = await requirePrincipal({ roles: [Role.BRAND, Role.ADMIN] });
    // 6 regenerations/hour per user — prevents spamming GPU time.
    await enforceRateLimit(`regenerate:${principal.userId}`, { limit: 6, windowSeconds: 3600 });

    // Ownership BEFORE any credit deduction (404, not 403 — no enumeration).
    const project = await getRowSafe<ProjectsRow>(DB.projects, projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (principal.role !== Role.ADMIN && project.brandId !== principal.userId) {
      throw new NotFoundError("Project not found");
    }

    const cost = GENERATION_COSTS.REGENERATE;

    const user = await getRowSafe<UsersRow>(DB.users, principal.userId);
    if (!user || (user.usageLimits ?? 0) < cost) {
      throw new QuotaExceededError(
        `Not enough credits. Regeneration requires ${cost} credit${cost > 1 ? "s" : ""}. Visit /pricing to upgrade.`,
      );
    }

    // Deduct credit atomically before calling the service. Retry transient
    // failures — never fall back to read-modify-write (lost-update risk).
    const { getTablesDB } = await import("@/server/db/client");
    const { APPWRITE_DATABASE_ID } = await import("@/lib/appwrite-config");
    const tablesDB = getTablesDB();
    let deducted = false;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 3 && !deducted; attempt++) {
      try {
        await tablesDB.decrementRowColumn({
          databaseId: APPWRITE_DATABASE_ID,
          tableId: DB.users,
          rowId: principal.userId,
          column: "usageLimits",
          value: cost,
          min: 0,
        });
        deducted = true;
      } catch (e) {
        lastError = e;
        const msg = e instanceof Error ? e.message : String(e);
        if (/quota|insufficient|remaining|limit/i.test(msg)) {
          throw new QuotaExceededError(
            `Not enough credits. Regeneration requires ${cost} credit${cost > 1 ? "s" : ""}. Visit /pricing to upgrade.`,
          );
        }
        await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
      }
    }
    if (!deducted) {
      // Fail the action — no charge, no fallback. The user can retry.
      logger.error("regenerate credit deduction failed after retries", {
        userId: principal.userId,
        err: lastError instanceof Error ? lastError.message : String(lastError),
      });
      throw new QuotaExceededError("Could not verify credits. Please try again.");
    }

    try {
      await regenerateFastGeneration({
        projectId,
        brandId: principal.userId,
        // Ownership pre-verified above; admins act on other brands' projects.
        skipOwnershipCheck: principal.role === Role.ADMIN,
      });
    } catch (e) {
      // Refund credit on failure — logged, never throws
      try {
        await refundCredits(principal.userId, cost);
      } catch (refundErr) {
        logger.error("regenerate refund failed", {
          userId: principal.userId,
          amount: cost,
          err: refundErr instanceof Error ? refundErr.message : String(refundErr),
        });
      }
      throw e;
    }

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    revalidatePath("/admin/tasks");
    return { success: true };
  });
}

export async function deletePendingProject(projectId: string): Promise<ActionResult<{ success: true }>> {
  const result = await toActionResult(() => deletePendingProjectService(projectId));
  if (result.ok) {
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    revalidatePath("/admin/tasks");
  }
  return result;
}

export async function getUserProjects(): Promise<TaskJob[]> {
  return getUserProjectsService();
}

export async function updateProjectDimensions(
  projectId: string,
  dimensions: { width: number; height: number; depth: number; unit?: string },
): Promise<ActionResult<{ success: true }>> {
  const result = await toActionResult(() => updateProjectDimensionsService(projectId, dimensions));
  if (result.ok) {
    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    revalidatePath("/admin/tasks");
  }
  return result;
}
