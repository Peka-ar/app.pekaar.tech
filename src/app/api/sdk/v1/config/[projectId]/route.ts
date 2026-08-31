import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { buildFileUrl, bucketForAssetType } from "@/lib/appwrite-config";
import { AssetStatus, AssetType, DB, ProjectStatus, ProjectsRow, getRowSafe, listAllRows, AssetsRow } from "@/server/db/client";

function resolveAssetUrl(asset: AssetsRow): string | undefined {
  if (asset.provider === "appwrite" && asset.fileId) {
    return buildFileUrl(bucketForAssetType(asset.type), asset.fileId);
  }
  return asset.url ?? undefined;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const project = await getRowSafe<ProjectsRow>(DB.projects, projectId);
    if (!project || project.status !== ProjectStatus.PUBLISHED) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const assets = await listAllRows<AssetsRow>(DB.assets, [Query.equal("projectId", projectId)]);

    const glbAsset =
      assets.find((a) => a.type === AssetType.MODEL_GLB && a.status === AssetStatus.READY) ??
      assets.find((a) => a.type === AssetType.MODEL_GLB);
    const usdzAsset =
      assets.find((a) => a.type === AssetType.MODEL_USDZ && a.status === AssetStatus.READY) ??
      assets.find((a) => a.type === AssetType.MODEL_USDZ);

    const assetUrls = {
      glb: glbAsset ? resolveAssetUrl(glbAsset) : undefined,
      usdz: usdzAsset ? resolveAssetUrl(usdzAsset) : undefined,
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