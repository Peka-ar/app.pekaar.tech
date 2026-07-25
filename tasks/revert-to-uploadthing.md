# Revert Plan: Filebase/StorageAdapter → UploadThing

> **Status:** Ready to execute
> **Why:** Filebase free tier only supports private buckets, which breaks anonymous public reads required for embeds. UploadThing free tier (2GB storage, unlimited egress, no credit card) supports public serving via `*.ufs.sh` URLs.
> **Key insight:** All `asset.url` consumers (embeds, SDK config, dashboards, actions) stay **unchanged** — they just read a URL that now points to `*.ufs.sh` instead of `*.s3.filebase.io`. Only the **upload mechanism** changes.

## Overview

The current architecture uses a custom presign/confirm flow:
1. Client → `POST /api/upload/presign` → creates Asset (UPLOADING), returns presigned PUT URL
2. Client → `PUT uploadUrl` → uploads file to Filebase
3. Client → `POST /api/upload/confirm` → HEAD object, updates Asset (READY), triggers GDrive backup

UploadThing v7 handles this in one flow:
1. Client → `useUploadThing("endpoint")` → UploadThing middleware runs auth on our server
2. Client uploads directly to UploadThing's S3
3. Server `onUploadComplete` fires → creates Asset (READY) + triggers GDrive backup

The `Asset` model, all `asset.url` consumers, and the GDrive backup adapter need NO changes.

## Prerequisites

- `UPLOADTHING_TOKEN` is already in `.env` (appId: `7r8xhgyw3k`, region: `sea1`)
- UploadThing account already exists

---

## Phase 1: Install + Create UploadThing Infrastructure

### Task 1: Install UploadThing packages

```bash
npm install uploadthing @uploadthing/react
npm uninstall @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

Keep `googleapis` (GDrive backup stays).

### Task 2: Create FileRouter

**File:** `src/app/api/uploadthing/core.ts`

Three routes with a shared `createAssetAndBackup` helper:

```typescript
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { requirePrincipal } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { Role, AssetType, AssetStatus } from "@/generated/prisma/client";
import { gdriveAdapter } from "@/lib/storage";

const f = createUploadthing();

async function createAssetAndBackup(
  metadata: { userId: string; assetType: AssetType },
  file: { key: string; ufsUrl: string; name: string; type: string; size: number }
) {
  const asset = await prisma.asset.create({
    data: {
      type: metadata.assetType,
      status: AssetStatus.READY,
      provider: "uploadthing",
      key: file.key,
      url: file.ufsUrl,
      ownerId: metadata.userId,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
    },
  });
  gdriveAdapter.backupFile(asset.key, asset.url, asset.mimeType, asset.originalName)
    .then((gdriveFileId) => {
      if (gdriveFileId) {
        return prisma.asset.update({
          where: { id: asset.id },
          data: { backupSynced: true, gdriveFileId },
        });
      }
    })
    .catch((err) => console.error("GDrive backup failed for asset", asset.id, err));
  return { asset };
}

