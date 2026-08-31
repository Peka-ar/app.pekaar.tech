import { Permission, Role as AppwriteRole, Storage } from "node-appwrite";
import { createAdminClient } from "@/server/appwrite";
import { bucketForAssetType } from "@/lib/appwrite-config";
import { AssetsRow } from "@/server/db/client";
import { logger } from "@/server/logging";

export async function setFilePublic(asset: AssetsRow, isPublic: boolean): Promise<void> {
  const storage = new Storage(createAdminClient());
  await storage.updateFile({
    bucketId: bucketForAssetType(asset.type),
    fileId: asset.fileId as string,
    permissions: isPublic ? [Permission.read(AppwriteRole.any())] : [],
  });
}

const SET_FILE_PUBLIC_ATTEMPTS = 3;
const SET_FILE_PUBLIC_BACKOFF_MS = 250;

/**
 * Retries a storage permission change. Returns false (after retries) instead of
 * throwing; residual drift is caught by the nightly reconciliation sweep.
 */
export async function setFilePublicWithRetry(asset: AssetsRow, isPublic: boolean): Promise<boolean> {
  for (let attempt = 0; attempt < SET_FILE_PUBLIC_ATTEMPTS; attempt++) {
    try {
      await setFilePublic(asset, isPublic);
      return true;
    } catch (err) {
      if (attempt < SET_FILE_PUBLIC_ATTEMPTS - 1) {
        await new Promise((r) => setTimeout(r, SET_FILE_PUBLIC_BACKOFF_MS * 2 ** attempt));
      } else {
        logger.warn(`[storage] failed to set read:any=${isPublic} on asset=${asset.$id}`, {
          err: err instanceof Error ? err.message : err,
        });
        return false;
      }
    }
  }
  return false;
}
