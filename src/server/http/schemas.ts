import { z } from "zod";

export const appwriteId = z
  .string()
  .min(1, "Invalid id")
  .max(36, "Invalid id")
  .regex(/^[a-zA-Z0-9._-]+$/, "Invalid id");

const REFERENCE_VIEW_TAGS = ["front", "left", "back", "right"] as const;

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
  generationMode: z.enum(["PREMIUM", "FAST"]).default("PREMIUM"),
  generationViews: z
    .partialRecord(z.enum(REFERENCE_VIEW_TAGS), appwriteId)
    .optional()
    .nullable(),
}).refine(
  (data) => {
    if (data.generationMode === "FAST") {
      return data.generationViews !== null && data.generationViews !== undefined && Object.keys(data.generationViews).length > 0;
    }
    return true;
  },
  {
    message: "At least one view (front, left, back, or right) is required for AI Draft mode",
    path: ["generationViews"],
  },
).refine(
  (data) => {
    if (data.generationMode === "FAST" && data.generationViews) {
      return "front" in data.generationViews;
    }
    return true;
  },
  {
    message: "Front view is required for AI Draft mode",
    path: ["generationViews"],
  },
);

export const updateDimensionsSchema = z.object({
  projectId: appwriteId,
  dimensions: z.object({
    width: z.number().min(1).max(1_000_000),
    height: z.number().min(1).max(1_000_000),
    depth: z.number().min(1).max(1_000_000),
    unit: z.string().min(1).max(10).default("cm"),
  }),
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
    usageLimits: z.number().min(0).max(1_000_000).optional(),
  }),
});

export const setUserStatusSchema = z.object({
  id: appwriteId,
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  reason: z.string().trim().max(500).optional(),
});

export const contactRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  email: z.string().trim().email("Enter a valid email address").max(320),
  company: z.string().trim().max(160).optional().nullable(),
  interestedTier: z.enum(["FREE", "PREMIUM", "BUSINESS", "ENTERPRISE"]),
  message: z.string().trim().min(1, "Message is required").max(2000, "Message must be 2000 characters or fewer"),
  honeypot: z.string().max(0).optional(), // must be empty
});

export const adminSetTierSchema = z.object({
  id: appwriteId,
  tier: z.enum(["FREE", "PREMIUM", "BUSINESS", "ENTERPRISE"]),
  monthlyCreditOverride: z.number().int().min(0).max(1_000_000).optional().nullable(),
});

export const contactRequestStatusSchema = z.object({
  id: appwriteId,
  status: z.enum(["NEW", "CONTACTED", "RESOLVED"]),
});

export const paginationSchema = z.object({
  page: z.number().int().min(1).max(100_000).default(1),
});
