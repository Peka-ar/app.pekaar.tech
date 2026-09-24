import "dotenv/config";
import { Query, Storage, TablesDB } from "node-appwrite";
import { createAdminClient } from "../src/server/appwrite";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_MODELS_BUCKET_ID,
  APPWRITE_REFERENCE_IMAGES_BUCKET_ID,
  APPWRITE_USERS_TABLE_ID,
} from "../src/lib/appwrite-config";
import { RATE_LIMITS_TABLE_ID } from "../src/server/http/rate-limit";
import { ensureGenerationColumns } from "../src/server/db/ensure";

const DATABASE_ID = APPWRITE_DATABASE_ID;
const CONTACT_REQUESTS_TABLE_ID = "contact_requests";
const MAINTENANCE_LOCKS_TABLE_ID = "maintenance_locks";

async function ensureTable(tablesDB: TablesDB, tableId: string, name: string) {
  try {
    await tablesDB.getTable({ databaseId: DATABASE_ID, tableId });
    console.log(`[ensure-backend] table ${tableId} exists — skipping`);
    return;
  } catch {
    // table not found — create it
  }

  await tablesDB.createTable({
    databaseId: DATABASE_ID,
    tableId,
    name,
    permissions: [],
    rowSecurity: false,
  });
  console.log(`[ensure-backend] created table ${tableId}`);

  if (tableId === RATE_LIMITS_TABLE_ID) {
    await tablesDB.createIntegerColumn({
      databaseId: DATABASE_ID,
      tableId,
      key: "remaining",
      required: false,
      min: 0,
    });
    await tablesDB.createDatetimeColumn({
      databaseId: DATABASE_ID,
      tableId,
      key: "windowStart",
      required: false,
    });
    await tablesDB.createStringColumn({
      databaseId: DATABASE_ID,
      tableId,
      key: "route",
      size: 64,
      required: false,
    });
    console.log(`[ensure-backend] seeded columns on ${tableId}`);
  }

  if (tableId === CONTACT_REQUESTS_TABLE_ID) {
    const contactColumns = [
      { key: "name", type: "string" as const, size: 120 },
      { key: "email", type: "string" as const, size: 320 },
      { key: "company", type: "string" as const, size: 160 },
      { key: "message", type: "string" as const, size: 2000 },
      { key: "interestedTier", type: "string" as const, size: 20 },
      { key: "status", type: "string" as const, size: 20 },
      { key: "sourceIp", type: "string" as const, size: 64 },
    ];
    for (const col of contactColumns) {
      if (col.type === "string") {
        await tablesDB.createStringColumn({
          databaseId: DATABASE_ID,
          tableId,
          key: col.key,
          size: col.size,
          required: false,
        });
      }
    }
    console.log(`[ensure-backend] seeded columns on ${tableId}`);
  }
}

async function ensureBucket(storage: Storage, bucketId: string, expected: {
  permissions: string[];
  fileSecurity?: boolean;
  maximumFileSize?: number;
  allowedFileExtensions?: string[];
  encryption?: boolean;
  antivirus?: boolean;
}) {
  const bucket = await storage.getBucket({ bucketId });
  let changed = false;

  const changes: Record<string, unknown> = {
    bucketId,
    name: bucket.name,
    permissions: expected.permissions,
    fileSecurity: expected.fileSecurity ?? bucket.fileSecurity,
    maximumFileSize: expected.maximumFileSize ?? bucket.maximumFileSize,
    allowedFileExtensions: expected.allowedFileExtensions ?? bucket.allowedFileExtensions,
    encryption: expected.encryption ?? bucket.encryption,
    antivirus: expected.antivirus ?? bucket.antivirus,
  };

  if (JSON.stringify(bucket.$permissions ?? []) !== JSON.stringify(expected.permissions)) changed = true;
  if (expected.allowedFileExtensions && JSON.stringify(bucket.allowedFileExtensions ?? []) !== JSON.stringify(expected.allowedFileExtensions)) changed = true;
  if (expected.antivirus !== undefined && bucket.antivirus !== expected.antivirus) changed = true;
  if (expected.encryption !== undefined && bucket.encryption !== expected.encryption) changed = true;

  if (!changed) {
    console.log(`[ensure-backend] bucket ${bucketId} already compliant`);
    return;
  }

  await storage.updateBucket(changes as never);
  console.log(`[ensure-backend] updated bucket ${bucketId}`);
}

