import { describe, expect, it } from "vitest";
import {
  ASSET_POLICY,
  extensionOf,
  isAssetType,
  validateAssetUpload,
} from "./asset-policy";
import { AssetType } from "@/lib/enums";

const MB = 1024 * 1024;

describe("extensionOf", () => {
  it("extracts lowercase extension", () => {
    expect(extensionOf("photo.GLB")).toBe("glb");
    expect(extensionOf("chair.glb")).toBe("glb");
  });

  it("returns empty string when no extension", () => {
    expect(extensionOf("chair")).toBe("");
    expect(extensionOf("")).toBe("");
  });
});

describe("isAssetType", () => {
  it("accepts known asset types", () => {
    expect(isAssetType("REFERENCE_IMAGE")).toBe(true);
    expect(isAssetType("MODEL_GLB")).toBe(true);
    expect(isAssetType("MODEL_USDZ")).toBe(true);
  });

  it("rejects unknown types", () => {
    expect(isAssetType("MODEL_STL")).toBe(false);
    expect(isAssetType("")).toBe(false);
  });
});

describe("validateAssetUpload", () => {
  it("accepts a valid GLB under the size limit", () => {
    expect(
      validateAssetUpload({ type: AssetType.MODEL_GLB, fileName: "chair.glb", sizeBytes: 10 * MB }),
    ).toEqual({ ok: true });
  });

  it("rejects a wrong extension per type", () => {
    expect(
      validateAssetUpload({ type: AssetType.MODEL_GLB, fileName: "chair.usdz", sizeBytes: 1 * MB }),
    ).toEqual({ ok: false, reason: "Invalid file type. Allowed: glb" });
    expect(
      validateAssetUpload({ type: AssetType.REFERENCE_IMAGE, fileName: "photo.exe", sizeBytes: 1 * MB }),
    ).toEqual({ ok: false, reason: "Invalid file type. Allowed: jpg, jpeg, png, webp, gif, avif" });
  });

  it("rejects oversized files", () => {
    const result = validateAssetUpload({
      type: AssetType.REFERENCE_IMAGE,
      fileName: "big.png",
      sizeBytes: 17 * MB,
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(
      validateAssetUpload({
        type: AssetType.REFERENCE_IMAGE,
        fileName: "big.png",
        sizeBytes: ASSET_POLICY[AssetType.REFERENCE_IMAGE].maxSizeBytes,
      }),
    ).toEqual({ ok: true });
  });

  it("accepts jpeg alias for reference images", () => {
    expect(
      validateAssetUpload({ type: AssetType.REFERENCE_IMAGE, fileName: "a.jpeg", sizeBytes: 1 }),
    ).toEqual({ ok: true });
  });
});
