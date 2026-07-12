import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";



export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: {
        status: true,
        assetUrls: true,
        sdkConfig: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status !== "PUBLISHED") {
      return NextResponse.json({ error: "Project is not published yet" }, { status: 403 });
    }

    return NextResponse.json(
      {
        assetUrls: project.assetUrls,
        sdkConfig: project.sdkConfig,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error) {
    console.error("SDK Config GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
