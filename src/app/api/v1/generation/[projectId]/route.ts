import { NextRequest, NextResponse } from "next/server";
import { requirePrincipal } from "@/server/auth-guards";
import { handleApiError } from "@/server/http/handler";
import { pollAndFinalize } from "@/server/services/generation.service";
import { logger } from "@/server/logging";

const log = logger;

/**
 * GET /api/v1/generation/[projectId]
 *
 * Brand polls this while the AI draft is processing. The server-side
 * poll-and-finalize logic runs inside the same request, so a single
 * poll from the client can simultaneously advance the project through
 * RUNNING → FINALIZING → SUCCEEDED/FAILED.
 *
 * The cron also calls this periodically for any missed projects.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    await requirePrincipal();
    const { projectId } = await params;

    const result = await pollAndFinalize(projectId);

    return NextResponse.json({
      generationStatus: result.generationStatus,
      generationError: result.generationError,
      generationCompletedAt: result.generationCompletedAt,
    });
  } catch (e) {
    return handleApiError(e, log);
  }
}