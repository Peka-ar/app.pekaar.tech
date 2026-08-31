export const APPWRITE_ENDPOINT = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!;
export const APPWRITE_PROJECT_ID = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!;
export const SESSION_COOKIE = `appwrite-session-${APPWRITE_PROJECT_ID}`;
export const APPWRITE_DATABASE_ID = "studiov";
export const APPWRITE_USERS_TABLE_ID = "users";
export const APPWRITE_PROJECTS_TABLE_ID = "projects";
export const APPWRITE_ASSETS_TABLE_ID = "assets";
export const APPWRITE_REVISION_REQUESTS_TABLE_ID = "revision_requests";
export const APPWRITE_ANALYTICS_EVENTS_TABLE_ID = "analytics_events";
export const APPWRITE_MODELS_BUCKET_ID = "models";
export const APPWRITE_REFERENCE_IMAGES_BUCKET_ID = "reference-images";

export function buildFileUrl(bucketId: string, fileId: string): string {
  return `${APPWRITE_ENDPOINT}/storage/buckets/${bucketId}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;
}

export function bucketForAssetType(type: string): string {
  return type === "REFERENCE_IMAGE"
    ? APPWRITE_REFERENCE_IMAGES_BUCKET_ID
    : APPWRITE_MODELS_BUCKET_ID;
}

export function defaultMimeTypeForAssetType(type: string): string | null {
  if (type === "MODEL_GLB") return "model/gltf-binary";
  if (type === "MODEL_USDZ") return "model/vnd.usdz+zip";
  return null;
}