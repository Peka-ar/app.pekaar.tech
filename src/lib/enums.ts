export const ProjectStatus = {
  PENDING: "PENDING",
  REVISIONS: "REVISIONS",
  COMPLETED: "COMPLETED",
  PUBLISHED: "PUBLISHED",
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];

export const AssetStatus = {
  UPLOADING: "UPLOADING",
  READY: "READY",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
  DELETED: "DELETED",
} as const;
export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];

export const AssetType = {
  REFERENCE_IMAGE: "REFERENCE_IMAGE",
  MODEL_GLB: "MODEL_GLB",
  MODEL_USDZ: "MODEL_USDZ",
} as const;
export type AssetType = (typeof AssetType)[keyof typeof AssetType];

export const UserStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

export const EventType = {
  VIEW: "VIEW",
  INTERACTION: "INTERACTION",
  AR_LAUNCH: "AR_LAUNCH",
} as const;
export type EventType = (typeof EventType)[keyof typeof EventType];

export const Role = {
  BRAND: "BRAND",
  ADMIN: "ADMIN",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

/** How a project's 3D model is produced: manual artist (Premium) or the AI pipeline (Fast). */
export const GenerationMode = {
  PREMIUM: "PREMIUM",
  FAST: "FAST",
} as const;
export type GenerationMode = (typeof GenerationMode)[keyof typeof GenerationMode];

/**
 * Lifecycle of a FAST project's AI generation attempt. PREMIUM projects keep
 * this null (an admin uploads the model manually).
 */
export const GenerationStatus = {
  SUBMITTED: "SUBMITTED",
  RUNNING: "RUNNING",
  FINALIZING: "FINALIZING",
  SUCCEEDED: "SUCCEEDED",
  FAILED: "FAILED",
} as const;
export type GenerationStatus = (typeof GenerationStatus)[keyof typeof GenerationStatus];

/** Tagged reference angles accepted by the Hunyuan3D multiview pipeline. */
export const ReferenceView = {
  FRONT: "front",
  LEFT: "left",
  BACK: "back",
  RIGHT: "right",
} as const;
export type ReferenceView = (typeof ReferenceView)[keyof typeof ReferenceView];