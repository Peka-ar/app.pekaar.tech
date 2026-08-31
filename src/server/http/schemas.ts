import { z } from "zod";

export const appwriteId = z
  .string()
  .min(1, "Invalid id")
  .max(36, "Invalid id")
  .regex(/^[a-zA-Z0-9._-]+$/, "Invalid id");

export const projectIdSchema = appwriteId;
export const assetIdSchema = appwriteId;
export const userIdSchema = appwriteId;

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const resetPasswordSchema = z.object({
  userId: appwriteId,
  secret: z.string().min(1, "Reset link is invalid or expired"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(80, "Name must be 80 characters or fewer"),
  sku: z.string().trim().max(100, "SKU must be 100 characters or fewer").optional().nullable(),
  instructions: z
    .string()
    .trim()
    .max(5000, "Instructions must be 5000 characters or fewer")
    .optional()
    .nullable(),
  dimensions: z.record(z.string(), z.unknown()).optional().nullable(),
  assetIds: z.array(appwriteId).max(50, "Too many assets"),
});

export const sendForRevisionsSchema = z.object({
  projectId: appwriteId,
  note: z.string().trim().min(1, "A note is required when requesting revisions").max(2000, "Note must be 2000 characters or fewer"),
});

export const adminSubmitSchema = z.object({
  projectId: appwriteId,
  glbAssetId: appwriteId,
  usdzAssetId: appwriteId.optional(),
});

export const recordAssetSchema = z.object({
  fileId: appwriteId,
  type: z.enum(["REFERENCE_IMAGE", "MODEL_GLB", "MODEL_USDZ"]),
});

export const sdkEventSchema = z.object({
  eventType: z.enum(["VIEW", "INTERACTION", "AR_LAUNCH"]),
  sessionId: z.string().uuid("Invalid session id"),
  projectId: appwriteId,
});

export const onboardingSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(80, "Company name must be 80 characters or fewer"),
  productCategory: z.string().trim().max(50).optional(),
  storefrontPlatform: z.string().trim().max(50).optional(),
  catalogSize: z.string().trim().max(50).optional(),
});

export const adminUserUpdateSchema = z.object({
  id: appwriteId,
  data: z.object({
    role: z.enum(["BRAND", "ADMIN"]).optional(),
    usageLimits: z.number().int().min(0).max(1_000_000).optional(),
    subscriptionTier: z.string().trim().max(50).optional(),
  }),
});

export const setUserStatusSchema = z.object({
  id: appwriteId,
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().trim().max(500).optional(),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
});
