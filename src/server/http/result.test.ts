import { describe, expect, it } from "vitest";
import { ok, fail, isOk, toActionResult } from "./result";
import {
  AppError,
  ConflictError,
  NotFoundError,
} from "./errors";

describe("result", () => {
  it("ok() produces a success result", () => {
    expect(ok()).toEqual({ ok: true, data: undefined });
    expect(ok({ id: 1 })).toEqual({ ok: true, data: { id: 1 } });
  });

  it("fail() produces a failure result", () => {
    expect(fail("NOT_FOUND", "nope")).toEqual({ ok: false, code: "NOT_FOUND", message: "nope" });
  });

  it("isOk narrows the union", () => {
    const r = ok({ id: 1 });
    expect(isOk(r)).toBe(true);
    expect(isOk(fail("INTERNAL", "x"))).toBe(false);
  });
});

describe("toActionResult", () => {
  it("wraps a successful call", async () => {
    const r = await toActionResult(async () => ({ projectId: "p1" }));
    expect(r).toEqual({ ok: true, data: { projectId: "p1" } });
  });

  it("maps AppError to its code and message", async () => {
    const r = await toActionResult(async () => {
      throw new ConflictError("Project is not in a publishable state");
    });
    expect(r).toEqual({ ok: false, code: "STATE_CONFLICT", message: "Project is not in a publishable state" });
  });

  it("maps NotFoundError to NOT_FOUND", async () => {
    const r = await toActionResult(async () => {
      throw new NotFoundError("User not found");
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.code).toBe("NOT_FOUND");
  });

  it("maps unexpected errors to INTERNAL", async () => {
    const r = await toActionResult(async () => {
      throw new TypeError("boom");
    });
    expect(r).toEqual({ ok: false, code: "INTERNAL", message: "Something went wrong. Please try again." });
  });

  it("applies the AppError userMessage override", async () => {
    const err = new AppError("INTERNAL", "technical detail", { userMessage: "Friendly message" });
    const r = await toActionResult(async () => {
      throw err;
    });
    expect(r).toEqual({ ok: false, code: "INTERNAL", message: "Friendly message" });
  });
});
