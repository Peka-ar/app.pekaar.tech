import { NextRequest } from "next/server";
import { APPWRITE_API_KEY } from "@/server/appwrite";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, bucketForAssetType, defaultMimeTypeForAssetType } from "@/lib/appwrite-config";
import { requirePrincipal, UnauthenticatedError, ForbiddenError, StaleSessionError, Role } from "@/server/auth-guards";
import { AssetStatus, AssetsRow, DB, ProjectsRow, getRowSafe } from "@/server/db/client";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params;

  const asset = await getRowSafe<AssetsRow>(DB.assets, assetId);
  if (!asset) {
    return jsonError(404, "asset unavailable");
  }

  if (
    asset.status !== AssetStatus.READY &&
    asset.status !== AssetStatus.PUBLISHED &&
    asset.status !== AssetStatus.ARCHIVED
  ) {
    return jsonError(404, "asset unavailable");
  }

  try {
    const principal = await requirePrincipal({ roles: [Role.ADMIN, Role.BRAND] });
    if (principal.role === Role.BRAND) {
      const isOwner = asset.ownerId === principal.userId;
      const isProjectBrand =
        asset.projectId !== null &&
        (await getRowSafe<ProjectsRow>(DB.projects, asset.projectId))?.brandId === principal.userId;
      if (!isOwner && !isProjectBrand) {
        return jsonError(403, "forbidden");
      }
    }
  } catch (err) {
    if (err instanceof UnauthenticatedError || err instanceof StaleSessionError) {
      return jsonError(401, "unauthorized");
    }
    if (err instanceof ForbiddenError) {
      return jsonError(403, "forbidden");
    }
    throw err;
  }

  const upstream = await fetchAssetStream(asset);
  if (!upstream.ok) {
    return jsonError(404, "asset unavailable");
  }

  const mimeType = asset.mimeType || defaultMimeTypeForAssetType(asset.type) || "application/octet-stream";

  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    "Content-Disposition": `inline; filename="${encodeURIComponent(asset.originalName)}"`,
    "Cache-Control": "private, max-age=60",
  }
  if (upstream.contentLength !== undefined) {
    headers["Content-Length"] = String(upstream.contentLength);
  }

  console.log(
    `[asset-proxy] asset=${asset.$id} name=${asset.originalName} provider=${asset.provider}`,
  );

  return new Response(upstream.body, { status: 200, headers });
}

async function fetchAssetStream(asset: AssetsRow): Promise<{
  ok: boolean;
  body: ReadableStream<Uint8Array>;
  contentLength?: number;
}> {
  if (asset.provider === "appwrite" && asset.fileId) {
    const res = await fetch(
      `${APPWRITE_ENDPOINT}/storage/buckets/${bucketForAssetType(asset.type)}/files/${asset.fileId}/download`,
      {
        headers: {
          "X-Appwrite-Project": APPWRITE_PROJECT_ID,
          "X-Appwrite-Key": APPWRITE_API_KEY,
        },
      },
    );
    if (!res.ok || !res.body) {
      return { ok: false, body: new ReadableStream() };
    }
    const contentLength = res.headers.get("Content-Length");
    return {
      ok: true,
      body: res.body,
      contentLength: contentLength ? Number(contentLength) : undefined,
    };
  }

  // Seed (external) and legacy UploadThing rows: the stored URL is a plain public URL.
  const res = await fetch(asset.url);
  if (!res.ok || !res.body) {
    return { ok: false, body: new ReadableStream() };
  }
  const contentLength = res.headers.get("Content-Length");
  return {
    ok: true,
    body: res.body,
    contentLength: contentLength ? Number(contentLength) : undefined,
  };
}

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}