async function main(): Promise<void> {
  const client = createAdminClient();
  const tablesDB = new TablesDB(client);
  const storage = new Storage(client);

  await ensureTable(tablesDB, RATE_LIMITS_TABLE_ID, "Rate Limits");

  await ensureBucket(storage, APPWRITE_REFERENCE_IMAGES_BUCKET_ID, {
    // Read access removed — reference images are only served through the
    // auth-gated proxy (API key). No cross-brand label reads.
    permissions: ['create("label:BRAND")'],
    fileSecurity: true,
  });

  await ensureBucket(storage, APPWRITE_MODELS_BUCKET_ID, {
    permissions: ['create("label:ADMIN")', 'read("label:ADMIN")'],
    allowedFileExtensions: ["glb", "usdz"],
    antivirus: true,
    encryption: true,
  });

  try {
    await ensureGenerationColumns(tablesDB);
  } catch (e) {
    console.warn(`[ensure-backend] could not ensure generation columns: ${(e as Error).message}`);
  }

  // Ensure contact_requests table exists with its columns.
  await ensureTable(tablesDB, CONTACT_REQUESTS_TABLE_ID, "Contact Requests");

  // Ensure maintenance_locks table exists with its expiresAt column + a lock row.
  await ensureTable(tablesDB, MAINTENANCE_LOCKS_TABLE_ID, "Maintenance Locks");
  try {
    await tablesDB.createStringColumn({
      databaseId: DATABASE_ID,
      tableId: MAINTENANCE_LOCKS_TABLE_ID,
      key: "expiresAt",
      size: 30,
      required: false,
    });
  } catch {
    // column already exists
  }
  try {
    const lockRows = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId: MAINTENANCE_LOCKS_TABLE_ID,
      queries: [Query.equal("$id", "nightly-lock")],
    });
    if (lockRows.rows.length === 0) {
      await tablesDB.createRow({
        databaseId: DATABASE_ID,
        tableId: MAINTENANCE_LOCKS_TABLE_ID,
        rowId: "nightly-lock",
        data: { expiresAt: null },
      });
      console.log(`[ensure-backend] seeded lock row on ${MAINTENANCE_LOCKS_TABLE_ID}`);
    }
  } catch (e) {
    console.warn(`[ensure-backend] could not seed maintenance lock row: ${(e as Error).message}`);
  }

  // Ensure subscription columns exist on the users table.
  const subscriptionColumns = [
    { key: "creditsRenewedAt", type: "datetime" as const },
    { key: "monthlyCreditOverride", type: "integer" as const },
  ];

  try {
    const existingUserCols = await tablesDB.listColumns({
      databaseId: DATABASE_ID,
      tableId: APPWRITE_USERS_TABLE_ID,
    });
    const existingUserKeys = new Set(existingUserCols.columns.map((c) => c.key));

    for (const col of subscriptionColumns) {
      if (existingUserKeys.has(col.key)) continue;
      try {
        if (col.type === "datetime") {
          await tablesDB.createDatetimeColumn({
            databaseId: DATABASE_ID,
            tableId: APPWRITE_USERS_TABLE_ID,
            key: col.key,
            required: false,
          });
        } else if (col.type === "integer") {
          await tablesDB.createIntegerColumn({
            databaseId: DATABASE_ID,
            tableId: APPWRITE_USERS_TABLE_ID,
            key: col.key,
            required: false,
            min: 0,
          });
        }
        console.log(`[ensure-backend] created column ${col.key} on users`);
      } catch (e) {
        console.warn(`[ensure-backend] failed to create column ${col.key}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    console.warn(`[ensure-backend] could not ensure subscription columns: ${(e as Error).message}`);
  }

  console.log("[ensure-backend] Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
