"use server";

import { revalidatePath } from "next/cache";
import { TaskJob } from "@/lib/project-augment";
import { ActionResult, toActionResult } from "@/server/http/result";
import {
  getAllTasksService,
  adminSubmitProjectService,
} from "@/server/services/project.service";
import {
  regenerateFastGeneration,
} from "@/server/services/generation.service";
import { requirePrincipal, Role } from "@/server/auth-guards";

export async function getAllTasks(): Promise<TaskJob[]> {
  return getAllTasksService();
}

export async function adminSubmitProject(
  projectId: string,
  glbAssetId: string,
  usdzAssetId?: string,
): Promise<ActionResult<{ success: true }>> {
  const result = await toActionResult(() => adminSubmitProjectService(projectId, glbAssetId, usdzAssetId));
  if (result.ok) {
    revalidatePath("/tasks");
    revalidatePath("/admin/tasks");
  }
  return result;
}

export async function adminRegenerateGeneration(
  projectId: string,
): Promise<ActionResult<{ success: true }>> {
  return toActionResult(async () => {
    const principal = await requirePrincipal({ roles: [Role.ADMIN] });
    await regenerateFastGeneration({
      projectId,
      brandId: principal.userId,
      skipOwnershipCheck: true,
    });
    revalidatePath("/tasks");
    revalidatePath("/admin/tasks");
    return { success: true } as const;
  });
}
