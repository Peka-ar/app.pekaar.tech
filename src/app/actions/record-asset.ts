"use server";

import { Storage } from "node-appwrite";
import { requirePrincipal, Role } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/appwrite";
import {
  buildFileUrl,
  bucketForAssetType,
  defaultMimeTypeForAssetType,
} from "@/lib/appwrite-config";
import { AssetStatus, AssetsRow, DB, getTablesDB } from "@/lib/db";

export type RecordedAsset = {
  id: string;
  url: string;
  type: string;
  status: string;
  mimeType: string;
  size: number;
  originalName: string;
};

export async function recordAssetUpload(input: {
  fileId: string;
  type: string;
}): Promise<{ asset: RecordedAsset }> {
  const { fileId, type } = input;

  if (!fileId || !type) {
    throw new Error("Missing required upload metadata");
  }

  const roles =
    type === "REFERENCE_IMAGE" ? [Role.BRAND] : type === "MODEL_GLB" || type === "MODEL_USDZ" ? [Role.ADMIN] : null;
  if (!roles) {
    throw new Error("Unsupported asset type");
  }

  const principal = await requirePrincipal({ roles });
  const bucketId = bucketForAssetType(type);

  const storage = new Storage(createAdminClient());
  const file = await storage.getFile({ bucketId, fileId });

  const mimeType = file.mimeType || defaultMimeTypeForAssetType(type) || "application/octet-stream";
  const url = buildFileUrl(bucketId, fileId);

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