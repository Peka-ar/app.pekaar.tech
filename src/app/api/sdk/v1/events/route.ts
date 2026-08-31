import { NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { AnalyticsEventRow, DB, EventType, ProjectStatus, ProjectsRow, getRowSafe, getTablesDB } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventType, sessionId, projectId } = body;

    if (!eventType || !sessionId || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validEventTypes = [EventType.VIEW, EventType.INTERACTION, EventType.AR_LAUNCH];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

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
  } catch (error) {
    console.error("SDK Events POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}