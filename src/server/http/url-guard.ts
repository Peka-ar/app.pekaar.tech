/**
 * Guards server-side fetches of stored asset URLs (legacy external rows).
 * Blocks non-https, embedded credentials, and hostnames that are — or look
 * like — private/reserved IP ranges (cloud metadata, loopback, LAN, ULA).
 *
 * Threat model: URLs come from admin-seeded legacy rows, not end users, so a
 * literal hostname check is proportionate. Residual DNS-rebinding TOCTOU is
 * accepted and documented.
 */
export function isSafeExternalUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  let host = url.hostname.toLowerCase();
  // URL.hostname keeps brackets for IPv6 literals ("[::1]") — strip them.
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1);
  return !isPrivateOrLocalHost(host);
}

function isPrivateOrLocalHost(host: string): boolean {
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal")) return true;
  if (host === "metadata.google.internal") return true;
  // IPv4 literals
  const v4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (v4) {
    const a = Number(v4[1]);
    const b = Number(v4[2]);
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local incl. 169.254.169.254 cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  // IPv6 literals — loopback/ULA/link-local and IPv4-mapped
  if (host.includes(":")) {
    if (host === "::" || host === "::1") return true;
    if (/^f[cd]/i.test(host)) return true; // fc00::/7 unique local
    if (/^fe[89ab]/i.test(host)) return true; // fe80::/10 link local
    if (host.includes("::ffff:")) return true;
    return false;
  }
  return false;
}
