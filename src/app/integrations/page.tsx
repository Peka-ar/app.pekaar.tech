import { requirePrincipalOrRedirect } from "@/server/auth-guards";
import { generateEmbedCode } from "@/lib/utils";
import { Query } from "node-appwrite";
import { DB, getRowSafe, listAllRows, ProjectStatus, ProjectsRow, UsersRow } from "@/server/db/client";
import IntegrationsClient from "./IntegrationsClient";

interface IntegrationProject {
  id: string;
  name: string;
  embedCode: string;
}

export default async function IntegrationsPage() {
  const principal = await requirePrincipalOrRedirect();
  let projects: IntegrationProject[] = [];
  let storefrontPlatform: string | null = null;

  try {
    const [userRow, published] = await Promise.all([
      getRowSafe<UsersRow>(DB.users, principal.userId),
      listAllRows<ProjectsRow>(DB.projects, [
        Query.equal("brandId", principal.userId),
        Query.equal("status", ProjectStatus.PUBLISHED),
        Query.orderDesc("$createdAt"),
      ]),
    ]);

    storefrontPlatform = userRow?.storefrontPlatform ?? null;

    projects = published.map((project) => ({
      id: project.$id,
      name: project.name,
      embedCode: generateEmbedCode(project.$id).iframe,
    }));
  } catch (error) {
    console.error("Failed to fetch integration data:", error);
  }

  return <IntegrationsClient projects={projects} storefrontPlatform={storefrontPlatform} />;
}
