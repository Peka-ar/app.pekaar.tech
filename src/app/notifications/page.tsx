import { prisma } from "@/lib/prisma";
import { requirePrincipalOrRedirect } from "@/lib/auth-guards";
import NotificationsClient from "./NotificationsClient";
import type { ProjectStatus } from "@/generated/prisma/client";

export default async function NotificationsPage() {
  const principal = await requirePrincipalOrRedirect();
  let jobs: { id: string; product: string; date: string; completed: string; status: ProjectStatus }[] = [];

  try {
    const projects = await prisma.project.findMany({
      where: { brandId: principal.userId },
      orderBy: { createdAt: "desc" },
    });

    jobs = projects.map((p) => {
      const createdDate = new Date(p.createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return {
        id: p.id.slice(0, 8).toUpperCase(),
        product: p.name,
        date: createdDate,
        completed: p.status === 'PUBLISHED' ? createdDate : "-",
        status: p.status,
      };
    });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
  }

  return <NotificationsClient initialJobs={jobs} />;
}