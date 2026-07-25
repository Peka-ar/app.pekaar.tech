"use client";
import { useCallback, useState } from "react";
import { useUploadThing } from "@/lib/uploadthing";
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
  progress: number;
  error: string | null;
  reset: () => void;
}

export function usePresignedUpload(endpoint: keyof OurFileRouter): UsePresignedUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const { startUpload } = useUploadThing(endpoint, {
    onUploadProgress: (p) => {
      setProgress(p);
      setIsUploading(true);
    },
    onClientUploadComplete: () => {
      setProgress(100);
      setIsUploading(false);
    },
    onUploadError: (e) => {
      setError(e.message);
      setIsUploading(false);
    },
  });

  const upload = useCallback(async (file: File, _type: AssetType): Promise<Asset | null> => {
    setIsUploading(true);
    setProgress(0);
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
    setProgress(0);
  }, []);

  return { upload, isUploading, progress, error, reset };
}
