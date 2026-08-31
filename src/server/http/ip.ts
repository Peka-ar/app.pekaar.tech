import { headers } from "next/headers";

/** Best-effort client IP for server actions (Vercel sets x-forwarded-for). */
export async function clientIpForAction(): Promise<string> {
  try {
    const h = await headers();
    const xff = h.get("x-forwarded-for");
    if (xff) return xff.split(",")[0]?.trim() || "unknown";
    const cf = h.get("cf-connecting-ip");
    if (cf) return cf;
  } catch {
    // headers() unavailable outside a request — degrade gracefully.
  }
  return "unknown";
}
