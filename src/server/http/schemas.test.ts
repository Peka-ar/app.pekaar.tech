import { describe, expect, it } from "vitest";
import {
  createProjectSchema,
  resetPasswordSchema,
  sdkEventSchema,
  sendForRevisionsSchema,
  signupSchema,
  adminSubmitSchema,
  recordAssetSchema,
  appwriteId,
} from "./schemas";

describe("signupSchema", () => {
  it("accepts a valid signup", () => {
    expect(signupSchema.safeParse({ email: "Brand@Example.com ", password: "password123" }).success).toBe(true);
  });

  it("normalizes email to lowercase + trims", () => {
    const out = signupSchema.parse({ email: " Brand@Example.com ", password: "password123" });
    expect(out.email).toBe("brand@example.com");
  });

  it("rejects passwords shorter than 8", () => {
    const result = signupSchema.safeParse({ email: "a@b.co", password: "short" });
    expect(result.success).toBe(false);
    expect(result.success ? "" : result.error.issues[0].message).toBe("Password must be at least 8 characters");
  });

  it("rejects invalid emails", () => {
    expect(signupSchema.safeParse({ email: "not-an-email", password: "password123" }).success).toBe(false);
  });
});

describe("createProjectSchema", () => {
  it("accepts a minimal project", () => {
    const out = createProjectSchema.parse({ name: "Chair", assetIds: [] });
    expect(out.name).toBe("Chair");
  });

  it("rejects empty names", () => {
    expect(createProjectSchema.safeParse({ name: "  ", assetIds: [] }).success).toBe(false);
  });

  it("rejects more than 50 assets", () => {
    const ids = Array.from({ length: 51 }, (_, i) => `id${i}`);
    expect(createProjectSchema.safeParse({ name: "x", assetIds: ids }).success).toBe(false);
  });
});

describe("sendForRevisionsSchema", () => {
  it("requires a non-empty note", () => {
    expect(sendForRevisionsSchema.safeParse({ projectId: "abc", note: "  " }).success).toBe(false);
    expect(sendForRevisionsSchema.parse({ projectId: "abc", note: "fix it" }).note).toBe("fix it");
  });
});

describe("appwriteId", () => {
  it("rejects ids with invalid characters", () => {
    expect(appwriteId.safeParse("has space").success).toBe(false);
    expect(appwriteId.safeParse("has/slash").success).toBe(false);
  });

  it("accepts valid Appwrite ids", () => {
    expect(appwriteId.safeParse("6a8562a20037b62075e1").success).toBe(true);
    expect(appwriteId.safeParse("proj_123").success).toBe(true);
  });
});

describe("sdkEventSchema", () => {
  it("accepts a VIEW event with uuid session", () => {
    const out = sdkEventSchema.parse({
      eventType: "VIEW",
      sessionId: "5b95e2b6-3a4e-4f5a-9f2c-9b9b9b9b9b9b",
      projectId: "proj_123",
    });
    expect(out.eventType).toBe("VIEW");
  });

  it("rejects a non-uuid session id", () => {
    expect(
      sdkEventSchema.safeParse({
        eventType: "VIEW",
        sessionId: "not-a-uuid",
        projectId: "proj_123",
      }).success,
    ).toBe(false);
  });

  it("rejects unknown event types", () => {
    expect(
      sdkEventSchema.safeParse({
        eventType: "CLICK",
        sessionId: "5b95e2b6-3a4e-4f5a-9f2c-9b9b9b9b9b9b",
        projectId: "proj_123",
      }).success,
    ).toBe(false);
  });
});

describe("adminSubmitSchema", () => {
  it("accepts glb-only submission", () => {
    expect(adminSubmitSchema.safeParse({ projectId: "p1", glbAssetId: "a1" }).success).toBe(true);
  });

  it("accepts glb + usdz submission", () => {
    expect(adminSubmitSchema.safeParse({ projectId: "p1", glbAssetId: "a1", usdzAssetId: "a2" }).success).toBe(true);
  });

  it("rejects missing glb", () => {
    expect(adminSubmitSchema.safeParse({ projectId: "p1" }).success).toBe(false);
  });
});

describe("recordAssetSchema", () => {
  it("accepts a model upload", () => {
    expect(recordAssetSchema.safeParse({ fileId: "f1", type: "MODEL_GLB" }).success).toBe(true);
  });

  it("rejects unknown asset types", () => {
    expect(recordAssetSchema.safeParse({ fileId: "f1", type: "MODEL_STL" }).success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("rejects short new passwords", () => {
    const result = resetPasswordSchema.safeParse({
      userId: "u1",
      secret: "token",
      password: "tiny",
    });
    expect(result.success).toBe(false);
  });
});
