import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProjectStatus } from "@/generated/prisma/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const project = await prisma.project.findFirst({
      where: { id: projectId, status: ProjectStatus.PUBLISHED },
      select: {
        assets: { select: { type: true, url: true } },
        sdkConfig: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const glbUrl = project.assets.find((a) => a.type === "MODEL_GLB")?.url;
    const usdzUrl = project.assets.find((a) => a.type === "MODEL_USDZ")?.url;

    return NextResponse.json(
      {
        assetUrls: { glb: glbUrl, usdz: usdzUrl },
        sdkConfig: project.sdkConfig,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=86400",
          "Vary": "Accept-Encoding",
        },
      }
    );
  } catch (error) {
    console.error("SDK Config GET Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
