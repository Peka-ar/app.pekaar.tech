import { Readable } from "node:stream"
import type { NextRequest } from "next/server"
import { prisma } from "@/lib/prisma"
import { AssetStatus, ProjectStatus, Role } from "@/generated/prisma/client"
import { requirePrincipal, UnauthenticatedError, ForbiddenError, StaleSessionError } from "@/lib/auth-guards"
import { deliverAsset } from "@/lib/storage/asset-delivery"

export const dynamic = "force-dynamic"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ assetId: string }> },
) {
  const { assetId } = await params

  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    select: {
      id: true,
      url: true,
      key: true,
      gdriveFileId: true,
      originalName: true,
      mimeType: true,
      size: true,
      status: true,
      projectId: true,
      project: { select: { status: true, brandId: true } },
    },
  })

  if (!asset || !asset.projectId) {
    return jsonError(404, "asset unavailable")
  }

  if (
    asset.status !== AssetStatus.READY &&
    asset.status !== AssetStatus.PUBLISHED &&
    asset.status !== AssetStatus.ARCHIVED
  ) {
    return jsonError(404, "asset unavailable")
  }

  const isPublic = asset.project?.status === ProjectStatus.PUBLISHED
  if (!isPublic) {
    try {
      const principal = await requirePrincipal({ roles: [Role.ADMIN, Role.BRAND] })
      if (principal.role === Role.BRAND && asset.project?.brandId !== principal.userId) {
        return jsonError(403, "forbidden")
      }
    } catch (err) {
      if (err instanceof UnauthenticatedError || err instanceof StaleSessionError) {
        return jsonError(401, "unauthorized")
      }
      if (err instanceof ForbiddenError) {
        return jsonError(403, "forbidden")
      }
      throw err
    }
  }

  const outcome = await deliverAsset(
    {
      url: asset.url,
      gdriveFileId: asset.gdriveFileId,
      mimeType: asset.mimeType,
      originalName: asset.originalName,
      preferGDrive: asset.status === AssetStatus.ARCHIVED,
    },
    request.signal,
  )

  if (!outcome.ok) {
    return jsonError(outcome.status, outcome.error)
  }

  const webStream =
    outcome.body instanceof Readable
      ? Readable.toWeb(outcome.body)
      : (outcome.body as ReadableStream<Uint8Array>)

  const headers: Record<string, string> = {
    "Content-Type": outcome.contentType,
    "Content-Disposition": `inline; filename="${encodeURIComponent(asset.originalName)}"`,
    "Cache-Control": isPublic
      ? "public, max-age=300, stale-while-revalidate=86400"
      : "private, max-age=60",
    "x-source": outcome.source,
  }
  if (outcome.contentLength !== undefined) {
    headers["Content-Length"] = String(outcome.contentLength)
  }

  console.log(
    `[asset-delivery] asset=${asset.id} name=${asset.originalName} source=${outcome.source} public=${isPublic}`,
  )

  return new Response(webStream as unknown as BodyInit, { status: 200, headers })
}

function jsonError(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}
