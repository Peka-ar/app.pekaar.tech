"use server";

import { revalidatePath } from "next/cache";
import { TaskJob } from "@/lib/project-augment";
import { ActionResult, toActionResult } from "@/server/http/result";
import {
  createProjectService,
  brandPublishProjectService,
  brandSendForRevisionsService,
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
import { getRowSafe, DB, type UsersRow } from "@/server/db/client";
import { QuotaExceededError } from "@/server/http/errors";

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
  const result = await toActionResult(() => pollAndFinalize(projectId));
  if (result.ok) {
    revalidatePath("/tasks");
    revalidatePath("/admin/tasks");
  }
  return result;
}

export async function regenerateGeneration(
  projectId: string,
): Promise<ActionResult<{ success: true }>> {
  return toActionResult(async () => {
    const principal = await requirePrincipal({ roles: [Role.BRAND, Role.ADMIN] });
    const cost = GENERATION_COSTS.REGENERATE;

    const user = await getRowSafe<UsersRow>(DB.users, principal.userId);
    if (!user || (user.usageLimits ?? 0) < cost) {
      throw new QuotaExceededError(
        `Not enough credits. Regeneration requires ${cost} credit${cost > 1 ? "s" : ""}. Visit /pricing to upgrade.`,
      );
    }

    // Deduct credit atomically before calling the service
    const { getTablesDB } = await import("@/server/db/client");
    const { APPWRITE_DATABASE_ID } = await import("@/lib/appwrite-config");
    const tablesDB = getTablesDB();
    try {
      await tablesDB.decrementRowColumn({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: DB.users,
        rowId: principal.userId,
        column: "usageLimits",
        value: cost,
        min: 0,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/quota|insufficient|remaining|limit/i.test(msg)) {
        throw new QuotaExceededError(
          `Not enough credits. Regeneration requires ${cost} credit${cost > 1 ? "s" : ""}. Visit /pricing to upgrade.`,
        );
      }
      // Fallback — verify balance and do read-modify-write
      const fresh = await getRowSafe<UsersRow>(DB.users, principal.userId);
      if (!fresh || (fresh.usageLimits ?? 0) < cost) {
        throw new QuotaExceededError(
          `Not enough credits. Regeneration requires ${cost} credit${cost > 1 ? "s" : ""}. Visit /pricing to upgrade.`,
        );
      }
      await tablesDB.updateRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: DB.users,
        rowId: principal.userId,
        data: { usageLimits: (fresh.usageLimits ?? 0) - cost },
      });
    }

    try {
      await regenerateFastGeneration({ projectId, brandId: principal.userId });
    } catch (e) {
      // Refund credit on failure
      await refundCredits(principal.userId, cost);
      throw e;
    }

    revalidatePath("/tasks");
    revalidatePath("/dashboard");
    revalidatePath("/admin/tasks");
    return { success: true };
  });
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
