import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/lib/enums";
import { requirePrincipal } from "@/server/auth-guards";
import { getRowSafe, type ProjectsRow } from "@/server/db/client";
import { handleApiError } from "@/server/http/handler";
import { NotFoundError } from "@/server/http/errors";
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
    const principal = await requirePrincipal();
    const { projectId } = await params;

    const project = await getRowSafe<ProjectsRow>("projects", projectId);
    if (!project) throw new NotFoundError("Project not found");
    if (principal.role !== Role.ADMIN && project.brandId !== principal.userId) {
      throw new NotFoundError("Project not found");
    }

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