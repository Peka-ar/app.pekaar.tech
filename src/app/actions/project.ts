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
} from "@/server/services/project.service";
import { setFilePublicWithRetry } from "@/server/storage";

export async function createProject(
  name: string,
  assetIds: string[],
  sku?: string,
  instructions?: string,
  dimensions?: Record<string, unknown> | null,
): Promise<ActionResult<{ projectId: string; remaining: number }>> {
  const result = await toActionResult(() => createProjectService(name, assetIds, sku, instructions, dimensions));
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

export async function getUserProjects(): Promise<TaskJob[]> {
  return getUserProjectsService();
}
