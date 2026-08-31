import "dotenv/config";
import { ID, Query, TablesDB, Users } from "node-appwrite";
import { createAdminClient } from "../src/server/appwrite";
import {
  APPWRITE_ASSETS_TABLE_ID,
  APPWRITE_DATABASE_ID,
  APPWRITE_PROJECTS_TABLE_ID,
  APPWRITE_USERS_TABLE_ID,
} from "../src/lib/appwrite-config";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ADMIN_NAME = process.env.ADMIN_NAME || "Studio Admin";

const BRAND_EMAIL = "brand@example.com";
const BRAND_PASSWORD = "brand123";
const BRAND_NAME = "Acme Furniture Co.";

const GLB_URL =
  "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/SheenChair/glTF-Binary/SheenChair.glb";

const ARMCHAIR_REF =
  "https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?w=1200&q=80";
const TABLE_REF =
  "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?w=1200&q=80";
const EAMES_REF =
  "https://images.unsplash.com/photo-1567016432779-094069958ea5?w=1200&q=80";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function upsertUser(
  users: Users,
  tablesDB: TablesDB,
  input: { email: string; password: string; name: string; role: "BRAND" | "ADMIN"; usageLimits: number },
): Promise<string> {
  const email = normalizeEmail(input.email);
  const existing = await users.list({ queries: [Query.equal("email", email)] });
  let userId: string;

  if (existing.users.length > 0) {
    const u = existing.users[0];
    userId = u.$id;
    console.log(`[seed] User ${email} exists (${userId}) — updating password/name/labels`);
    await users.updateName({ userId, name: input.name });
    await users.updatePassword({ userId, password: input.password });
    await users.updateLabels({ userId, labels: [input.role] });
    await users.updateEmailVerification({ userId, emailVerification: true });
  } else {
    const u = await users.create({ userId: ID.unique(), email, password: input.password, name: input.name });
    userId = u.$id;
    console.log(`[seed] Created user ${email} (${userId})`);
    await users.updateLabels({ userId, labels: [input.role] });
    await users.updateEmailVerification({ userId, emailVerification: true });
  }

  const existingRow = await tablesDB
    .getRow({ databaseId: APPWRITE_DATABASE_ID, tableId: APPWRITE_USERS_TABLE_ID, rowId: userId })
    .catch(() => null);

  const rowData = {
    userId,
    email,
    role: input.role,
    usageLimits: input.usageLimits,
    onboarded: true,
    name: input.name,
    status: "ACTIVE",
    suspendedAt: null,
    statusReason: null,
  };

  if (existingRow) {
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: APPWRITE_USERS_TABLE_ID,
      rowId: userId,
      data: rowData,
    });
  } else {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: APPWRITE_USERS_TABLE_ID,
      rowId: userId,
      data: rowData,
    });
  }

  return userId;
}

type SeedAsset = {
  type: "REFERENCE_IMAGE" | "MODEL_GLB" | "MODEL_USDZ";
  url: string;
  originalName: string;
  mimeType: string;
  status?: "READY" | "ARCHIVED";
};

type SeedProject = {
  name: string;
  status: "PENDING" | "COMPLETED" | "PUBLISHED";
  sdkConfig?: Record<string, unknown>;
  assets: SeedAsset[];
};

async function seedProject(tablesDB: TablesDB, brandId: string, project: SeedProject): Promise<void> {
  const existing = await tablesDB.listRows({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_PROJECTS_TABLE_ID,
    queries: [Query.equal("name", project.name), Query.limit(1)],
  });
  if (existing.rows.length > 0) {
    console.log(`[seed] Project "${project.name}" exists — skipping`);
    return;
  }

  const proj = await tablesDB.createRow({
    databaseId: APPWRITE_DATABASE_ID,
    tableId: APPWRITE_PROJECTS_TABLE_ID,
    rowId: ID.unique(),
    data: {
      name: project.name,
      sku: null,
      instructions: null,
      dimensions: null,
      status: project.status,
      sdkConfig: project.sdkConfig ? JSON.stringify(project.sdkConfig) : null,
      brandId,
    },
  });
  console.log(`[seed] Created project "${project.name}" (${proj.$id})`);

  for (const asset of project.assets) {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: APPWRITE_ASSETS_TABLE_ID,
      rowId: ID.unique(),
      data: {
        projectId: proj.$id,
        ownerId: brandId,
        type: asset.type,
        status: asset.status ?? "READY",
        provider: "external",
        fileId: null,
        url: asset.url,
        originalName: asset.originalName,
        mimeType: asset.mimeType,
        size: 0,
        checksum: null,
      },
    });
  }
}

async function main(): Promise<void> {
  const client = createAdminClient();
  const users = new Users(client);
  const tablesDB = new TablesDB(client);

  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    await upsertUser(users, tablesDB, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      name: ADMIN_NAME,
      role: "ADMIN",
      usageLimits: 9999,
    });
  } else {
    console.log("[seed] ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin (use `npm run sync-admin`)");
  }

  const brandId = await upsertUser(users, tablesDB, {
    email: BRAND_EMAIL,
    password: BRAND_PASSWORD,
    name: BRAND_NAME,
    role: "BRAND",
    usageLimits: 10,
  });

  await seedProject(tablesDB, brandId, {
    name: "Velvet Sheen Armchair",
    status: "PUBLISHED",
    sdkConfig: { autoRotate: true, shadow: 0.8, backgroundColor: "#F9F8F6", scale: [1, 1, 1] },
    assets: [
      { type: "REFERENCE_IMAGE", url: ARMCHAIR_REF, originalName: "velvet-sheen-armchair-ref.jpg", mimeType: "image/jpeg" },
      { type: "MODEL_GLB", url: GLB_URL, originalName: "velvet-sheen-armchair.glb", mimeType: "model/gltf-binary" },
    ],
  });

  await seedProject(tablesDB, brandId, {
    name: "Nordic Oak Table",
    status: "COMPLETED",
    assets: [
      { type: "REFERENCE_IMAGE", url: TABLE_REF, originalName: "nordic-oak-table-ref.jpg", mimeType: "image/jpeg" },
      { type: "MODEL_GLB", url: GLB_URL, originalName: "nordic-oak-table.glb", mimeType: "model/gltf-binary" },
    ],
  });

  await seedProject(tablesDB, brandId, {
    name: "Eames Lounge Replica",
    status: "PENDING",
    assets: [
      { type: "REFERENCE_IMAGE", url: EAMES_REF, originalName: "eames-lounge-replica-ref.jpg", mimeType: "image/jpeg" },
    ],
  });

  console.log("[seed] Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});