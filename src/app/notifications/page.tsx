import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  let jobs: { id: string; product: string; date: string; completed: string; status: string }[] = [];

  try {
    const session = await auth();
    if (session?.user?.id) {
      const projects = await prisma.project.findMany({
        where: { brandId: session.user.id },
        orderBy: { createdAt: "desc" },
      });

      const STATUS_MAP: Record<string, string> = {
        PENDING: "Queued",
        IN_PROGRESS: "Processing",
        REVIEW: "Processing",
        PUBLISHED: "Completed",
      };

      jobs = projects.map((p) => {
        const status = STATUS_MAP[p.status] || "Queued";
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
          completed: status === "Completed" ? createdDate : "-",
          status,
        };
      });
    }
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
  }

  return <NotificationsClient initialJobs={jobs} />;
}
