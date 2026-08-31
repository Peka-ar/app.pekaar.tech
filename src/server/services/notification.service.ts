import { Query } from "node-appwrite";
import { requirePrincipal } from "@/server/auth-guards";
import { DB, getTablesDB, ProjectsRow } from "@/server/db/client";

export interface NotificationProject {
  id: string;
  name: string;
  status: string;
  createdAt: string;
}

export async function getRecentProjectActivity(): Promise<NotificationProject[]> {
  const principal = await requirePrincipal();

  const result = await getTablesDB().listRows<ProjectsRow>({
    databaseId: DB.databaseId,
    tableId: DB.projects,
    queries: [
      Query.equal("brandId", principal.userId),
      Query.orderDesc("$createdAt"),
      Query.limit(10),
      Query.select(["name", "status"]),
    ],
    total: false,
  });

  return result.rows.map((p) => ({
    id: p.$id,
    name: p.name,
    status: p.status,
    createdAt: p.$createdAt,
  }));
}
