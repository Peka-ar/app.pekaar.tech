import { ProjectStatus } from "@/generated/prisma/client";
import { Clock, MessageSquareWarning, PackageCheck, CheckCircle2 } from "lucide-react";
import type { BadgeTone } from "@/components/ui/Badge";

type StatusMeta = { label: string; tone: BadgeTone; icon: typeof Clock };

export const PROJECT_STATUS_META: Record<ProjectStatus, StatusMeta> = {
  PENDING: { label: "Pending", tone: "neutral", icon: Clock },
  REVISIONS: { label: "Revisions", tone: "warning", icon: MessageSquareWarning },
  COMPLETED: { label: "Completed", tone: "success", icon: PackageCheck },
  PUBLISHED: { label: "Published", tone: "success", icon: CheckCircle2 },
};

export const ADMIN_LABEL: Record<ProjectStatus, string> = {
  PENDING: "Queued",
  REVISIONS: "Revisions Required",
  COMPLETED: "Completed",
  PUBLISHED: "Published",
};

export const BRAND_LABEL: Record<ProjectStatus, string> = {
  PENDING: "Processing",
  REVISIONS: "Revisions",
  COMPLETED: "Review",
  PUBLISHED: "Published",
};

export function getStatusLabel(status: ProjectStatus, role: string | null | undefined): string {
  if (role === "ADMIN") return ADMIN_LABEL[status];
  return BRAND_LABEL[status];
}
