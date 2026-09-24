import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/server/env";
import { runMaintenance, takeMaintenanceLock } from "@/server/services/maintenance.service";
import { finalizeStaleGenerations } from "@/server/services/generation.service";
import { handleApiError } from "@/server/http/handler";
import { logger } from "@/server/logging";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // extended for growing sweeps

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
