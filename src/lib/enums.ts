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