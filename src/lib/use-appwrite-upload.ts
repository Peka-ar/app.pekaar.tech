"use client";

import { useCallback, useState } from "react";
import { AppwriteException, ID } from "appwrite";
import { useAppwrite } from "@appwrite.io/react";
import { recordAssetUpload, type RecordedAsset } from "@/app/actions/record-asset";

export type UploadedAsset = RecordedAsset;

interface UseAppwriteUploadOptions {
  bucketId: string;
  maxSizeMB: number;
  allowedExtensions?: string[];
}

interface UseAppwriteUploadReturn {
  upload: (file: File, type: string) => Promise<UploadedAsset | null>;
  isUploading: boolean;
  progress: number;
  error: string | null;
  reset: () => void;
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot + 1).toLowerCase();
}

function friendlyMessage(err: unknown): string {
  if (err instanceof AppwriteException) {
    if (err.code === 403) return "You don't have permission to upload this file.";
    if (err.code === 413) return "File is too large for this bucket.";
    if (err.code === 429) return "Too many attempts. Please try again later.";
    if (err.code === 400) return "The bucket rejected this file. Check the file type and size.";
    return err.message || "Upload failed";
  }
  return err instanceof Error ? err.message : "Upload failed";
}

export function useAppwriteUpload({
  bucketId,
  maxSizeMB,
  allowedExtensions,
}: UseAppwriteUploadOptions): UseAppwriteUploadReturn {
  const { storage } = useAppwrite();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File, type: string): Promise<UploadedAsset | null> => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        setError(`File must be ${maxSizeMB} MB or smaller.`);
        return null;
      }
      if (allowedExtensions && allowedExtensions.length > 0 && !allowedExtensions.includes(fileExtension(file.name))) {
        setError(`Allowed extensions: ${allowedExtensions.join(", ")}`);
        return null;
      }

      setIsUploading(true);
      setProgress(0);
      setError(null);

      const fileId = ID.unique();
      try {
        await storage.createFile({
          bucketId,
          fileId,
          file,
          onProgress: (p) => setProgress(p.progress),
        });
        setProgress(100);
        const { asset } = await recordAssetUpload({ fileId, type });
        return asset;
      } catch (err) {
        try {
          await storage.deleteFile({ bucketId, fileId });
        } catch {
          // best-effort orphan cleanup
        }
        setError(friendlyMessage(err));
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [storage, bucketId, maxSizeMB, allowedExtensions],
  );

  const reset = useCallback(() => {
    setError(null);
    setIsUploading(false);
    setProgress(0);
  }, []);

  return { upload, isUploading, progress, error, reset };
}