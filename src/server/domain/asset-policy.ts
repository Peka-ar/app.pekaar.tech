import { AssetType } from "@/lib/enums";
import {
  APPWRITE_MODELS_BUCKET_ID,
  APPWRITE_REFERENCE_IMAGES_BUCKET_ID,
} from "@/lib/appwrite-config";

export interface AssetPolicy {
  type: AssetType;
  bucketId: string;
  maxSizeBytes: number;
  allowedExtensions: string[];
  mimeFallback: string;
}

const MB = 1024 * 1024;

export const ASSET_POLICY: Record<AssetType, AssetPolicy> = {
  [AssetType.REFERENCE_IMAGE]: {
    type: AssetType.REFERENCE_IMAGE,
    bucketId: APPWRITE_REFERENCE_IMAGES_BUCKET_ID,
    maxSizeBytes: 16 * MB,
    allowedExtensions: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
    mimeFallback: "application/octet-stream",
  },
  [AssetType.MODEL_GLB]: {
    type: AssetType.MODEL_GLB,
    bucketId: APPWRITE_MODELS_BUCKET_ID,
    maxSizeBytes: 150 * MB,
    allowedExtensions: ["glb"],
    mimeFallback: "model/gltf-binary",
  },
  [AssetType.MODEL_USDZ]: {
    type: AssetType.MODEL_USDZ,
    bucketId: APPWRITE_MODELS_BUCKET_ID,
    maxSizeBytes: 150 * MB,
    allowedExtensions: ["usdz"],
    mimeFallback: "model/vnd.usdz+zip",
  },
};

export function isAssetType(value: string): value is AssetType {
  return value in ASSET_POLICY;
}

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot === -1) return "";
  return fileName.slice(dot + 1).toLowerCase();
}

export type AssetValidationResult = { ok: true } | { ok: false; reason: string };

export function validateAssetUpload(params: {
  type: AssetType;
  fileName: string;
  sizeBytes: number;
}): AssetValidationResult {
  const policy = ASSET_POLICY[params.type];
  if (!policy) {
    return { ok: false, reason: "Unsupported asset type" };
  }
  const ext = extensionOf(params.fileName);
  if (!policy.allowedExtensions.includes(ext)) {
    return {
      ok: false,
      reason: `Invalid file type. Allowed: ${policy.allowedExtensions.join(", ")}`,
    };
  }
  if (params.sizeBytes > policy.maxSizeBytes) {
    return {
      ok: false,
      reason: `File must be ${Math.floor(policy.maxSizeBytes / MB)} MB or smaller`,
    };
  }
  return { ok: true };
}
