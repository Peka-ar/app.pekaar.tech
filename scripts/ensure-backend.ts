import "dotenv/config";
import { Storage, TablesDB } from "node-appwrite";
import { createAdminClient } from "../src/server/appwrite";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_MODELS_BUCKET_ID,
  APPWRITE_REFERENCE_IMAGES_BUCKET_ID,
} from "../src/lib/appwrite-config";
import { RATE_LIMITS_TABLE_ID } from "../src/server/http/rate-limit";

const DATABASE_ID = APPWRITE_DATABASE_ID;

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

  console.log("[ensure-backend] Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
