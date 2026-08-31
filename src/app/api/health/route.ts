import { NextResponse } from "next/server";
import { Query, Users } from "node-appwrite";
import { createAdminClient } from "@/server/appwrite";
import { logger } from "@/server/logging";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const users = new Users(createAdminClient());
    await users.list({ queries: [Query.limit(1)] });
    return NextResponse.json({ status: "ok", appwrite: "ok" });
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
