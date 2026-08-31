import { describe, expect, it } from "vitest";
import { AppwriteException } from "node-appwrite";
import { isNotFoundError, mapAppwriteError } from "./errors";
import {
  AppError,
  InternalError,
  NotFoundError,
  RateLimitError,
} from "@/server/http/errors";

describe("isNotFoundError", () => {
  it("recognizes a 404 AppwriteException", () => {
    expect(isNotFoundError(new AppwriteException("not found", 404))).toBe(true);
  });

  it("recognizes a *_not_found type", () => {
    expect(isNotFoundError(new AppwriteException("missing", 0, "document_not_found"))).toBe(true);
  });

  it("rejects other errors", () => {
    expect(isNotFoundError(new AppwriteException("boom", 500))).toBe(false);
    expect(isNotFoundError(new Error("boom"))).toBe(false);
    expect(isNotFoundError(undefined)).toBe(false);
  });
});

describe("mapAppwriteError", () => {
  it("maps 404 to NotFoundError", () => {
    const err = mapAppwriteError(new AppwriteException("missing", 404));
    expect(err).toBeInstanceOf(NotFoundError);
    expect(err.code).toBe("NOT_FOUND");
  });

  it("maps 429 to RateLimitError", () => {
    const err = mapAppwriteError(new AppwriteException("too many", 429));
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.code).toBe("RATE_LIMITED");
  });

  it("maps 401 to UnauthenticatedError", () => {
    expect(mapAppwriteError(new AppwriteException("no session", 401)).code).toBe("UNAUTHENTICATED");
  });

  it("maps 403 to ForbiddenError", () => {
    expect(mapAppwriteError(new AppwriteException("no perm", 403)).code).toBe("FORBIDDEN");
  });

  it("maps 400 to ValidationError", () => {
    expect(mapAppwriteError(new AppwriteException("bad", 400)).code).toBe("VALIDATION");
  });

  it("maps 5xx to InternalError", () => {
    expect(mapAppwriteError(new AppwriteException("down", 503)).code).toBe("INTERNAL");
  });

  it("maps non-Appwrite errors to InternalError", () => {
    const err = mapAppwriteError(new TypeError("nope"));
    expect(err).toBeInstanceOf(InternalError);
    expect(err).toBeInstanceOf(AppError);
  });
});
