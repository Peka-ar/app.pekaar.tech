import { prisma } from "@/lib/prisma";
import { requirePrincipal } from "@/lib/auth-guards";
import { ProjectStatus } from "@/generated/prisma/client";

export interface NotificationProject {
  id: string;
  name: string;
  status: ProjectStatus;
  createdAt: Date;
}

export async function getRecentProjectActivity(): Promise<NotificationProject[]> {
  const principal = await requirePrincipal();
  return prisma.project.findMany({
    where: { brandId: principal.userId },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, name: true, status: true, createdAt: true },
  });
}
