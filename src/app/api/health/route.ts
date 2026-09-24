import { NextResponse } from "next/server";
import { Query, TablesDB, Users } from "node-appwrite";
import { createAdminClient } from "@/server/appwrite";
import { APPWRITE_DATABASE_ID } from "@/lib/appwrite-config";
import { GENERATION_COLUMN_KEYS } from "@/server/db/ensure";
import { logger } from "@/server/logging";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const admin = createAdminClient();
    const users = new Users(admin);
    await users.list({ queries: [Query.limit(1)] });

    let missingGenerationColumns: string[] = [];
    try {
      const tablesDB = new TablesDB(admin);
      const cols = await tablesDB.listColumns({ databaseId: APPWRITE_DATABASE_ID, tableId: "projects" });
      const available = new Set(
        cols.columns.filter((c) => c.status === "available").map((c) => c.key),
      );
      missingGenerationColumns = [...GENERATION_COLUMN_KEYS].filter((k) => !available.has(k));
    } catch {
    }

    return NextResponse.json({
      status: missingGenerationColumns.length > 0 ? "degraded" : "ok",
      appwrite: "ok",
      generationSchemaReady: missingGenerationColumns.length === 0,
    });
  } catch (err) {
    logger.error("health check failed", {
      err: err instanceof Error ? { name: err.name, message: err.message } : err,
    });
    return NextResponse.json(
      { status: "degraded", appwrite: "unreachable" },
      { status: 503 },
    );
  }
}
