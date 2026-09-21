import { Role, requirePrincipalOrRedirect } from "@/server/auth-guards";
import { Query } from "node-appwrite";
import { DB, listAllRows, ProjectStatus, ProjectsRow } from "@/server/db/client";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
  const principal = await requirePrincipalOrRedirect();
  let jobs: { id: string; product: string; date: string; completed: string; status: ProjectStatus }[] = [];

  try {
    const queries = [Query.orderDesc("$createdAt")];
    if (principal.role !== Role.ADMIN) {
      queries.push(Query.equal("brandId", principal.userId));
    }
    const projects = await listAllRows<ProjectsRow>(DB.projects, queries);

    jobs = projects.map((p) => {
      const createdDate = new Date(p.$createdAt).toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      return {
        id: p.$id.slice(0, 8).toUpperCase(),
        product: p.name,
        date: createdDate,
        completed: p.status === 'PUBLISHED' ? createdDate : "-",
        status: p.status as ProjectStatus,
      };
    });
  } catch (error) {
    console.error("Failed to fetch jobs:", error);
  }

  return <NotificationsClient initialJobs={jobs} />;
}