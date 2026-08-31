"use server";

import { Query } from "node-appwrite";
import { requirePrincipal } from "@/lib/auth-guards";
import { DB, getTablesDB, AnalyticsEventRow } from "@/lib/db";

export type ProjectLiveness = Record<string, { lastEventAt: Date | null }>;

export async function getProjectLiveness(projectIds: string[]): Promise<ProjectLiveness> {
  const principal = await requirePrincipal();

  if (projectIds.length === 0) return {};

  const tablesDB = getTablesDB();
  const map: ProjectLiveness = {};
  for (const id of projectIds) map[id] = { lastEventAt: null };

  await Promise.all(
    projectIds.map(async (id) => {
      const queries = [Query.equal("projectId", id), Query.orderDesc("$createdAt"), Query.limit(1)];
      if (principal.role !== "ADMIN") {
        queries.splice(1, 0, Query.equal("brandId", principal.userId));
      }
      const result = await tablesDB.listRows<AnalyticsEventRow>({
        databaseId: DB.databaseId,
        tableId: DB.analyticsEvents,
        queries,
        total: false,
      });
      if (result.rows.length > 0) {
        map[id] = { lastEventAt: new Date(result.rows[0].$createdAt) };
      }
    }),
  );

  return map;
}