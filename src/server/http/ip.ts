import { headers } from "next/headers";

/**
 * Best-effort client IP for server actions (Vercel sets x-forwarded-for).
 * Prefers Cloudflare's validated header, validates the format to prevent
 * spoofed garbage values from splitting rate-limit buckets.
 */
export async function clientIpForAction(): Promise<string> {
  try {
    const h = await headers();
    const cf = h.get("cf-connecting-ip");
    if (cf && isValidIpFormat(cf)) return cf.trim();
    const xff = h.get("x-forwarded-for");
    if (xff) {
      const first = xff.split(",")[0]?.trim();
      if (first && isValidIpFormat(first)) return first;
    }
  } catch {
    // headers() unavailable outside a request — degrade gracefully.
  }
  return "unknown";
}

/** Very lightweight IP validation (prevents spoofed garbage). */
function isValidIpFormat(ip: string): boolean {
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) {
    const parts = ip.split(".");
    return parts.every((p) => Number(p) <= 255);
  }
  if (/^[a-fA-F0-9]*:[a-fA-F0-9:]*$/.test(ip)) return true;
  return false;
}
