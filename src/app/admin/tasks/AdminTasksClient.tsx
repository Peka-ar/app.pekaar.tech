"use client";
import React, { useState, useTransition, useCallback, useRef } from 'react';
import {
  MessageSquareWarning,
  X, UploadCloud, Box,
  Check, CheckCircle2, PackageCheck,
  History, RefreshCw, Loader2, ExternalLink
} from 'lucide-react';
import type { ProjectStatus } from "@/lib/enums";
import { adminSubmitProject, adminRegenerateGeneration } from "@/app/actions/admin";
import { useAppwriteUpload, type UploadedAsset } from "@/lib/use-appwrite-upload";
import { APPWRITE_MODELS_BUCKET_ID } from "@/lib/appwrite-config";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ADMIN_LABEL, PROJECT_STATUS_META } from "@/lib/status";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskColumn, type BoardColumn } from "@/components/tasks/TaskColumn";
import { TaskToolbar } from "@/components/tasks/TaskToolbar";
import { QueuedHint, StatusBanner } from "@/components/tasks/StatusBanner";
import {
  DimensionEditor,
  MetaGrid,
  MetaItem,
  ReferenceGrid,
  RevisionNotesCard,
  SectionCard,
  SectionHeading,
} from "@/components/tasks/TaskDetailParts";
import {
  formatFileSize,
  formatRelativeShort,
  getDimensions,
  getReferenceAssets,
  getSku,
  type TaskJob,
} from "@/components/tasks/types";

const COLUMNS: (BoardColumn & { id: ProjectStatus })[] = [
  { id: 'PENDING', label: 'Queued', icon: PackageCheck, headerChip: 'bg-[var(--surface-sky)] text-[var(--surface-sky-deep)]' },
  { id: 'REVISIONS', label: 'Revisions Required', icon: MessageSquareWarning, headerChip: 'bg-[var(--warning)]/20 text-[var(--warning-content)]' },
  { id: 'COMPLETED', label: 'Completed', icon: Check, headerChip: 'bg-[var(--accent-pale)] text-[var(--positive-deep)]' },
  { id: 'PUBLISHED', label: 'Live', icon: CheckCircle2, headerChip: 'bg-[var(--forest)] text-[var(--on-forest)]' },
];

const BOARD_STATUSES: ProjectStatus[] = COLUMNS.map((c) => c.id);

const EMPTY_HINTS: Record<ProjectStatus, string> = {
  PENDING: "New brand submissions appear here.",
  REVISIONS: "Projects with brand revision notes appear here.",
  COMPLETED: "Submitted models awaiting brand review.",
  PUBLISHED: "Models live on brand storefronts appear here.",
};

