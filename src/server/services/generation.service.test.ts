import { describe, expect, it } from "vitest";
import { isStaleClaim } from "./generation.service";

describe("isStaleClaim", () => {
  it("treats null/undefined claimedAt as stale (pre-deploy or crashed before write)", () => {
    expect(isStaleClaim(null)).toBe(true);
    expect(isStaleClaim(undefined)).toBe(true);
  });

  it("treats a fresh claim as not stale", () => {
    const fresh = new Date(Date.now() - 60_000).toISOString(); // 1 min ago
    expect(isStaleClaim(fresh)).toBe(false);
  });

  it("treats a claim older than 10 minutes as stale", () => {
    const old = new Date(Date.now() - 11 * 60_000).toISOString(); // 11 min ago
    expect(isStaleClaim(old)).toBe(true);
  });

  it("treats an unparseable timestamp as stale (defensive)", () => {
    expect(isStaleClaim("not-a-date")).toBe(true);
  });
});
