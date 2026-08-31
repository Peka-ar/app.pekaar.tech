import type { ErrorCode } from "@/server/http/errors";

/**
 * Return contract for mutating server actions. Read-only actions keep throwing
 * (pages render catch boundaries); mutations return a discriminated union so
 * client components can react to failure codes without exception plumbing.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; code: ErrorCode; message: string };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { ok: true, data };
}

export function fail<T = undefined>(code: ErrorCode, message: string): ActionResult<T> {
  return { ok: false, code, message };
}

export function isOk<T>(result: ActionResult<T>): result is { ok: true; data: T } {
  return result.ok;
}

/**
 * Runs a service call and converts thrown AppErrors into `{ ok: false }`.
 * Unexpected errors are logged and mapped to INTERNAL so call sites never
 * surface raw stack traces.
 */
export async function toActionResult<T>(run: () => Promise<T>): Promise<ActionResult<T>> {
  const { AppError } = await import("@/server/http/errors");
  const { logger } = await import("@/server/logging");
  try {
    return ok(await run());
  } catch (err) {
    if (err instanceof AppError) {
      return { ok: false, code: err.code, message: err.userMessage };
    }
    logger.error("[action] unexpected failure", {
      err: err instanceof Error ? err.message : err,
    });
    return { ok: false, code: "INTERNAL", message: "Something went wrong. Please try again." };
  }
}
