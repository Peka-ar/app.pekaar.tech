import { getGDriveClient } from "./gdrive-client"

export const UT_PRIMARY_TIMEOUT_MS = 8_000
export const GDRIVE_PRIMARY_TIMEOUT_MS = 2_000

export interface DeliveryTarget {
  url: string
  gdriveFileId: string | null
  mimeType: string
  originalName: string
  preferGDrive?: boolean
}

export interface DeliveryResult {
  ok: true
  body: ReadableStream<Uint8Array> | NodeJS.ReadableStream
  contentType: string
  contentLength?: number
  source: "uploadthing" | "gdrive"
}

export interface DeliveryFailure {
  ok: false
  status: 404 | 502 | 504
  error: string
}

export type DeliveryOutcome = DeliveryResult | DeliveryFailure

function composeSignals(external?: AbortSignal, timeoutMs?: number) {
  const ctrl = new AbortController()
  const timers: NodeJS.Timeout[] = []

  if (timeoutMs && timeoutMs > 0) {
    timers.push(setTimeout(() => ctrl.abort(new Error("primary-timeout")), timeoutMs))
  }

  if (external) {
    if (external.aborted) ctrl.abort(external.reason)
    else external.addEventListener("abort", () => ctrl.abort(external.reason), { once: true })
  }

  return {
    signal: ctrl.signal,
    cleanup: () => timers.forEach(clearTimeout),
  }
}

export async function deliverAsset(
  target: DeliveryTarget,
  externalSignal?: AbortSignal,
): Promise<DeliveryOutcome> {
  if (target.preferGDrive) {
    console.log(
      `[asset-delivery] ARCHIVED/legacy asset=${target.originalName} preferring GDrive over flaky UT URL`,
    )
    const gdriveOutcome = await tryGDrivePrimary(target, externalSignal)
    if (gdriveOutcome) return gdriveOutcome
    return tryUploadthing(target, externalSignal)
  }
  return tryUploadthing(target, externalSignal)
}

async function tryUploadthing(
  target: DeliveryTarget,
  externalSignal?: AbortSignal,
): Promise<DeliveryOutcome> {
  const primary = composeSignals(externalSignal, UT_PRIMARY_TIMEOUT_MS)
  try {
    let response: Response
    try {
      response = await fetch(target.url, {
        signal: primary.signal,
        redirect: "follow",
      })
    } catch (err) {
      console.warn(
        `[asset-delivery] UT fetch error for ${target.originalName}`,
        err instanceof Error ? err.message : err,
      )
      return fallbackToGDrive(target)
    }

    if (!response.ok || !response.body) {
      console.warn(
        `[asset-delivery] UT miss for ${target.originalName} status=${response.status}`,
      )
      return fallbackToGDrive(target)
    }

    const contentType = response.headers.get("content-type") ?? target.mimeType
    const lengthHeader = response.headers.get("content-length")
    const contentLength = lengthHeader ? Number(lengthHeader) : undefined

    return {
      ok: true,
      body: response.body,
      contentType,
      contentLength: Number.isFinite(contentLength) ? contentLength : undefined,
      source: "uploadthing",
    }
  } finally {
    primary.cleanup()
  }
}

async function tryGDrivePrimary(
  target: DeliveryTarget,
  externalSignal?: AbortSignal,
): Promise<DeliveryOutcome | null> {
  if (!target.gdriveFileId) {
    return { ok: false, status: 404, error: "asset unavailable" }
  }

  const drive = getGDriveClient()
  if (!drive) {
    console.error(
      `[asset-delivery] GDrive not configured; cannot serve preferGDrive asset=${target.originalName}`,
    )
    return { ok: false, status: 502, error: "backup provider not configured" }
  }

  const composed = composeSignals(externalSignal, GDRIVE_PRIMARY_TIMEOUT_MS)
  try {
    const res = await drive.files.get(
      { fileId: target.gdriveFileId, alt: "media" },
      { responseType: "stream", signal: composed.signal },
    )
    return {
      ok: true,
      body: res.data as unknown as NodeJS.ReadableStream,
      contentType: target.mimeType,
      source: "gdrive",
    }
  } catch (err) {
    console.warn(
      `[asset-delivery] GDrive primary failed for ${target.originalName}; falling back to UT`,
      err instanceof Error ? err.message : err,
    )
    return null
  } finally {
    composed.cleanup()
  }
}

async function fallbackToGDrive(target: DeliveryTarget): Promise<DeliveryOutcome> {
  if (!target.gdriveFileId) {
    return { ok: false, status: 404, error: "asset unavailable" }
  }

  const drive = getGDriveClient()
  if (!drive) {
    console.error(
      `[asset-delivery] GDrive not configured; cannot fall back for asset=${target.originalName}`,
    )
    return { ok: false, status: 502, error: "backup provider not configured" }
  }

  try {
    const res = await drive.files.get(
      { fileId: target.gdriveFileId, alt: "media" },
      { responseType: "stream" },
    )
    return {
      ok: true,
      body: res.data as unknown as NodeJS.ReadableStream,
      contentType: target.mimeType,
      source: "gdrive",
    }
  } catch (err) {
    console.error(
      `[asset-delivery] GDrive fallback failed for ${target.originalName} gdriveFileId=${target.gdriveFileId}`,
      err,
    )
    return { ok: false, status: 502, error: "asset unavailable" }
  }
}
