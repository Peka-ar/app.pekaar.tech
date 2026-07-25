import { format, formatDistanceToNow } from "date-fns";

export const EMBED_LIVENESS_THRESHOLDS = {
  AMBER_DAYS: 7,
  RED_DAYS: 30,
} as const;

export type LivenessBadge = "ok" | "amber" | "red" | "never";

export function getLivenessBadge(lastEventAt: Date | null): LivenessBadge {
  if (!lastEventAt) return "never";
  const ageMs = Date.now() - lastEventAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays >= EMBED_LIVENESS_THRESHOLDS.RED_DAYS) return "red";
  if (ageDays >= EMBED_LIVENESS_THRESHOLDS.AMBER_DAYS) return "amber";
  return "ok";
}

export function formatLastSeen(lastEventAt: Date | null): string {
  if (!lastEventAt) return "Never";
  const ageMs = Date.now() - lastEventAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays <= 30) return formatDistanceToNow(lastEventAt, { addSuffix: true });
  return format(lastEventAt, "MMM d, yyyy");
}
