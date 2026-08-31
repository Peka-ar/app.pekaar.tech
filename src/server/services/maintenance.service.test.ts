import { describe, expect, it } from "vitest";
import {
  hasPublicRead,
  PUBLIC_READ_PERMISSION,
  shouldModelAssetBePublic,
} from "./maintenance.service";
import { ProjectStatus } from "@/lib/enums";

describe("maintenance.service", () => {
  describe("hasPublicRead", () => {
    it("detects read(any) among file permissions", () => {
      expect(hasPublicRead([PUBLIC_READ_PERMISSION])).toBe(true);
      expect(hasPublicRead(['write("any")', PUBLIC_READ_PERMISSION])).toBe(true);
    });

    it("returns false for empty, undefined, or non-public permission sets", () => {
      expect(hasPublicRead([])).toBe(false);
      expect(hasPublicRead(undefined)).toBe(false);
      expect(hasPublicRead(['read("user:abc123")'])).toBe(false);
      expect(hasPublicRead(['read("team:team-123")'])).toBe(false);
    });
  });

  describe("shouldModelAssetBePublic", () => {
    const published = new Set([ProjectStatus.PUBLISHED, "proj-published"]);

    it("is true only when the project is published", () => {
      expect(shouldModelAssetBePublic("proj-published", published)).toBe(true);
      expect(shouldModelAssetBePublic("proj-pending", published)).toBe(false);
    });

    it("is false for unlinked assets", () => {
      expect(shouldModelAssetBePublic(null, published)).toBe(false);
    });
  });
});
