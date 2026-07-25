import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError, UTFiles } from "uploadthing/server";

import { requirePrincipal, StaleSessionError, UnauthenticatedError, ForbiddenError } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { Role, AssetType, AssetStatus } from "@/generated/prisma/client";
import { gdriveAdapter } from "@/lib/storage";
import { buildBackupName, generateAssetId, slugify } from "@/lib/storage/naming";

async function createAssetAndBackup(
  metadata: { userId: string; assetType: AssetType; assetId: string; originalName: string },
  file: { key: string; ufsUrl: string; name: string; type: string; size: number },
) {
  const backupName = buildBackupName(metadata.assetId, metadata.originalName);

  const asset = await prisma.asset.create({
    data: {
      id: metadata.assetId,
      type: metadata.assetType,
      status: AssetStatus.READY,
      provider: "uploadthing",
      key: file.key,
      url: file.ufsUrl,
      ownerId: metadata.userId,
      originalName: metadata.originalName,
      mimeType: file.type,
      size: file.size,
    },
  });

  console.log(`[uploadthing] asset=${asset.id} UploadThing complete; scheduling GDrive backup in background`);

  setImmediate(() => {
    gdriveAdapter
      .backupFile(file.key, asset.url, asset.mimeType, backupName)
      .then((gdriveFileId) => {
        if (gdriveFileId) {
          console.log(`[uploadthing] asset=${asset.id} GDrive backup complete: ${gdriveFileId}`);
          return prisma.asset.update({
            where: { id: asset.id },
            data: { backupSynced: true, gdriveFileId },
          });
        }
        return null;
      })
      .catch((err) => console.error(`[uploadthing] asset=${asset.id} GDrive backup failed:`, err));
  });

  return {
    asset: {
      id: asset.id,
      url: asset.url,
      key: asset.key,
      type: asset.type,
      status: asset.status,
      mimeType: asset.mimeType,
      size: asset.size,
    },
  };
}

const f = createUploadthing();

async function requireAuth(options: { roles: Role[]; assetType: AssetType }) {
  try {
    const p = await requirePrincipal({ roles: options.roles });
    return { userId: p.userId, assetType: options.assetType };
  } catch (error) {
    if (error instanceof UnauthenticatedError || error instanceof StaleSessionError) {
      throw new UploadThingError({ code: "FORBIDDEN", message: "Sign in required to upload files" });
    }
    if (error instanceof ForbiddenError) {
      throw new UploadThingError({ code: "FORBIDDEN", message: "You don't have permission to upload this file type" });
    }
    throw new UploadThingError({ code: "INTERNAL_SERVER_ERROR", message: "Upload initialization failed" });
  }
}

export const ourFileRouter = {
  referenceImageUploader: f({ image: { maxFileSize: "16MB", maxFileCount: 1 } })
    .middleware(async ({ files }) => {
      const { userId, assetType } = await requireAuth({ roles: [Role.BRAND], assetType: AssetType.REFERENCE_IMAGE });
      const file = files[0];
      const assetId = generateAssetId();
      return {
        userId,
        assetType,
        assetId,
        originalName: file.name,
        [UTFiles]: [{ ...file, customId: assetId, name: slugify(file.name) }],
      };
    })
    .onUploadComplete(async ({ metadata, file }) => createAssetAndBackup(metadata, file)),

  modelGlbUploader: f({ blob: { maxFileSize: "128MB", maxFileCount: 1 } })
    .middleware(async ({ files }) => {
      const { userId, assetType } = await requireAuth({ roles: [Role.ADMIN], assetType: AssetType.MODEL_GLB });
      const file = files[0];
      const assetId = generateAssetId();
      return {
        userId,
        assetType,
        assetId,
        originalName: file.name,
        [UTFiles]: [{ ...file, customId: assetId, name: slugify(file.name) }],
      };
    })
    .onUploadComplete(async ({ metadata, file }) => createAssetAndBackup(metadata, file)),

  modelUsdzUploader: f({ blob: { maxFileSize: "128MB", maxFileCount: 1 } })
    .middleware(async ({ files }) => {
      const { userId, assetType } = await requireAuth({ roles: [Role.ADMIN], assetType: AssetType.MODEL_USDZ });
      const file = files[0];
      const assetId = generateAssetId();
      return {
        userId,
        assetType,
        assetId,
        originalName: file.name,
        [UTFiles]: [{ ...file, customId: assetId, name: slugify(file.name) }],
      };
    })
    .onUploadComplete(async ({ metadata, file }) => createAssetAndBackup(metadata, file)),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
