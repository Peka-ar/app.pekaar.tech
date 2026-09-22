export class Hy3dNotConfiguredError extends Error {
  constructor(message = "Hunyuan3D API not configured — set HY3D_API_TOKEN and HY3D_API_URL") {
    super(message);
    this.name = "Hy3dNotConfiguredError";
  }
}

export class Hy3dSubmissionError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "Hy3dSubmissionError";
    this.status = status;
  }
}

export class Hy3dTransientError extends Error {
  constructor(message: string, public attempt: number = 0) {
    super(message);
    this.name = "Hy3dTransientError";
  }
}

export class Hy3dExpiredError extends Error {
  constructor(jobId: string) {
    super(`Job ${jobId} unknown or results expired (artifacts remain on the Volume)`);
    this.name = "Hy3dExpiredError";
  }
}

export interface Hy3dConfig {
  baseUrl: string;
  token: string;
}

export function getHy3dConfig(fallbackIndex: 0 | 1 = 0): Hy3dConfig {
  const urls = [process.env.HY3D_API_URL, process.env.HY3D_API_URL_2];
  if (fallbackIndex === 1 && !urls[1]) {
    throw new Hy3dNotConfiguredError("HY3D_API_URL_2 not set — no fallback available");
  }
  const baseUrl = urls[fallbackIndex] || urls[0] || "";
  const token = process.env.HY3D_API_TOKEN || "";
  if (!token) throw new Hy3dNotConfiguredError();
  if (!baseUrl) throw new Hy3dNotConfiguredError("HY3D_API_URL not set");
  return { baseUrl: baseUrl.replace(/\/+$/, ""), token };
}

export interface Hy3dJobResponse {
  job_id: string;
  mode: "single" | "mv";
  models: unknown[];
  options: Record<string, unknown>;
  warnings: string[];
}

export interface Hy3dSubmitOptions {
  quality?: "balanced" | "max";
  remove_bg?: boolean;
  bake_normals?: boolean;
}

export interface Hy3dSubmitParams {
  mode: "single" | "mv";
  files: Array<{ filename: string; bytes: Uint8Array }>;
  manifest: string | null;
  options?: Hy3dSubmitOptions;
}

/**
 * Submits a generation job. Never retries — a lost response could mean the
 * request landed, and retrying would double-bill GPU time.
 */
export async function submitJob(
  config: Hy3dConfig,
  params: Hy3dSubmitParams,
): Promise<Hy3dJobResponse> {
  const formData = new FormData();
  for (const file of params.files) {
    formData.append(
      "files",
      new Blob([Buffer.from(file.bytes)], { type: "image/jpeg" }),
      file.filename,
    );
  }
  if (params.manifest) {
    formData.append("manifest", params.manifest);
  }
  const optionsPayload: Record<string, unknown> = {};
  if (params.options?.quality) optionsPayload.quality = params.options.quality;
  if (params.options?.remove_bg) optionsPayload.remove_bg = true;
  if (params.options?.bake_normals) optionsPayload.bake_normals = true;
  if (Object.keys(optionsPayload).length > 0) {
    formData.append("options", JSON.stringify(optionsPayload));
  }

  const res = await fetch(`${config.baseUrl}/jobs`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}` },
    body: formData,
  });

  if (res.status === 401) {
    throw new Hy3dSubmissionError("401 Unauthorized — check HY3D_API_TOKEN", 401);
  }
  if (res.status === 422) {
    const text = await res.text();
    throw new Hy3dSubmissionError(`Validation failed: ${text}`, 422);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "unknown error");
    throw new Hy3dSubmissionError(`Submit failed (HTTP ${res.status}): ${text}`, res.status);
  }
  return res.json() as Promise<Hy3dJobResponse>;
}

export type Hy3dPollResult =
  | { status: "running"; attempt: number }
  | {
      status: "succeeded";
      run_id: string;
      files: Array<{ path: string; mb: number }>;
      names: string[];
      bake_results?: Record<string, string>;
      elapsed_s?: number;
    }
  | { status: "failed"; error: string };

/**
 * Polls a job. Transient HTTP errors raise Hy3dTransientError — the service
 * layer leaves the project in RUNNING so the next cron/brand poll retries.
 */
export async function pollJob(config: Hy3dConfig, jobId: string): Promise<Hy3dPollResult> {
  const res = await fetch(`${config.baseUrl}/jobs/${jobId}`, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
  });

  if (res.status === 202) {
    return { status: "running", attempt: 0 };
  }
  if (res.status === 200) {
    const data = (await res.json()) as Record<string, unknown>;
    if (data.status === "succeeded") {
      return {
        status: "succeeded",
        run_id: data.run_id as string,
        files: data.files as Array<{ path: string; mb: number }>,
        names: data.names as string[],
        bake_results: data.bake_results as Record<string, string> | undefined,
        elapsed_s: data.elapsed_s as number | undefined,
      };
    }
    if (data.status === "failed") {
      return { status: "failed", error: String(data.error || "Unknown error") };
    }
    // Unknown terminal status — treat as failed
    return { status: "failed", error: `Unexpected status: ${data.status}` };
  }
  if (res.status === 401) {
    throw new Hy3dSubmissionError("401 Unauthorized — check HY3D_API_TOKEN", 401);
  }
  if (res.status === 404) {
    throw new Hy3dExpiredError(jobId);
  }
  // Transient — will retry on next poll
  throw new Hy3dTransientError(`Poll returned HTTP ${res.status}`);
}

/**
 * Downloads a single file from a completed run. Retries transient failures
 * since this is a read-only GET and won't double-bill.
 */
export async function downloadArtifact(
  config: Hy3dConfig,
  runId: string,
  path: string,
): Promise<Uint8Array> {
  const segments = path.split("/").map(encodeURIComponent).join("/");
  const url = `${config.baseUrl}/runs/${runId}/files/${segments}`;

  const MAX_ATTEMPTS = 3;
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
    if (res.ok) {
      const buf = await res.arrayBuffer();
      if (buf.byteLength === 0) {
        throw new Error(`Empty download for ${path}`);
      }
      return new Uint8Array(buf);
    }
    if (res.status === 404) {
      throw new Error(`Artifact not found: ${path}`);
    }
    lastError = new Error(`Download failed (HTTP ${res.status})`);
    // Retry on transient 5xx
    if (res.status >= 500) {
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    throw lastError;
  }
  throw lastError || new Error(`Download failed after ${MAX_ATTEMPTS} attempts`);
}

/**
 * Tries a config, falling back to the second URL on network/transient errors.
 * Submission (422/401) and expiry errors never fail over.
 */
export async function withFailover<T>(
  fn: (config: Hy3dConfig) => Promise<T>,
): Promise<T> {
  try {
    return await fn(getHy3dConfig(0));
  } catch (e) {
    if (
      e instanceof Hy3dNotConfiguredError ||
      e instanceof Hy3dSubmissionError ||
      e instanceof Hy3dExpiredError
    ) {
      throw e;
    }
    // Transient/network error — try fallback
    try {
      return await fn(getHy3dConfig(1));
    } catch (fallbackErr) {
      if (fallbackErr instanceof Hy3dNotConfiguredError) throw e;
      throw e;
    }
  }
}