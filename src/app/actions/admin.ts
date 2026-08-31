"use server";

import { revalidatePath } from "next/cache";
import { TaskJob } from "@/lib/project-augment";
import { ActionResult, toActionResult } from "@/server/http/result";
import {
  getAllTasksService,
  adminSubmitProjectService,
} from "@/server/services/project.service";

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
