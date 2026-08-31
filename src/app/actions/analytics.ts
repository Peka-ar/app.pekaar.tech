"use server";

import { getProjectLivenessService, ProjectLiveness } from "@/server/services/analytics.service";

export async function getProjectLiveness(projectIds: string[]): Promise<ProjectLiveness> {
  return getProjectLivenessService(projectIds);
}
