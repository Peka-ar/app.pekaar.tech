"use client";

import type { ProjectStatus } from "@/lib/enums";

export type TaskBrand = {
  id: string;
  name: string | null;
  email: string;
  role?: string;
  productCategory?: string | null;
  storefrontPlatform?: string | null;
  catalogSize?: string | null;
};

export type TaskAsset = {
  id: string;
  type: string;
  url: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: Date | string;
  updatedAt: Date | string;
};

export type RevisionRequestLite = {
  id: string;
  note: string;
  createdAt: Date | string;
  requester?: { id: string; name: string | null; email: string } | null;
};

export type TaskJob = {
  id: string;
  name: string;
  sku: string | null;
  instructions: string | null;
  dimensions: unknown;
  status: ProjectStatus;
  assets: TaskAsset[];
  createdAt: Date | string;
  brand: TaskBrand;
  referenceUrls: string[];
  assetUrls: { glb: string; usdz?: string } | null;
  archivedAssetUrls?: { glb: TaskAsset[]; usdz: TaskAsset[] };
  revisionRequests?: RevisionRequestLite[];
  generationMode: string | null;
  generationStatus: string | null;
  generationJobId: string | null;
  generationRunId: string | null;
  generationAssetId: string | null;
  generationError: string | null;
  generationViews: Record<string, string> | null;
  generationStartedAt: string | null;
  generationCompletedAt: string | null;
};

export type TaskDimensions = {
  width?: number;
  height?: number;
  depth?: number;
  length?: number;
  unit?: string;
};

export function getThumbnail(project: TaskJob): string {
  const ref = project.assets?.find((a) => a.type === "REFERENCE_IMAGE");
  return ref ? `/api/v1/assets/${ref.id}/file` : "";
}

export function getSku(project: TaskJob): string {
  return project.sku || "No SKU";
}

export function getInitials(name: string): string {
  if (!name || name === "Unassigned") return "UN";
  return name.slice(0, 2).toUpperCase();
}

export function getCreatedDate(project: TaskJob): string {
  return new Date(project.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export function getDimensions(project: TaskJob): TaskDimensions {
  if (project.dimensions && typeof project.dimensions === "object") {
    return project.dimensions as TaskDimensions;
  }
  return {};
}

export function getReferenceAssets(project: TaskJob): TaskAsset[] {
  return (project.assets || []).filter((a) => a.type === "REFERENCE_IMAGE");
}

export function formatRelativeShort(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
}

export function getLatestModelUpdatedAt(project: TaskJob): Date | string | null {
  const readyModels = (project.assets || []).filter(
    (a) => a.status === "READY" && (a.type === "MODEL_GLB" || a.type === "MODEL_USDZ")
  );
  if (readyModels.length === 0) return null;
  return readyModels.reduce((latest, a) =>
    new Date(a.updatedAt).getTime() > new Date(latest.updatedAt).getTime() ? a : latest
  ).updatedAt;
}

export function formatFileSize(bytes: number): string {
  if (!bytes || Number.isNaN(bytes)) return "";
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
