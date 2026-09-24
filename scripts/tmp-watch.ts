import "dotenv/config";
import { getHy3dConfig, pollJob } from "../src/server/hunyuan/client";
async function main() {
  const config = getHy3dConfig(0);
  const jobId = "fc-01M38Z5EZG5P3BEVRNXCEFRGYK";
  const t0 = Date.now();
  while (Date.now() - t0 < 850_000) {
    try {
      const r = await pollJob(config, jobId);
      const elapsed = Math.round((Date.now() - t0) / 1000);
      if (r.status === "running") {
        console.log(`[${elapsed}s] still running...`);
      } else if (r.status === "succeeded") {
        console.log(`[${elapsed}s] SUCCEEDED run=${r.run_id} files=${JSON.stringify(r.files)} elapsed_s=${r.elapsed_s}`);
        return;
      } else {
        console.log(`[${elapsed}s] FAILED: ${r.error}`);
        process.exit(1);
      }
    } catch (e) {
      console.log(`poll error (will retry): ${(e as Error).message}`);
    }
    await new Promise((r) => setTimeout(r, 30_000));
  }
  console.log("watch window elapsed");
}
main().catch((e) => { console.error(e); process.exit(1); });
