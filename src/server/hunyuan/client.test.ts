import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  Hy3dConfig,
  Hy3dExpiredError,
  Hy3dNotConfiguredError,
  Hy3dSubmissionError,
  downloadArtifact,
  toRunRelativePath,
  hasTraversalSegments,
  isSafeToResubmit,
  isFetchAbort,
  withFailover,
} from "./client";

const config: Hy3dConfig = { baseUrl: "https://api.test", token: "tok" };
const RUN_ID = "run_20260923_070331";

describe("toRunRelativePath", () => {
  it("strips the run-id prefix from job-summary paths", () => {
    expect(toRunRelativePath(RUN_ID, `${RUN_ID}/model_textured.glb`)).toBe(
      "model_textured.glb",
    );
  });

  it("strips nested prefixed paths", () => {
    expect(toRunRelativePath(RUN_ID, `${RUN_ID}/_rmbg/model.png`)).toBe(
      "_rmbg/model.png",
    );
  });

  it("is a no-op for already run-dir-relative paths", () => {
    expect(toRunRelativePath(RUN_ID, "model_textured.glb")).toBe(
      "model_textured.glb",
    );
    expect(toRunRelativePath(RUN_ID, "_rmbg/model.png")).toBe("_rmbg/model.png");
  });

  it("does not strip a different run id", () => {
    expect(toRunRelativePath(RUN_ID, "run_19990101_000000/x.glb")).toBe(
      "run_19990101_000000/x.glb",
    );
  });

  it("normalizes duplicate slashes and a leading slash", () => {
    expect(toRunRelativePath(RUN_ID, `/${RUN_ID}//model_textured.glb`)).toBe(
      "model_textured.glb",
    );
  });
});

describe("downloadArtifact", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not double the run id in the request URL", async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200 }),
    );

    await downloadArtifact(config, RUN_ID, `${RUN_ID}/model_textured.glb`);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://api.test/runs/${RUN_ID}/files/model_textured.glb`,
    );
  });

  it("handles nested artifact paths", async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1]), { status: 200 }),
    );

    await downloadArtifact(config, RUN_ID, `${RUN_ID}/_rmbg/model.png`);

    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://api.test/runs/${RUN_ID}/files/_rmbg/model.png`,
    );
  });

  it("leaves already run-dir-relative paths untouched", async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1]), { status: 200 }),
    );

    await downloadArtifact(config, RUN_ID, "model_textured.glb");

    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://api.test/runs/${RUN_ID}/files/model_textured.glb`,
    );
  });

  it("sends the bearer token", async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array([1]), { status: 200 }),
    );

    await downloadArtifact(config, RUN_ID, `${RUN_ID}/model_textured.glb`);

    expect(fetchMock.mock.calls[0][1].headers).toEqual({
      Authorization: "Bearer tok",
    });
  });

  it("throws Artifact not found on 404 without retrying", async () => {
    fetchMock.mockResolvedValue(
      new Response("not found", { status: 404 }),
    );

    await expect(
      downloadArtifact(config, RUN_ID, `${RUN_ID}/missing.glb`),
    ).rejects.toThrow(`Artifact not found: ${RUN_ID}/missing.glb`);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries 5xx then succeeds", async () => {
    fetchMock
      .mockResolvedValueOnce(new Response("boom", { status: 503 }))
      .mockResolvedValueOnce(new Response(new Uint8Array([7]), { status: 200 }));

    const bytes = await downloadArtifact(
      config,
      RUN_ID,
      `${RUN_ID}/model_textured.glb`,
    );

    expect(bytes).toEqual(new Uint8Array([7]));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an empty download", async () => {
    fetchMock.mockResolvedValue(new Response(new Uint8Array(0), { status: 200 }));

    await expect(
      downloadArtifact(config, RUN_ID, `${RUN_ID}/model_textured.glb`),
    ).rejects.toThrow("Empty download");
  });
});