export const ourFileRouter = {
  referenceImageUploader: f({ image: { maxFileSize: "16MB", maxFileCount: 1 } })
    .middleware(async () => {
      const p = await requirePrincipal({ roles: [Role.BRAND] });
      return { userId: p.userId, assetType: AssetType.REFERENCE_IMAGE };
    })
    .onUploadComplete(async ({ metadata, file }) => createAssetAndBackup(metadata, file)),

  modelGlbUploader: f({ blob: { maxFileSize: "100MB", maxFileCount: 1 } })
    .middleware(async () => {
      const p = await requirePrincipal({ roles: [Role.ADMIN] });
      return { userId: p.userId, assetType: AssetType.MODEL_GLB };
    })
    .onUploadComplete(async ({ metadata, file }) => createAssetAndBackup(metadata, file)),

  modelUsdzUploader: f({ blob: { maxFileSize: "100MB", maxFileCount: 1 } })
    .middleware(async () => {
      const p = await requirePrincipal({ roles: [Role.ADMIN] });
      return { userId: p.userId, assetType: AssetType.MODEL_USDZ };
    })
    .onUploadComplete(async ({ metadata, file }) => createAssetAndBackup(metadata, file)),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

**MIME validation note:** UploadThing's `image` type validates image MIME types pre-upload. `blob` accepts any file — GLB/USDZ MIME validation is best-effort (post-upload). For MVP this is acceptable since the file picker UI already filters by extension.

### Task 3: Create route handler

**File:** `src/app/api/uploadthing/route.ts`

```typescript
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({ router: ourFileRouter });
```

---

## Phase 2: Rewrite Upload Hook + Update Consumer

### Task 4: Rewrite upload hook

**File:** `src/lib/hooks/use-presigned-upload.ts`

Wrap `useUploadThing` to preserve the existing `{ upload, isUploading, error, reset }` interface:

```typescript
"use client";
import { useCallback, useState } from "react";
import { useUploadThing } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";
import { AssetType } from "@/generated/prisma/client";

type Asset = {
  id: string;
  url: string;
  key: string;
  type: AssetType;
  status: string;
  mimeType: string;
  size: number;
};

interface UsePresignedUploadReturn {
  upload: (file: File, type: AssetType) => Promise<Asset | null>;
  isUploading: boolean;
  error: string | null;
  reset: () => void;
}

export function usePresignedUpload(endpoint: keyof OurFileRouter): UsePresignedUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { startUpload } = useUploadThing(endpoint, {
    onUploadProgress: () => setIsUploading(true),
    onClientUploadComplete: () => setIsUploading(false),
    onUploadError: (e) => {
      setError(e.message);
      setIsUploading(false);
    },
  });

  const upload = useCallback(async (file: File, _type: AssetType): Promise<Asset | null> => {
    setIsUploading(true);
    setError(null);
    try {
      const result = await startUpload([file]);
      const asset = result?.[0]?.serverData?.asset ?? null;
      return asset;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      return null;
    } finally {
      setIsUploading(false);
    }
  }, [startUpload]);

  const reset = useCallback(() => {
    setError(null);
    setIsUploading(false);
  }, []);

  return { upload, isUploading, error, reset };
}
```

### Task 5: Update TasksClient

**File:** `src/app/tasks/TasksClient.tsx` — 3 lines change:

| Line | Before | After |
|---|---|---|
| 133 | `const { upload: uploadGlb, ... } = usePresignedUpload();` | `const { upload: uploadGlb, ... } = usePresignedUpload("modelGlbUploader");` |
| 134 | `const { upload: uploadUsdz, ... } = usePresignedUpload();` | `const { upload: uploadUsdz, ... } = usePresignedUpload("modelUsdzUploader");` |
| 142 | `const { upload: uploadFile, ... } = usePresignedUpload();` | `const { upload: uploadFile, ... } = usePresignedUpload("referenceImageUploader");` |

All `uploadFile(file, "REFERENCE_IMAGE")`, `uploadGlb(file, "MODEL_GLB")`, `uploadUsdz(file, "MODEL_USDZ")` calls stay unchanged.

---

## Phase 3: Remove Old Storage Code

### Task 6: Delete old upload routes + adapter

- Delete `src/app/api/upload/presign/route.ts`
- Delete `src/app/api/upload/confirm/route.ts`
- Delete `src/lib/storage/s3-adapter.ts`

### Task 7: Update storage barrel

**File:** `src/lib/storage/index.ts`

```typescript
export { gdriveAdapter } from "./gdrive-adapter"
export type { BackupAdapter, PresignedUploadResult, ConfirmUploadResult } from "./types"
```

Remove `s3Adapter` export. Keep `gdriveAdapter` and type exports.

---

## Phase 4: Update Config Files

### Task 8: Update `.env.example`

Replace:
```
# Filebase — File storage (required)
FILEBASE_ACCESS_KEY_ID="<your-filebase-access-key-id>"
FILEBASE_SECRET_ACCESS_KEY="<your-filebase-secret-access-key>"
FILEBASE_BUCKET_NAME="studiov-assets"
FILEBASE_PUBLIC_URL="https://studiov-assets.s3.filebase.io"
```

With:
```
# UploadThing — File storage (required)
# Get from https://uploadthing.com/dashboard → API Keys
UPLOADTHING_TOKEN="<your-uploadthing-token>"
```

### Task 9: Update `next.config.mjs`

```js
{
  protocol: 'https',
  hostname: '*.ufs.sh',
},
```

Replace `*.s3.filebase.io` entry.

### Task 10: Update `prisma/schema.prisma` (optional, cosmetic)

```
provider String @default("filebase")` → `provider String @default("uploadthing")
```

Modify the `add_asset_model` migration SQL `DEFAULT 'filebase'` → `DEFAULT 'uploadthing'`, then reset:
```bash
npx prisma migrate reset --force
npx prisma migrate dev
```

---

## Phase 5: Verify

### Task 11: Build check

```bash
npm run build
```

### Task 12: Grep audit

- Zero references to `s3Adapter`, `FILEBASE_`, `s3.filebase.io`, `r2Adapter`, `R2_`, `r2.dev` in `src/`, `.env.example`, `next.config.mjs`
- `npx prisma validate` passes

---

## Files Summary

| Action | File |
|---|---|
| **Create** | `src/app/api/uploadthing/core.ts` |
| **Create** | `src/app/api/uploadthing/route.ts` |
| **Modify** | `src/lib/hooks/use-presigned-upload.ts` (wrap useUploadThing) |
| **Modify** | `src/lib/storage/index.ts` (drop s3Adapter) |
| **Modify** | `src/app/tasks/TasksClient.tsx` (3 lines: add endpoint param) |
| **Modify** | `.env.example` (FILEBASE_* → UPLOADTHING_TOKEN) |
| **Modify** | `next.config.mjs` (*.s3.filebase.io → *.ufs.sh) |
| **Modify** | `package.json` (add uploadthing + react, remove aws-sdk) |
| **Modify** | `prisma/schema.prisma` (provider default, optional) |
| **Delete** | `src/app/api/upload/presign/route.ts` |
| **Delete** | `src/app/api/upload/confirm/route.ts` |
| **Delete** | `src/lib/storage/s3-adapter.ts` |
| **Unchanged** | All `asset.url` consumers (embed, SDK config, actions, dashboard) |
| **Unchanged** | `src/lib/storage/gdrive-adapter.ts`, `src/lib/storage/types.ts` |
| **Unchanged** | Asset model, all migrations, seed data |
