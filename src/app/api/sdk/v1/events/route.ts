import { NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { AnalyticsEventRow, DB, ProjectStatus, ProjectsRow, getRowSafe, getTablesDB } from "@/server/db/client";
import { sdkEventSchema } from "@/server/http/schemas";
import { withApi } from "@/server/http/handler";
import { clientIpFromRequest, enforceRateLimit, rateLimitKey } from "@/server/http/rate-limit";

export const POST = withApi(
  async (request: Request) => {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = sdkEventSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const { eventType, sessionId, projectId } = parsed.data;

    const ip = clientIpFromRequest(request);
    await enforceRateLimit(rateLimitKey("sdk-events", ip), { limit: 60, windowSeconds: 60 });

    const project = await getRowSafe<ProjectsRow>(DB.projects, projectId);
    if (!project || project.status !== ProjectStatus.PUBLISHED) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const eventId = ID.unique();
    await getTablesDB().createRow<AnalyticsEventRow>({
      databaseId: DB.databaseId,
      tableId: DB.analyticsEvents,
      rowId: eventId,
      data: {
        eventType,
        sessionId,
        projectId,
        brandId: project.brandId,
      },
    });

    return NextResponse.json({ success: true, eventId }, { status: 201 });
  },
  { route: "POST /api/sdk/v1/events" },
);