export default function AdminTasksClient({
  initialTasks,
}: {
  initialTasks: TaskJob[];
  principal: { userId: string; name: string | null; email: string };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [selectedTask, setSelectedTask] = useState<TaskJob | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [glbAsset, setGlbAsset] = useState<UploadedAsset | null>(null);
  const [usdzAsset, setUsdzAsset] = useState<UploadedAsset | null>(null);
  const [glbFileName, setGlbFileName] = useState<string | null>(null);
  const [usdzFileName, setUsdzFileName] = useState<string | null>(null);
  const [failedRefImages, setFailedRefImages] = useState<Set<string>>(new Set());
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const glbInputRef = useRef<HTMLInputElement>(null);
  const usdzInputRef = useRef<HTMLInputElement>(null);

  const { upload: uploadGlb, isUploading: isUploadingGlb, progress: glbProgress, error: glbError, reset: resetGlb } = useAppwriteUpload({
    bucketId: APPWRITE_MODELS_BUCKET_ID,
    maxSizeMB: 128,
    allowedExtensions: ["glb"],
  });
  const { upload: uploadUsdz, isUploading: isUploadingUsdz, progress: usdzProgress, error: usdzError, reset: resetUsdz } = useAppwriteUpload({
    bucketId: APPWRITE_MODELS_BUCKET_ID,
    maxSizeMB: 128,
    allowedExtensions: ["usdz"],
  });

  const filteredJobs = initialTasks.filter(job => {
    const matchesSearch = job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          getSku(job).toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const resetModelUploadState = () => {
    setGlbAsset(null);
    setUsdzAsset(null);
    setGlbFileName(null);
    setUsdzFileName(null);
    resetGlb();
    resetUsdz();
  };

  const openDrawer = (job: TaskJob) => {
    setSelectedTask(job);
    resetModelUploadState();
    setFailedRefImages(new Set());
    setSubmitError(null);
    setRegenerateError(null);
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedTask(null);
  };

  const refreshTasks = useCallback(() => {
    startTransition(() => { router.refresh(); });
  }, [router, startTransition]);

  const handleGlbUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setGlbFileName(file.name);
    const asset = await uploadGlb(file, "MODEL_GLB");
    if (asset) setGlbAsset(asset);
    if (e.target) e.target.value = "";
  };

  const handleUsdzUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUsdzFileName(file.name);
    const asset = await uploadUsdz(file, "MODEL_USDZ");
    if (asset) setUsdzAsset(asset);
    if (e.target) e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!selectedTask || !glbAsset) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const result = await adminSubmitProject(selectedTask.id, glbAsset.id, usdzAsset?.id);
    if (result.ok) {
      refreshTasks();
      closeDrawer();
    } else {
      setSubmitError(result.message);
    }
    setIsSubmitting(false);
  };

  const markFailed = useCallback((id: string) => {
    setFailedRefImages((prev) => { const next = new Set(prev); next.add(id); return next; });
  }, []);

  const handleRegenerate = async () => {
    if (!selectedTask) return;
    setIsRegenerating(true);
    setRegenerateError(null);
    const result = await adminRegenerateGeneration(selectedTask.id);
    if (result.ok) {
      refreshTasks();
    } else {
      setRegenerateError(result.message);
    }
    setIsRegenerating(false);
  };

  const liveGlb = selectedTask?.assets?.find((a) => a.type === 'MODEL_GLB' && a.status === 'READY');
  const liveUsdz = selectedTask?.assets?.find((a) => a.type === 'MODEL_USDZ' && a.status === 'READY');
  const archivedGlbs = selectedTask?.archivedAssetUrls?.glb ?? [];
  const archivedUsdzs = selectedTask?.archivedAssetUrls?.usdz ?? [];
  const hasArchivedModels = archivedGlbs.length + archivedUsdzs.length > 0;
  const canSubmit = selectedTask?.status === 'PENDING' || selectedTask?.status === 'REVISIONS';
  const isPublished = selectedTask?.status === 'PUBLISHED';

  return (
    <>
      <TaskToolbar
        search={searchQuery}
        onSearch={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilter={(v) => setStatusFilter(v as ProjectStatus | 'all')}
        statusOptions={BOARD_STATUSES.map((s) => ({ value: s, label: ADMIN_LABEL[s] }))}
        count={filteredJobs.length}
      />

      {filteredJobs.length === 0 ? (
        <div role="status" className="flex flex-col items-center rounded-[24px] bg-[var(--color-canvas)] px-6 py-16 text-center shadow-[var(--shadow-1)]">
          <Box className="mb-3 h-8 w-8 text-[var(--color-text-muted)]" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">No tasks found</h3>
          <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">
            {initialTasks.length === 0
              ? "New brand projects will appear here in the Queued column."
              : "Try a different search or status filter."}
          </p>
        </div>
      ) : (
        <div className="task-board pb-4 xl:[--board-h:calc(100dvh_-_190px)]">
          {COLUMNS.map(col => (
            <TaskColumn
              key={col.id}
              column={col}
              jobs={filteredJobs.filter(j => j.status === col.id)}
              getLabel={(j) => ADMIN_LABEL[j.status]}
              getMeta={(j) => `${j.brand?.name || 'Unknown Brand'} · ${getSku(j)} · ${formatRelativeShort(j.createdAt)}`}
              onOpen={openDrawer}
              emptyHint={EMPTY_HINTS[col.id]}
            />
          ))}
        </div>
      )}

      <TaskDrawer
        open={isDrawerOpen}
        onClose={closeDrawer}
        title={selectedTask ? selectedTask.name : ""}
        subtitle={selectedTask ? `${selectedTask.id} · ${getSku(selectedTask)}` : ""}
        badge={selectedTask ? (() => {
          const meta = PROJECT_STATUS_META[selectedTask.status];
          const Icon = meta.icon;
          return <Badge tone={meta.tone} icon={<Icon className="w-3 h-3" aria-hidden="true" />}>{ADMIN_LABEL[selectedTask.status]}</Badge>;
        })() : undefined}
        footer={selectedTask && canSubmit ? (
          <div className="space-y-2.5">
            {submitError && (
              <div role="alert" className="rounded-xl border border-[var(--negative)]/40 bg-[var(--negative)]/10 px-4 py-3 text-sm text-[var(--negative-deep)]">
                {submitError}
              </div>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!glbAsset || isSubmitting || isUploadingGlb || isUploadingUsdz}
              isLoading={isSubmitting}
              variant="primary"
              size="sm"
              className="w-full"
              leftIcon={<Check className="w-4 h-4" aria-hidden="true" />}
            >
              Submit for Review
            </Button>
            {!glbAsset && !isSubmitting && !isUploadingGlb && !isUploadingUsdz && (
              <p className="text-center text-xs text-[var(--color-text-muted)]">
                Upload a GLB file to enable submission.
              </p>
            )}
          </div>
        ) : undefined}
      >
        {selectedTask && (
          <div className="space-y-4">
            {selectedTask.status === 'PENDING' && <QueuedHint />}

            {selectedTask.generationMode === "FAST" && (
              <div className="rounded-xl border border-[var(--surface-sky)]/40 bg-[var(--surface-sky)]/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--surface-sky-deep)]">AI Draft</span>
                  {selectedTask.generationStatus && (
                    <Badge tone={
                      selectedTask.generationStatus === "SUCCEEDED" ? "success" :
                      selectedTask.generationStatus === "FAILED" ? "danger" : "info"
                    }>
                      {selectedTask.generationStatus}
                    </Badge>
                  )}
                </div>
                {selectedTask.generationError && (
                  <p className="mt-1 text-[10px] text-[var(--negative-deep)]">{selectedTask.generationError}</p>
                )}
                {selectedTask.generationStartedAt && (
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                    Started: {new Date(selectedTask.generationStartedAt).toLocaleString("en-US", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    {selectedTask.generationCompletedAt && ` · Finished: ${new Date(selectedTask.generationCompletedAt).toLocaleString("en-US", { year: "numeric", month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`}
                  </p>
                )}
                {(selectedTask.generationStatus === "FAILED" || selectedTask.generationStatus === "SUCCEEDED") && (
                  <div className="mt-2">
                    {regenerateError && (
                      <p role="alert" className="mb-1 text-[10px] text-[var(--negative-deep)]">{regenerateError}</p>
                    )}
                    <Button
                      onClick={handleRegenerate}
                      disabled={isRegenerating}
                      isLoading={isRegenerating}
                      variant="secondary"
                      size="sm"
                      leftIcon={<RefreshCw className="w-3 h-3" aria-hidden="true" />}
                    >
                      Regenerate
                    </Button>
                  </div>
                )}
              </div>
            )}

            {isPublished && (
              <StatusBanner
                status="PUBLISHED"
                body="This project is live on the brand's storefront. Embed links are serving this model."
              />
            )}

            {/* Project info */}
            <SectionCard>
              <SectionHeading
                icon={Box}
                iconClassName="bg-[var(--surface-sky)] text-[var(--surface-sky-deep)]"
              >
                Project Info
              </SectionHeading>
              <MetaGrid>
                <MetaItem label="Name">{selectedTask.name}</MetaItem>
                <MetaItem label="SKU">{getSku(selectedTask)}</MetaItem>
                <MetaItem label="Brand">
                  <span className="block truncate">{selectedTask.brand?.name || 'Unknown'}</span>
                  {selectedTask.brand?.email && (
                    <span className="block truncate text-xs font-normal text-[var(--color-text-muted)]">
                      {selectedTask.brand.email}
                    </span>
                  )}
                </MetaItem>
                <MetaItem label="Created">{new Date(selectedTask.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" })}</MetaItem>
              </MetaGrid>
              {selectedTask.instructions && (
                <div className="mt-4">
                  <span className="mb-1 block font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                    Additional Instructions
                  </span>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">
                    {selectedTask.instructions}
                  </p>
                </div>
              )}
              <div className="mt-4">
                <span className="mb-2 block font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Reference Images
                </span>
                <ReferenceGrid assets={getReferenceAssets(selectedTask)} failed={failedRefImages} onFail={markFailed} onPreview={(url) => window.open(url, "_blank", "noopener")} />
              </div>
            </SectionCard>

            <DimensionEditor projectId={selectedTask.id} dims={getDimensions(selectedTask)} />

            {/* Revision notes */}
            {selectedTask.status === 'REVISIONS' && (selectedTask.revisionRequests?.length ?? 0) > 0 && (
              <RevisionNotesCard items={selectedTask.revisionRequests ?? []} />
            )}

            {/* 3D upload */}
            {canSubmit && (
              <SectionCard>
                <SectionHeading
                  icon={UploadCloud}
                  iconClassName="bg-[var(--accent-pale)] text-[var(--ink-deep)]"
                >
                  3D Model Assets
                </SectionHeading>

                <div className="space-y-5">
                <div>
                  <span className="mb-2 block font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">GLB Model <span className="text-[var(--negative-deep)]">*</span></span>
                  <input type="file" accept=".glb" onChange={handleGlbUpload} className="hidden" id="glb-upload" disabled={isUploadingGlb} ref={glbInputRef} />
                  {liveGlb && !glbAsset && (
                    <div className="mb-2 flex items-center justify-between rounded-xl bg-[var(--color-canvas-soft)] p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Box className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Current</p>
                          <p className="truncate text-sm font-medium text-[var(--color-text-primary)]" title={liveGlb.originalName}>{liveGlb.originalName}</p>
                          <p className="text-[11px] tabular-nums text-[var(--color-text-muted)]">{formatFileSize(liveGlb.size)}</p>
                        </div>
                      </div>
                      <a href={`/api/v1/assets/${liveGlb.id}/file`} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--ink-deep)] hover:underline">
                        View <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                  )}
                  {glbAsset ? (
                    <div className="flex items-center justify-between rounded-xl bg-[var(--color-canvas-soft)] p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Box className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-text-muted)]">New</p>
                          <p className="truncate text-sm font-medium text-[var(--color-text-primary)]" title={glbFileName || 'GLB Model'}>{glbFileName || 'GLB Model'}</p>
                          {glbAsset.size ? <p className="text-[11px] tabular-nums text-[var(--color-text-muted)]">{formatFileSize(glbAsset.size)}</p> : null}
                        </div>
                      </div>
                      <button type="button" onClick={() => { setGlbAsset(null); setGlbFileName(null); }} aria-label="Remove new GLB file" className="shrink-0 rounded-full p-1.5 text-[var(--negative-deep)] transition-colors hover:bg-[var(--negative)]/10">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="glb-upload" className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-default)] py-5 transition-[border-color,background-color] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-canvas-soft)]">
                      {isUploadingGlb ? (
                        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" aria-hidden="true" />
                      ) : liveGlb ? (
                        <RefreshCw className="h-6 w-6 text-[var(--color-text-muted)]" aria-hidden="true" />
                      ) : (
                        <UploadCloud className="h-6 w-6 text-[var(--color-text-muted)]" aria-hidden="true" />
                      )}
                      <span className="mt-2 text-xs text-[var(--color-text-muted)]">
                        {isUploadingGlb ? 'Uploading…' : liveGlb ? 'Replace GLB file' : 'Select GLB file'}
                      </span>
                      {isUploadingGlb && (
                        <div className="mt-3 w-full px-8">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border-default)]" role="progressbar" aria-valuenow={glbProgress} aria-valuemin={0} aria-valuemax={100} aria-label="GLB upload progress">
                            <div className="h-full bg-[var(--color-text-primary)] transition-[width] duration-150 ease-out" style={{ width: `${Math.max(2, glbProgress)}%` }} />
                          </div>
                          <p className="mt-1.5 text-center font-sans text-[11px] tabular-nums text-[var(--color-text-muted)]">{glbProgress}%</p>
                        </div>
                      )}
                    </label>
                  )}
                  {glbError && <p role="alert" className="mt-1 text-xs text-[var(--negative-deep)]">{glbError}</p>}
                </div>

                <div>
                  <span className="mb-2 block font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">USDZ Model <span className="font-normal normal-case tracking-normal text-[var(--color-text-muted)]">(optional)</span></span>
                  <input type="file" accept=".usdz" onChange={handleUsdzUpload} className="hidden" id="usdz-upload" disabled={isUploadingUsdz} ref={usdzInputRef} />
                  {liveUsdz && !usdzAsset && (
                    <div className="mb-2 flex items-center justify-between rounded-xl bg-[var(--color-canvas-soft)] p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Box className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-text-muted)]">Current</p>
                          <p className="truncate text-sm font-medium text-[var(--color-text-primary)]" title={liveUsdz.originalName}>{liveUsdz.originalName}</p>
                          <p className="text-[11px] tabular-nums text-[var(--color-text-muted)]">{formatFileSize(liveUsdz.size)}</p>
                        </div>
                      </div>
                      <a href={`/api/v1/assets/${liveUsdz.id}/file`} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--ink-deep)] hover:underline">
                        View <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </a>
                    </div>
                  )}
                  {usdzAsset ? (
                    <div className="flex items-center justify-between rounded-xl bg-[var(--color-canvas-soft)] p-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Box className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                        <div className="min-w-0">
                          <p className="font-sans text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--color-text-muted)]">New</p>
                          <p className="truncate text-sm font-medium text-[var(--color-text-primary)]" title={usdzFileName || 'USDZ Model'}>{usdzFileName || 'USDZ Model'}</p>
                          {usdzAsset.size ? <p className="text-[11px] tabular-nums text-[var(--color-text-muted)]">{formatFileSize(usdzAsset.size)}</p> : null}
                        </div>
                      </div>
                      <button type="button" onClick={() => { setUsdzAsset(null); setUsdzFileName(null); }} aria-label="Remove new USDZ file" className="shrink-0 rounded-full p-1.5 text-[var(--negative-deep)] transition-colors hover:bg-[var(--negative)]/10">
                        <X className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="usdz-upload" className="flex w-full cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border-default)] py-4 transition-[border-color,background-color] hover:border-[var(--color-text-muted)] hover:bg-[var(--color-canvas-soft)]">
                      {isUploadingUsdz ? (
                        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" aria-hidden="true" />
                      ) : liveUsdz ? (
                        <RefreshCw className="h-6 w-6 text-[var(--color-text-muted)]" aria-hidden="true" />
                      ) : (
                        <UploadCloud className="h-6 w-6 text-[var(--color-text-muted)]" aria-hidden="true" />
                      )}
                      <span className="mt-2 text-xs text-[var(--color-text-muted)]">
                        {isUploadingUsdz ? 'Uploading…' : liveUsdz ? 'Replace USDZ file' : 'Select USDZ file'}
                      </span>
                      {isUploadingUsdz && (
                        <div className="mt-3 w-full px-8">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-border-default)]" role="progressbar" aria-valuenow={usdzProgress} aria-valuemin={0} aria-valuemax={100} aria-label="USDZ upload progress">
                            <div className="h-full bg-[var(--color-text-primary)] transition-[width] duration-150 ease-out" style={{ width: `${Math.max(2, usdzProgress)}%` }} />
                          </div>
                          <p className="mt-1.5 text-center font-sans text-[11px] tabular-nums text-[var(--color-text-muted)]">{usdzProgress}%</p>
                        </div>
                      )}
                    </label>
                  )}
                  {usdzError && <p role="alert" className="mt-1 text-xs text-[var(--negative-deep)]">{usdzError}</p>}
                </div>

                {hasArchivedModels && (
                  <details className="group rounded-xl bg-[var(--color-canvas-soft)] p-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between">
                      <span className="flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                        <History className="h-3.5 w-3.5" aria-hidden="true" /> Previous models ({archivedGlbs.length + archivedUsdzs.length})
                      </span>
                      <span className="font-sans text-[11px] text-[var(--color-text-muted)] group-open:hidden">Show</span>
                      <span className="hidden font-sans text-[11px] text-[var(--color-text-muted)] group-open:inline">Hide</span>
                    </summary>
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] leading-relaxed text-[var(--color-text-muted)]">
                        Earlier uploads remain available in Appwrite storage. New uploads replace the previous ones.
                      </p>
                      {[...archivedGlbs, ...archivedUsdzs].map((m) => {
                        const isGlb = m.type === 'MODEL_GLB';
                        return (
                          <div key={m.id} className="flex items-center justify-between rounded-lg bg-[var(--color-canvas)] p-2.5">
                            <div className="flex min-w-0 items-center gap-2">
                              <Box className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-medium text-[var(--color-text-primary)]" title={m.originalName}>{m.originalName}</p>
                                <p className="font-sans text-[11px] uppercase tracking-[0.1em] tabular-nums text-[var(--color-text-muted)]">
                                  {isGlb ? 'GLB' : 'USDZ'} · {formatFileSize(m.size)} · {new Date(m.updatedAt).toLocaleDateString("en-US", { year: "numeric", month: "numeric", day: "numeric" })}
                                </p>
                              </div>
                            </div>
                            <a href={`/api/v1/assets/${m.id}/file`} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--ink-deep)] hover:underline">
                              View <ExternalLink className="h-3 w-3" aria-hidden="true" />
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
                </div>
              </SectionCard>
            )}

            {selectedTask.status === 'COMPLETED' && (
              <section className="rounded-2xl border border-[var(--positive)]/40 bg-[var(--positive)]/10 p-4">
                <h3 className="flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--positive-deep)]">
                  <Check className="h-4 w-4" aria-hidden="true" /> Submitted for review
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--positive-deep)]">
                  The brand has been notified. Awaiting their decision to publish or request revisions.
                </p>
                {selectedTask.assetUrls?.glb && (
                  <a href={selectedTask.assetUrls.glb} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--positive-deep)] hover:underline">
                    View GLB <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                )}
              </section>
            )}
          </div>
        )}
      </TaskDrawer>
    </>
  );
}
