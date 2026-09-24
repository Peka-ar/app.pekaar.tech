import "dotenv/config";
import { getTablesDB } from "../src/server/db/client";
async function main() {
  const db = getTablesDB();
  const p = await db.getRow({ databaseId: "studiov", tableId: "projects", rowId: "6ab4b8fa0039dae6ca68" });
  console.log("project:", JSON.stringify({
    name: p.name, status: p.status, mode: p.generationMode, genStatus: p.generationStatus,
    jobId: p.generationJobId, runId: p.generationRunId, assetId: p.generationAssetId,
    startedAt: p.generationStartedAt, claimedAt: p.generationClaimedAt ?? null,
    creditCost: p.generationCreditCost, error: p.generationError,
  }, null, 2));
  const u = await db.getRow({ databaseId: "studiov", tableId: "users", rowId: "6a85d411001565c82d32" });
  console.log("credits:", u.usageLimits);
}
main().catch((e) => { console.error(e); process.exit(1); });
