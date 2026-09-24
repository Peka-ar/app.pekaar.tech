import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { TablesDB, Query } from "node-appwrite";
import { env } from "@/server/env";
import { runMaintenance } from "@/server/services/maintenance.service";
import { finalizeStaleGenerations } from "@/server/services/generation.service";
import { handleApiError } from "@/server/http/handler";
import { logger } from "@/server/logging";
import { createAdminClient } from "@/server/appwrite";
import { APPWRITE_DATABASE_ID } from "@/lib/appwrite-config";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // extended for growing sweeps

const MAINTENANCE_LOCKS_TABLE_ID = "maintenance_locks";
const LOCK_ROW_ID = "nightly-lock";
const LOCK_TTL_MS = 6 * 60 * 60 * 1000; // 6h — long enough to dedup overlap, short enough to self-heal

/** Timing-safe Bearer secret comparison (length-safe on mismatch). */
function isBearerEqual(auth: string | null, expected: string): boolean {
  if (!auth || !auth.startsWith("Bearer ")) return false;
  const provided = auth.slice(7);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Single-row lock in `maintenance_locks` (provisioned by ensure-backend).
 * Claims an expired/never-taken lock; returns false when another run holds it.
 * Fail-open when the lock table is missing — the lock dedups, it must not
 * gate the nightly invariant sweeps.
 */
async function takeMaintenanceLock(): Promise<boolean> {
  const db = new TablesDB(createAdminClient());
  const nowISO = new Date().toISOString();
  const newExpiry = new Date(Date.now() + LOCK_TTL_MS).toISOString();
  try {
    const updated = await db.updateRows({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: MAINTENANCE_LOCKS_TABLE_ID,
      queries: [
        Query.equal("$id", LOCK_ROW_ID),
        Query.or([Query.isNull("expiresAt"), Query.lessThan("expiresAt", nowISO)]),
      ],
      data: { expiresAt: newExpiry },
    });
    if (updated.rows.length > 0) return true;
    return false; // lock held by a concurrent/recent run
  } catch {
    // Table or row may not exist yet — claim the lock by creating the row.
    try {
      await db.createRow({
        databaseId: APPWRITE_DATABASE_ID,
        tableId: MAINTENANCE_LOCKS_TABLE_ID,
        rowId: LOCK_ROW_ID,
        data: { expiresAt: newExpiry },
      });
      return true;
    } catch (e) {
      logger.warn("[cron] maintenance lock unavailable; proceeding without lock", {
        err: e instanceof Error ? e.message : String(e),
      });
      return true; // fail-open
    }
  }
}

/**
 * Nightly maintenance entrypoint, invoked by Vercel Cron (see vercel.json).
 * Vercel Cron signs requests with `Authorization: Bearer ${CRON_SECRET}`;
 * we fail closed when the secret is missing or does not match.
 */
export async function GET(request: NextRequest) {
  try {
    const expected = env.CRON_SECRET;
    if (!expected) {
      logger.warn("[cron] CRON_SECRET not configured; skipping maintenance run");
      return NextResponse.json({ ok: false, error: "not configured" }, { status: 503 });
    }

    const auth = request.headers.get("authorization");
    if (!isBearerEqual(auth, expected)) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
    }

    // Lock-based dedup: overlapping runs skip instead of double-crediting.
    const locked = await takeMaintenanceLock();
    if (!locked) {
      logger.info("[cron] maintenance lock held; skipping this run");
      return NextResponse.json({ ok: true, skipped: "lock-held" });
    }

    const [maintenanceReport, generationReport] = await Promise.all([
      runMaintenance(),
      finalizeStaleGenerations(),
    ]);
    logger.info("[cron] maintenance complete", {
      ...maintenanceReport,
      generation: generationReport,
    });
    return NextResponse.json({ ok: true, ...maintenanceReport, generation: generationReport });
  } catch (err) {
    return handleApiError(err, { route: "/api/cron/maintenance" });
  }
}
