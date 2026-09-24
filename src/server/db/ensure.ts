import { TablesDB } from "node-appwrite";
import { createAdminClient } from "@/server/appwrite";
import { APPWRITE_DATABASE_ID } from "@/lib/appwrite-config";

export const GENERATION_COLUMNS = [
  { key: "generationMode", size: 20, required: false, type: "string" as const },
  { key: "generationStatus", size: 20, required: false, type: "string" as const },
  { key: "generationJobId", size: 255, required: false, type: "string" as const },
  { key: "generationRunId", size: 255, required: false, type: "string" as const },
  { key: "generationAssetId", size: 36, required: false, type: "string" as const },
  { key: "generationError", size: 2000, required: false, type: "string" as const },
  { key: "generationViews", size: 2000, required: false, type: "string" as const },
  { key: "generationStartedAt", size: 30, required: false, type: "string" as const },
  { key: "generationCompletedAt", size: 30, required: false, type: "string" as const },
  { key: "generationCreditCost", size: 11, required: false, type: "string" as const },
  // datetime (not string) so Query.lessThan works for the stale-claim recovery guard
  { key: "generationClaimedAt", size: 30, required: false, type: "datetime" as const },
] as const;

export const GENERATION_COLUMN_KEYS = new Set(GENERATION_COLUMNS.map((c) => c.key));

export function isUnknownAttributeError(err: unknown): string | null {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = msg.match(/Unknown attribute:\s*"([^"]+)"/i) ?? msg.match(/Unknown attribute:\s*'([^']+)'/i);
  return m ? m[1] : null;
}

export function isGenerationUnknownAttributeError(err: unknown): boolean {
  const key = isUnknownAttributeError(err);
  return key !== null && GENERATION_COLUMN_KEYS.has(key as never);
}

export async function ensureGenerationColumns(tablesDB?: TablesDB): Promise<void> {
  const db = tablesDB ?? new TablesDB(createAdminClient());
  const databaseId = APPWRITE_DATABASE_ID;
  const tableId = "projects";

  let existingKeys = new Set<string>();
  try {
    const existing = await db.listColumns({ databaseId, tableId });
    existingKeys = new Set(existing.columns.map((c) => c.key));
  } catch {
    return;
  }

  for (const col of GENERATION_COLUMNS) {
    if (existingKeys.has(col.key)) continue;
    try {
      if (col.type === "datetime") {
        await db.createDatetimeColumn({ databaseId, tableId, key: col.key, required: col.required });
      } else {
        await db.createStringColumn({
          databaseId,
          tableId,
          key: col.key,
          size: col.size,
          required: col.required,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/already exists/i.test(msg) || /409/.test(msg)) continue;
      throw e;
    }
  }

  for (let i = 0; i < 20; i++) {
    try {
      const cols = await db.listColumns({ databaseId, tableId });
      const genCols = cols.columns.filter((c) => GENERATION_COLUMN_KEYS.has(c.key as never));
      if (genCols.length === GENERATION_COLUMNS.length && genCols.every((c) => c.status === "available")) return;
      if (genCols.some((c) => c.status === "failed")) {
        throw new Error(`Column creation failed: ${genCols.filter((c) => c.status === "failed").map((c) => `${c.key}:${c.error}`).join(", ")}`);
      }
    } catch {
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}
