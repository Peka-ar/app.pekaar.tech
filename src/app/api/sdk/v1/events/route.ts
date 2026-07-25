import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@/generated/prisma/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { eventType, sessionId, projectId } = body;

    if (!eventType || !sessionId || !projectId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const validEventTypes = ["VIEW", "INTERACTION", "AR_LAUNCH"];
    if (!validEventTypes.includes(eventType)) {
      return NextResponse.json({ error: "Invalid event type" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, status: ProjectStatus.PUBLISHED },
      select: { brandId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const event = await prisma.analyticsEvent.create({
      data: {
        eventType,
        sessionId,
        projectId,
        brandId: project.brandId,
      },
    });

    return NextResponse.json({ success: true, eventId: event.id }, { status: 201 });
  } catch (error) {
    console.error("SDK Events POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
