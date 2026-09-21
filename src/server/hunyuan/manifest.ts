import { ReferenceView } from "@/lib/enums";

/**
 * Fixed model name used for every submission. The pipeline keys every artifact
 * by model name and derives the final GLB as `<name>_textured.glb`, so a
 * constant name keeps the download path predictable.
 */
export const MODEL_NAME = "model";

/** Canonical tag order. The API accepts any subset but `front` is required. */
export const REFERENCE_VIEW_ORDER: readonly ReferenceView[] = [
  ReferenceView.FRONT,
  ReferenceView.LEFT,
  ReferenceView.BACK,
  ReferenceView.RIGHT,
];

export const REQUIRED_VIEW: ReferenceView = ReferenceView.FRONT;
export const MIN_VIEWS = 1;
export const MAX_VIEWS = 4;

export const GENERATION_QUALITY = "balanced" as const;

export interface SubmissionFile {
  /** Remote filename; the manifest references these verbatim. */
  filename: string;
  bytes: Uint8Array;
}

export interface Submission {
  mode: "single" | "mv";
  quality: typeof GENERATION_QUALITY;
  files: SubmissionFile[];
  /** JSON-encoded manifest; null for single-view (the API infers it). */
  manifest: string | null;
}

export interface ViewInput {
  tag: ReferenceView;
  bytes: Uint8Array;
}

export function isReferenceView(value: string): value is ReferenceView {
  return (REFERENCE_VIEW_ORDER as readonly string[]).includes(value);
}

/** Orders a tag->bytes map into canonical front/left/back/right order. */
export function orderViews(views: Partial<Record<ReferenceView, Uint8Array>>): ViewInput[] {
  return REFERENCE_VIEW_ORDER.filter((tag) => views[tag] !== undefined).map((tag) => ({
    tag,
    bytes: views[tag] as Uint8Array,
  }));
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateViews(tags: string[]): ValidationResult {
  const unknown = tags.filter((t) => !isReferenceView(t));
  if (unknown.length > 0) {
    return { ok: false, reason: `Unknown view(s): ${unknown.join(", ")}` };
  }
  if (tags.length < MIN_VIEWS) {
    return { ok: false, reason: "At least the front view is required" };
  }
  if (tags.length > MAX_VIEWS) {
    return { ok: false, reason: `At most ${MAX_VIEWS} views are supported` };
  }
  if (!tags.includes(REQUIRED_VIEW)) {
    return { ok: false, reason: "The front view is required" };
  }
  return { ok: true };
}

/**
 * Builds the staged filenames + manifest for a Hunyuan3D `/jobs` submission.
 *
 * Contract (see the API's `_parse_submission`): staged basenames are
 * `<name>.<ext>` (single) and `<name>__<tag>.<ext>` (multiview), and every
 * uploaded file must be referenced exactly once by the manifest. One job is
 * one mode — mixed single/multiview is rejected by the API.
 *
 * All inputs are normalized to JPEG upstream (Appwrite `getFilePreview`), so
 * the extension is always `.jpg`.
 */
export function buildSubmission(views: ViewInput[]): Submission {
  const validation = validateViews(views.map((v) => v.tag));
  if (!validation.ok) {
    throw new Error(validation.reason);
  }

  if (views.length === 1) {
    const filename = `${MODEL_NAME}.jpg`;
    return {
      mode: "single",
      quality: GENERATION_QUALITY,
      files: [{ filename, bytes: views[0].bytes }],
      manifest: null,
    };
  }

  const files: SubmissionFile[] = [];
  const manifestViews: Record<string, string> = {};
  for (const view of orderViews(Object.fromEntries(views.map((v) => [v.tag, v.bytes])))) {
    const filename = `${MODEL_NAME}__${view.tag}.jpg`;
    files.push({ filename, bytes: view.bytes });
    manifestViews[view.tag] = filename;
  }

  return {
    mode: "mv",
    quality: GENERATION_QUALITY,
    files,
    manifest: JSON.stringify({ models: [{ name: MODEL_NAME, views: manifestViews }] }),
  };
}

/** Path of the finished model inside the run directory, relative to the output root. */
export function expectedGlbPath(runId: string, modelName: string = MODEL_NAME): string {
  return `${runId}/${modelName}_textured.glb`;
}

/**
 * Picks the textured GLB for `modelName` out of a job summary's file list.
 * Falls back to any single `_textured.glb` when the exact name is absent.
 */
export function findGlbPath(
  files: Array<{ path: string }>,
  modelName: string = MODEL_NAME,
): string | null {
  const glbs = files.filter((f) => f.path.endsWith("_textured.glb"));
  const exact = glbs.find((f) => f.path.endsWith(`/${modelName}_textured.glb`) || f.path === `${modelName}_textured.glb`);
  if (exact) return exact.path;
  return glbs.length === 1 ? glbs[0].path : null;
}