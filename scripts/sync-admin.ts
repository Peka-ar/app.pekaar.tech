import "dotenv/config";
import { ID, Models, Query, TablesDB, Users } from "node-appwrite";
import { createAdminClient } from "../src/lib/appwrite";
import {
  APPWRITE_DATABASE_ID,
  APPWRITE_USERS_TABLE_ID,
} from "../src/lib/appwrite-config";

type AdminRow = Models.Row & { email: string; role: string };

function readEnv(): { email: string; password: string; name: string } {
  const email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  const name = process.env.ADMIN_NAME || "Studio Admin";

  if (!email || !password) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required in .env");
  }
  if (password.length < 6) {
    throw new Error("ADMIN_PASSWORD must be at least 6 characters");
  }
  return { email, password, name };
}

async function listAllAdminRows(tablesDB: TablesDB): Promise<AdminRow[]> {
  const rows: AdminRow[] = [];
  let offset = 0;
  while (true) {
    const page = await tablesDB.listRows<AdminRow>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: APPWRITE_USERS_TABLE_ID,
      queries: [Query.equal("role", "ADMIN"), Query.limit(100), Query.offset(offset)],
    });
    rows.push(...page.rows);
    if (page.rows.length < 100) break;
    offset += 100;
  }
  return rows;
}

async function main(): Promise<void> {
  const { email, password, name } = readEnv();

  const client = createAdminClient();
  const users = new Users(client);
  const tablesDB = new TablesDB(client);

  const existing = await users.list({ queries: [Query.equal("email", email)] });
  let adminId: string;
  if (existing.users.length > 0) {
    const u = existing.users[0];
    adminId = u.$id;
    console.log(`[sync-admin] Updating admin ${email} (${adminId})`);
    await users.updateName({ userId: adminId, name });
    await users.updatePassword({ userId: adminId, password });
    await users.updateLabels({ userId: adminId, labels: ["ADMIN"] });
    await users.updateEmailVerification({ userId: adminId, emailVerification: true });
  } else {
    const u = await users.create({ userId: ID.unique(), email, password, name });
    adminId = u.$id;
    console.log(`[sync-admin] Created admin ${email} (${adminId})`);
    await users.updateLabels({ userId: adminId, labels: ["ADMIN"] });
    await users.updateEmailVerification({ userId: adminId, emailVerification: true });
  }

  const existingRow = await tablesDB
    .getRow({ databaseId: APPWRITE_DATABASE_ID, tableId: APPWRITE_USERS_TABLE_ID, rowId: adminId })
    .catch(() => null);

  const rowData = {
    userId: adminId,
    email,
    role: "ADMIN",
    usageLimits: 9999,
    onboarded: true,
    name,
    status: "ACTIVE",
    suspendedAt: null,
    statusReason: null,
  };
  if (existingRow) {
    await tablesDB.updateRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: APPWRITE_USERS_TABLE_ID,
      rowId: adminId,
      data: rowData,
    });
  } else {
    await tablesDB.createRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: APPWRITE_USERS_TABLE_ID,
      rowId: adminId,
      data: rowData,
    });
  }

  const adminRows = await listAllAdminRows(tablesDB);
  for (const row of adminRows) {
    if (row.email.toLowerCase() !== email) {
      console.log(`[sync-admin] Deleting stray admin ${row.email} (${row.$id})`);
      try {
        await users.delete({ userId: row.$id });
      } catch (err) {
        console.error(`[sync-admin] Failed to delete Appwrite user ${row.$id}:`, err);
      }
      try {
        await tablesDB.deleteRow({
          databaseId: APPWRITE_DATABASE_ID,
          tableId: APPWRITE_USERS_TABLE_ID,
          rowId: row.$id,
        });
      } catch (err) {
        console.error(`[sync-admin] Failed to delete row ${row.$id}:`, err);
      }
    }
  }

  console.log(`[sync-admin] Done. Sign in at /auth with ${email}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});