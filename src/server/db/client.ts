import { Models, Query, TablesDB } from "node-appwrite";
import { createAdminClient } from "@/server/appwrite";
import { mapAppwriteError, isNotFoundError } from "@/server/db/errors";
import {
  APPWRITE_ANALYTICS_EVENTS_TABLE_ID,
  APPWRITE_ASSETS_TABLE_ID,
  APPWRITE_DATABASE_ID,
  APPWRITE_PROJECTS_TABLE_ID,
  APPWRITE_REVISION_REQUESTS_TABLE_ID,
  APPWRITE_USERS_TABLE_ID,
} from "@/lib/appwrite-config";

export {
  APPWRITE_ANALYTICS_EVENTS_TABLE_ID,
  APPWRITE_ASSETS_TABLE_ID,
  APPWRITE_DATABASE_ID,
  APPWRITE_PROJECTS_TABLE_ID,
  APPWRITE_REVISION_REQUESTS_TABLE_ID,
  APPWRITE_USERS_TABLE_ID,
} from "@/lib/appwrite-config";

export { AssetStatus, AssetType, EventType, ProjectStatus, UserStatus } from "@/lib/enums";

export type UsersRow = Models.Row & {
  userId: string;
  email: string;
  role: string;
  subscriptionTier: string | null;
  usageLimits: number | null;
  name: string | null;
  onboarded: boolean;
  productCategory: string | null;
  storefrontPlatform: string | null;
  catalogSize: string | null;
  status: string;
  suspendedAt: string | null;
  statusReason: string | null;
};

export type ProjectsRow = Models.Row & {
  name: string;
  sku: string | null;
  instructions: string | null;
  dimensions: string | null;
  status: string;
  sdkConfig: string | null;
  brandId: string;
};

export type AssetsRow = Models.Row & {
  projectId: string | null;
  ownerId: string;
  type: string;
  status: string;
  provider: string;
  fileId: string | null;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string | null;
};

export type RevisionRequestRow = Models.Row & {
  projectId: string;
  note: string;
  requestedBy: string;
};

export type AnalyticsEventRow = Models.Row & {
  eventType: string;
  sessionId: string;
  projectId: string;
  brandId: string;
};

export const DB = {
  databaseId: APPWRITE_DATABASE_ID,
  users: APPWRITE_USERS_TABLE_ID,
  projects: APPWRITE_PROJECTS_TABLE_ID,
  assets: APPWRITE_ASSETS_TABLE_ID,
  revisionRequests: APPWRITE_REVISION_REQUESTS_TABLE_ID,
  analyticsEvents: APPWRITE_ANALYTICS_EVENTS_TABLE_ID,
} as const;

const globalForDb = globalThis as unknown as { tablesDB?: TablesDB };

export function getTablesDB(): TablesDB {
  if (!globalForDb.tablesDB) {
    globalForDb.tablesDB = new TablesDB(createAdminClient());
  }
  return globalForDb.tablesDB;
}

export async function getRowSafe<Row extends Models.Row>(
  tableId: string,
  rowId: string,
  transactionId?: string,
): Promise<Row | null> {
  try {
    return await getTablesDB().getRow<Row>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId,
      rowId,
      transactionId,
    });
  } catch (err) {
    if (isNotFoundError(err)) return null;
    // Fail loud: outages, rate limits, and 5xx must not masquerade as "not found".
    throw mapAppwriteError(err);
  }
}

export async function listAllRows<Row extends Models.Row>(
  tableId: string,
  queries: string[] = [],
  limit = 100,
): Promise<Row[]> {
  const tablesDB = getTablesDB();
  const rows: Row[] = [];
  let offset = 0;
  while (true) {
    const page = await tablesDB.listRows<Row>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId,
      queries: [...queries, Query.limit(limit), Query.offset(offset)],
      total: false,
    });
    rows.push(...page.rows);
    if (page.rows.length < limit) break;
    offset += limit;
  }
  return rows;
}

export async function countRows(tableId: string, queries: string[] = []): Promise<number> {
  const tablesDB = getTablesDB();
  const result = await tablesDB.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId,
    queries: [...queries, Query.limit(1)],
    total: true,
  });
  return result.total;
}

export async function runTransaction<T>(
  stage: (tablesDB: TablesDB, transactionId: string) => Promise<T>,
): Promise<T> {
  const tablesDB = getTablesDB();
  const tx = await tablesDB.createTransaction();
  try {
    const result = await stage(tablesDB, tx.$id);
    await tablesDB.updateTransaction({ transactionId: tx.$id, commit: true });
    return result;
  } catch (err) {
    try {
      await tablesDB.updateTransaction({ transactionId: tx.$id, rollback: true });
    } catch {
      // best-effort rollback; the transaction still expires via its TTL
    }
    throw err;
  }
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}
