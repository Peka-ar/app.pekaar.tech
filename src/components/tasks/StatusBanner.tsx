"use client";

import React from "react";
import { Clock, MessageSquareWarning, Eye, CheckCircle2, PackageCheck } from "lucide-react";
import type { ProjectStatus } from "@/lib/enums";
import { cn } from "@/components/ui/cn";

const BANNER: Record<ProjectStatus, { classes: string; icon: React.ElementType; title: string; body: string }> = {
  PENDING: {
    classes: "bg-[var(--surface-sky)]/40 border-[var(--surface-sky-deep)]/20 text-[var(--surface-sky-deep)]",
    icon: PackageCheck,
    title: "In the production queue",
    body: "Your project is being prepared. You will be notified when the 3D model is ready for review.",
  },
  REVISIONS: {
    classes: "bg-[var(--warning)]/15 border-[var(--warning)]/40 text-[var(--warning-content)]",
    icon: MessageSquareWarning,
    title: "Revisions in progress",
    body: "The production team is making your requested changes. You will be notified when the updated model is ready.",
  },
  COMPLETED: {
    classes: "bg-[var(--accent-pale)] border-[var(--positive)]/30 text-[var(--positive-deep)]",
    icon: Eye,
    title: "Ready for your review",
    body: "The 3D model is ready. Approve and publish, or request changes from the actions below.",
  },
  PUBLISHED: {
    classes: "bg-[var(--forest)] border-transparent text-[var(--on-forest)]",
    icon: CheckCircle2,
    title: "Live on your storefront",
    body: "This model is serving through your live embed.",
  },
};

export function StatusBanner({ status, body }: { status: ProjectStatus; body?: string }) {
  const meta = BANNER[status];
  const Icon = meta.icon;
  return (
    <div role="status" className={cn("flex items-start gap-3 rounded-2xl border p-4", meta.classes)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
      <div>
        <p className="text-sm font-semibold">{meta.title}</p>
        <p className="mt-1 text-xs leading-relaxed opacity-90">{body ?? meta.body}</p>
      </div>
    </div>
  );
}

export function QueuedHint() {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl bg-[var(--color-canvas)] p-4"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-sky)] text-[var(--surface-sky-deep)]">
        <Clock className="h-4 w-4" aria-hidden="true" />
      </span>
      <div>
        <p className="text-sm font-semibold text-[var(--color-text-primary)]">Awaiting production</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">
          This project is in the production queue. The brand will be notified when the 3D model is
          ready for review.
        </p>
      </div>
    </div>
  );
}
