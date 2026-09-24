import { describe, expect, it } from "vitest";
import { isStaleClaim, buildFailureGuardQueries } from "./generation.service";
import { GenerationStatus } from "@/lib/enums";

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

describe("buildFailureGuardQueries", () => {
  const STATUSES = [GenerationStatus.RUNNING, GenerationStatus.SUBMITTED, GenerationStatus.FINALIZING];

  type ParsedQuery = { method: string; attribute?: string; values?: ParsedQuery[] & string[] };
  const parse = (q: string): ParsedQuery => JSON.parse(q) as ParsedQuery;

  /** Appwrite rejects or(...) with fewer than 2 conditions server-side. */
  function expectValidArity(queries: string[]) {
    for (const q of queries) {
      const parsed = parse(q);
      if (parsed.method === "or") {
        expect(parsed.values?.length ?? 0).toBeGreaterThanOrEqual(2);
      }
    }
  }

  it("uses a plain equal() for a single jobId — Query.or requires >=2 conditions (Appwrite rejects or(...))", () => {
    const queries = buildFailureGuardQueries("p1", ["fc-1"], STATUSES);
    expect(queries).toHaveLength(3);
    expect(parse(queries[0]).attribute).toBe("$id");
    // the jobId clause must NOT be or-wrapped (the live bug: every real
    // failure path passes exactly one jobId)
    expect(parse(queries[1])).toMatchObject({ method: "equal", attribute: "generationJobId", values: ["fc-1"] });
    const statusClause = parse(queries[2]);
    expect(statusClause.method).toBe("or");
    expect(statusClause.values).toHaveLength(3);
    expectValidArity(queries);
  });

  it("uses isNull() when there is no jobId (job never persisted)", () => {
    const queries = buildFailureGuardQueries("p1", [], STATUSES);
    expect(parse(queries[1])).toMatchObject({ method: "isNull", attribute: "generationJobId" });
    expectValidArity(queries);
  });

  it("or-wraps multiple jobIds (valid arity)", () => {
    const queries = buildFailureGuardQueries("p1", ["a", "b"], STATUSES);
    const jobIdClause = parse(queries[1]);
    expect(jobIdClause.method).toBe("or");
    expect(jobIdClause.values).toHaveLength(2);
    expectValidArity(queries);
  });

  it("uses a plain equal() for a single status", () => {
    const queries = buildFailureGuardQueries("p1", ["fc-1"], [GenerationStatus.FAILED]);
    expect(parse(queries[2])).toMatchObject({ method: "equal", attribute: "generationStatus" });
    expectValidArity(queries);
  });
});
