import { createHash } from "node:crypto";
import { Models } from "node-appwrite";
import { getTablesDB } from "@/server/db/client";
import { APPWRITE_DATABASE_ID } from "@/lib/appwrite-config";
import { RateLimitError } from "@/server/http/errors";
import { logger } from "@/server/logging";

export const RATE_LIMITS_TABLE_ID = "rate_limits";

export interface RateLimitRule {
  limit: number;
  windowSeconds: number;
}

const ROW_ID_LENGTH = 36;

export function rateLimitKey(route: string, identifier: string): string {
  return `${route}:${identifier}`;
}

function rowIdForKey(key: string, windowIndex: number): string {
  const hash = createHash("sha256")
    .update(`${key}:${windowIndex}`)
    .digest("hex");
  return hash.slice(0, ROW_ID_LENGTH);
}

/**
 * Fixed-window rate limit backed by the `rate_limits` TablesDB table.
 *
 * Each window gets its own row (rowId = hash(route|id|window)); the first
 * request creates the row and the rest atomically decrement `remaining`.
 * Fail-open: if the rate-limit table is unreachable the request is allowed
 * and the failure is logged (abuse prevention must not take down the app).
 * Concurrency overrun of up to ~1 request per window is accepted.
 */
export async function consumeRateLimit(key: string, rule: RateLimitRule): Promise<boolean> {
  const now = Date.now();
  const windowIndex = Math.floor(now / (rule.windowSeconds * 1000));
  const rowId = rowIdForKey(key, windowIndex);
  const windowStart = new Date(windowIndex * rule.windowSeconds * 1000).toISOString();
  const db = getTablesDB();

  try {
    await db.getRow({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: RATE_LIMITS_TABLE_ID,
      rowId,
    });
    const row = await db.decrementRowColumn<Models.Row & { remaining: number }>({
      databaseId: APPWRITE_DATABASE_ID,
      tableId: RATE_LIMITS_TABLE_ID,
      rowId,
      column: "remaining",
      value: 1,
      min: 0,
    });
    return row.remaining > 0;
    } catch {
      // Row missing (first hit in window) or transient failure — try to create it.
      try {
        await db.createRow({
          databaseId: APPWRITE_DATABASE_ID,
          tableId: RATE_LIMITS_TABLE_ID,
          rowId,
          data: { remaining: rule.limit - 1, windowStart },
        });
        return true;
      } catch {
      try {
        const row = await db.decrementRowColumn<Models.Row & { remaining: number }>({
          databaseId: APPWRITE_DATABASE_ID,
          tableId: RATE_LIMITS_TABLE_ID,
          rowId,
          column: "remaining",
          value: 1,
          min: 0,
        });
        return row.remaining > 0;
      } catch (decrementErr) {
        logger.error("rate limit backend unavailable; failing open", {
          key: rowId.slice(0, 8),
          err: decrementErr instanceof Error ? decrementErr.message : decrementErr,
        });
        return true;
      }
    }
  }
}

/** Throws RateLimitError when the budget is exhausted. */
export async function enforceRateLimit(key: string, rule: RateLimitRule): Promise<void> {
  const allowed = await consumeRateLimit(key, rule);
  if (!allowed) {
    throw new RateLimitError();
  }
}

export function clientIpFromRequest(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  const cf = request.headers.get("cf-connecting-ip");
  if (cf) return cf;
  return "unknown";
}
