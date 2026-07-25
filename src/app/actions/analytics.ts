"use server";

import { prisma } from "@/lib/prisma";
import { requirePrincipal } from "@/lib/auth-guards";

export type ProjectLiveness = Record<string, { lastEventAt: Date | null }>;

export async function getProjectLiveness(projectIds: string[]): Promise<ProjectLiveness> {
  const principal = await requirePrincipal();

  if (projectIds.length === 0) return {};

  const where =
    principal.role === "ADMIN"
      ? { projectId: { in: projectIds } }
      : { projectId: { in: projectIds }, brandId: principal.userId };

  const rows = await prisma.analyticsEvent.groupBy({
    by: ["projectId"],
    where,
    _max: { createdAt: true },
  });

  const map: ProjectLiveness = {};
  for (const id of projectIds) map[id] = { lastEventAt: null };
  for (const row of rows) {
    map[row.projectId] = { lastEventAt: row._max.createdAt };
  }
  return map;
}
