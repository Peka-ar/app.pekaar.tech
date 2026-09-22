import { AppwriteException } from "node-appwrite";
import {
  AppError,
  ForbiddenError,
  InternalError,
  NotFoundError,
  RateLimitError,
  UnauthenticatedError,
  ValidationError,
} from "@/server/http/errors";

function exceptionStatus(err: AppwriteException): number {
  const n = Number(err.code);
  return Number.isFinite(n) ? n : 0;
}

/** True when the Appwrite failure means "resource does not exist". */
export function isNotFoundError(err: unknown): boolean {
  if (err instanceof AppwriteException) {
    if (exceptionStatus(err) === 404) return true;
    const type = String(err.type ?? "");
    return type.endsWith("_not_found");
  }
  return false;
}

export function isUnknownAttributeError(err: unknown): string | null {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const m = raw.match(/Unknown attribute:\s*"([^"]+)"/i) ?? raw.match(/Unknown attribute:\s*'([^']+)'/i);
  return m ? m[1] : null;
}

const GENERATION_ATTRIBUTE_KEYS = new Set([
  "generationMode",
  "generationStatus",
  "generationJobId",
  "generationRunId",
  "generationAssetId",
  "generationError",
  "generationViews",
  "generationStartedAt",
  "generationCompletedAt",
]);

/** Maps an Appwrite SDK failure to the AppError taxonomy. */
export function mapAppwriteError(err: unknown): AppError {
  if (err instanceof AppwriteException) {
    const status = exceptionStatus(err);
    if (status === 404) return new NotFoundError("Not found", { cause: err });
    if (status === 429) return new RateLimitError(undefined, { cause: err });
    if (status === 401) return new UnauthenticatedError(undefined, { cause: err });
    if (status === 403) return new ForbiddenError(undefined, { cause: err });
    if (status === 400) {
      const unknownKey = isUnknownAttributeError(err);
      if (unknownKey) {
        if (GENERATION_ATTRIBUTE_KEYS.has(unknownKey)) {
          return new ValidationError(
            `Database schema is out of date (missing "${unknownKey}"). Run "npm run ensure-backend" and retry.`,
            { cause: err },
          );
        }
        return new ValidationError(`Invalid document structure: unknown attribute "${unknownKey}"`, { cause: err });
      }
      return new ValidationError("Invalid request", { cause: err });
    }
    return new InternalError("Appwrite request failed", { cause: err });
  }
  return new InternalError("Database request failed", { cause: err });
}
