import { NextRequest, NextResponse } from "next/server";
import { env } from "@/server/env";
import { runMaintenance } from "@/server/services/maintenance.service";
import { finalizeStaleGenerations } from "@/server/services/generation.service";
import { handleApiError } from "@/server/http/handler";
import { logger } from "@/server/logging";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
    if (auth !== `Bearer ${expected}`) {
      return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
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
