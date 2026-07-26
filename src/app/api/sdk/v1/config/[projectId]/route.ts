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
        assets: { select: { id: true, type: true } },
        sdkConfig: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const glbAsset = project.assets.find((a) => a.type === "MODEL_GLB");
    const usdzAsset = project.assets.find((a) => a.type === "MODEL_USDZ");
    const assetUrls = {
      glb: glbAsset ? `/api/v1/assets/${glbAsset.id}/file` : undefined,
      usdz: usdzAsset ? `/api/v1/assets/${usdzAsset.id}/file` : undefined,
    };

    return NextResponse.json(
      {
        assetUrls,
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
