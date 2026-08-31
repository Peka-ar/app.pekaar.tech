"use server";

import { Storage } from "node-appwrite";
import { requirePrincipal, Role } from "@/server/auth-guards";
import { createAdminClient } from "@/server/appwrite";
import { buildFileUrl } from "@/lib/appwrite-config";
import {
  ASSET_POLICY,
  isAssetType,
  validateAssetUpload,
} from "@/server/domain/asset-policy";
import { AssetStatus, AssetsRow, DB, getRowSafe, getTablesDB } from "@/server/db/client";
import { recordAssetSchema } from "@/server/http/schemas";
import { logger } from "@/server/logging";

export type RecordedAsset = {
  id: string;
  url: string;
  type: string;
  status: string;
  mimeType: string;
  size: number;
  originalName: string;
};

function toRecorded(a: AssetsRow): RecordedAsset {
  return {
    id: a.$id,
    url: a.url,
    type: a.type,
    status: a.status,
    mimeType: a.mimeType,
    size: a.size,
    originalName: a.originalName,
  };
} 

export async function recordAssetUpload(input: {
  fileId: string;
  type: string;
}): Promise<{ asset: RecordedAsset }> {
  const parsed = recordAssetSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Invalid upload metadata");
  }
  const { fileId, type } = parsed.data;
  if (!isAssetType(type)) {
    throw new Error("Unsupported asset type");
  }

  const roles =
    type === "REFERENCE_IMAGE" ? [Role.BRAND] : [Role.ADMIN];
  const principal = await requirePrincipal({ roles });
  const policy = ASSET_POLICY[type];

  const storage = new Storage(createAdminClient());
  const file = await storage.getFile({ bucketId: policy.bucketId, fileId });

  // Server-side policy enforcement — never trust the client claim alone.
  const validation = validateAssetUpload({
    type,
    fileName: file.name,
    sizeBytes: file.sizeOriginal,
  });
  if (!validation.ok) {
    await storage.deleteFile({ bucketId: policy.bucketId, fileId }).catch(() => {
      logger.warn(`[assets] failed to delete rejected file ${fileId}`);
    });
    throw new Error(validation.reason);
  }

  // Idempotent: a retried call (or a browser that uploaded but never got the
  // response) must not create a duplicate row. Reuse the existing row when the
  // file is already recorded.
  const existing = await getRowSafe<AssetsRow>(DB.assets, fileId);
  if (existing) {
    if (existing.ownerId !== principal.userId) {
      throw new Error("You do not own this file");
    }
    return { asset: toRecorded(existing) };
  }

  const mimeType = file.mimeType || policy.mimeFallback;
  const url = buildFileUrl(policy.bucketId, fileId);

  await getTablesDB().createRow<AssetsRow>({
    databaseId: DB.databaseId,
    tableId: DB.assets,
    rowId: fileId,
    data: {
      projectId: null,
      ownerId: principal.userId,
      type,
      status: AssetStatus.READY,
      provider: "appwrite",
      fileId,
      url,
      originalName: file.name,
      mimeType,
      size: file.sizeOriginal,
      checksum: file.signature,
    },
  });

  return {
    asset: {
      id: fileId,
      url,
      type,
      status: AssetStatus.READY,
      mimeType,
      size: file.sizeOriginal,
      originalName: file.name,
    },
  };
}