describe("withFailover", () => {
  beforeEach(() => {
    vi.stubEnv("HY3D_API_URL", "https://primary.test");
    vi.stubEnv("HY3D_API_URL_2", "https://fallback.test");
    vi.stubEnv("HY3D_API_TOKEN", "tok");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns the primary result when it succeeds", async () => {
    const out = await withFailover(async (c) => c.baseUrl);
    expect(out).toBe("https://primary.test");
  });

  it("falls back to the secondary URL on transient errors", async () => {
    const out = await withFailover(async (c) => {
      if (c.baseUrl === "https://primary.test") throw new Error("network down");
      return c.baseUrl;
    });
    expect(out).toBe("https://fallback.test");
  });

  it("never fails over on Hy3dExpiredError", async () => {
    const fn = vi.fn().mockRejectedValue(new Hy3dExpiredError("fc-x"));
    await expect(withFailover(fn)).rejects.toThrow(Hy3dExpiredError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("never fails over on Hy3dSubmissionError", async () => {
    const fn = vi.fn().mockRejectedValue(new Hy3dSubmissionError("Validation failed", 422));
    await expect(withFailover(fn)).rejects.toThrow(Hy3dSubmissionError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("respects canFailover=false for ambiguous errors (submit)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("socket hang up"));
    await expect(
      withFailover(fn, { canFailover: () => false }),
    ).rejects.toThrow("socket hang up");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("fails over when canFailover approves (connection refused)", async () => {
    const connRefused = Object.assign(new Error("fetch failed"), {
      cause: { code: "ECONNREFUSED" },
    });
    const fn = vi.fn(async (c: { baseUrl: string }) => {
      if (c.baseUrl === "https://primary.test") throw connRefused;
      return c.baseUrl;
    });
    const out = await withFailover(fn, { canFailover: isSafeToResubmit });
    expect(out).toBe("https://fallback.test");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not fail over a submit timeout (request may have landed)", async () => {
    const timeout = new DOMException("signal timed out", "TimeoutError");
    const fn = vi.fn().mockRejectedValue(timeout);
    await expect(
      withFailover(fn, { canFailover: isSafeToResubmit }),
    ).rejects.toThrow();
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("hasTraversalSegments", () => {
  it("rejects parent-directory traversal", () => {
    expect(hasTraversalSegments("../../etc/passwd")).toBe(true);
    expect(hasTraversalSegments(`${RUN_ID}/../../x.glb`)).toBe(true);
  });

  it("rejects current-directory and empty segments", () => {
    expect(hasTraversalSegments("./x.glb")).toBe(true);
    expect(hasTraversalSegments("a//b.glb")).toBe(true);
  });

  it("accepts normal run-relative paths", () => {
    expect(hasTraversalSegments("model_textured.glb")).toBe(false);
    expect(hasTraversalSegments("_rmbg/model.png")).toBe(false);
    expect(hasTraversalSegments(`${RUN_ID}/model_textured.glb`)).toBe(false);
  });
});

describe("isSafeToResubmit", () => {
  it("allows DNS and connection-refused failures", () => {
    const enotfound = Object.assign(new Error("fetch failed"), {
      cause: { code: "ENOTFOUND" },
    });
    const econnrefused = Object.assign(new Error("fetch failed"), {
      cause: { code: "ECONNREFUSED" },
    });
    expect(isSafeToResubmit(enotfound)).toBe(true);
    expect(isSafeToResubmit(econnrefused)).toBe(true);
  });

  it("rejects timeouts, resets, and API errors", () => {
    expect(isSafeToResubmit(new DOMException("aborted", "TimeoutError"))).toBe(false);
    const reset = Object.assign(new Error("fetch failed"), {
      cause: { code: "ECONNRESET" },
    });
    expect(isSafeToResubmit(reset)).toBe(false);
    expect(isSafeToResubmit(new Hy3dSubmissionError("422", 422))).toBe(false);
    expect(isSafeToResubmit(new Hy3dNotConfiguredError())).toBe(false);
    expect(isSafeToResubmit(new Error("plain network error"))).toBe(false);
  });
});

describe("isFetchAbort", () => {
  it("detects DOMException aborts", () => {
    expect(isFetchAbort(new DOMException("timed out", "TimeoutError"))).toBe(true);
    expect(isFetchAbort(new DOMException("aborted", "AbortError"))).toBe(true);
  });

  it("detects message-based aborts", () => {
    expect(isFetchAbort(new Error("This operation was aborted"))).toBe(true);
  });

  it("passes through unrelated errors", () => {
    expect(isFetchAbort(new Error("ECONNRESET"))).toBe(false);
  });
});
