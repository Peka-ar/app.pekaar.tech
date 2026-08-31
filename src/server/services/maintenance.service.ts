import { Models, Query, Storage } from "node-appwrite";
import { createAdminClient } from "@/server/appwrite";
import { bucketForAssetType } from "@/lib/appwrite-config";
import {
  DB,
  getTablesDB,
  listAllRows,
  AssetStatus,
  AssetType,
  ProjectStatus,
  AssetsRow,
  ProjectsRow,
} from "@/server/db/client";
import { setFilePublicWithRetry } from "@/server/storage";
import { RATE_LIMITS_TABLE_ID } from "@/server/http/rate-limit";
import { logger } from "@/server/logging";

export const PUBLIC_READ_PERMISSION = 'read("any")';

const DELETE_BATCH_SIZE = 100;

const PUBLIC_CAPABLE_ASSET_STATUSES = [
  AssetStatus.READY,
  AssetStatus.PUBLISHED,
  AssetStatus.ARCHIVED,
];

export interface StorageReconcileReport {
  scanned: number;
  granted: number;
  revoked: number;
  failures: number;
}

export interface MaintenanceReport {
  storage: StorageReconcileReport;
  rateLimitsDeleted: number;
  analyticsEventsDeleted: number;
}

export function hasPublicRead(permissions: string[] | undefined): boolean {
  return (permissions ?? []).includes(PUBLIC_READ_PERMISSION);
}

export function shouldModelAssetBePublic(
  projectId: string | null,
  publishedProjectIds: ReadonlySet<string>,
): boolean {
  return projectId != null && publishedProjectIds.has(projectId);
}

/**
 * Nightly drift sweep for the "PUBLISHED => model assets publicly readable"
 * invariant. READY/PUBLISHED/ARCHIVED model assets on a PUBLISHED project must
 * carry read("any"); the same assets on any other (or no) project must not.
 * Only writes on drift; failures are counted and logged, never thrown.
 */
export async function reconcileStoragePermissions(): Promise<StorageReconcileReport> {
  const projects = await listAllRows<ProjectsRow>(DB.projects, [
    Query.select(["status", "brandId"]),
  ]);
  const publishedProjectIds = new Set(
    projects.filter((p) => p.status === ProjectStatus.PUBLISHED).map((p) => p.$id),
  );

  const assets = await listAllRows<AssetsRow>(DB.assets, [
    Query.or([
      Query.equal("type", AssetType.MODEL_GLB),
      Query.equal("type", AssetType.MODEL_USDZ),
    ]),
    Query.or(PUBLIC_CAPABLE_ASSET_STATUSES.map((status) => Query.equal("status", status))),
    Query.equal("provider", "appwrite"),
    Query.select(["projectId", "type", "status", "fileId"]),
  ]);

  const modelAssets = assets.filter((a) => a.fileId);
  const storage = new Storage(createAdminClient());

  let granted = 0;
  let revoked = 0;
  let failures = 0;

  for (const asset of modelAssets) {
    const shouldBePublic = shouldModelAssetBePublic(asset.projectId, publishedProjectIds);
    try {
      const file = await storage.getFile({
        bucketId: bucketForAssetType(asset.type),
        fileId: asset.fileId as string,
      });
      if (hasPublicRead(file.$permissions) === shouldBePublic) continue;

      const ok = await setFilePublicWithRetry(asset, shouldBePublic);
      if (ok) {
        if (shouldBePublic) granted += 1;
        else revoked += 1;
      } else {
        failures += 1;
      }
    } catch (err) {
      failures += 1;
      logger.warn(`[maintenance] storage reconcile failed for asset=${asset.$id}`, {
        err: err instanceof Error ? err.message : err,
      });
    }
  }

  return { scanned: modelAssets.length, granted, revoked, failures };
}

async function deleteRowsOlderThan(tableId: string, column: string, cutoffIso: string, selectColumn: string): Promise<number> {
  const db = getTablesDB();
  let deleted = 0;

  for (;;) {
    const result = await db.listRows<Models.Row>({
      databaseId: DB.databaseId,
      tableId,
      queries: [
        Query.lessThan(column, cutoffIso),
        Query.limit(DELETE_BATCH_SIZE),
        Query.select([selectColumn]),
      ],
      total: false,
    });
    const ids = result.rows.map((row) => row.$id);
    if (ids.length === 0) break;

    await db.deleteRows({
      databaseId: DB.databaseId,
      tableId,
      queries: [Query.equal("$id", ids)],
    });
    deleted += ids.length;
    if (ids.length < DELETE_BATCH_SIZE) break;
  }

  return deleted;
}

export async function pruneRateLimitRows(
  olderThanMs = 48 * 60 * 60 * 1000,
): Promise<number> {
  const cutoffIso = new Date(Date.now() - olderThanMs).toISOString();
  return deleteRowsOlderThan(RATE_LIMITS_TABLE_ID, "windowStart", cutoffIso, "remaining");
}

export async function pruneAnalyticsEvents(
  olderThanMs = 90 * 24 * 60 * 60 * 1000,
): Promise<number> {
  const cutoffIso = new Date(Date.now() - olderThanMs).toISOString();
  return deleteRowsOlderThan(DB.analyticsEvents, "$createdAt", cutoffIso, "eventType");
}

export async function runMaintenance(): Promise<MaintenanceReport> {
  const [storage, rateLimitsDeleted, analyticsEventsDeleted] = await Promise.all([
    reconcileStoragePermissions(),
    pruneRateLimitRows(),
    pruneAnalyticsEvents(),
  ]);
  return { storage, rateLimitsDeleted, analyticsEventsDeleted };
}
