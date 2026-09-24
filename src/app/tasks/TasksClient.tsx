"use client";
import React, { useState, useTransition, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  Plus, UploadCloud, CheckCircle2, AlertCircle, Loader2, Ruler, Check,
  MessageSquareWarning, Edit3, Eye, Box as BoxIcon,
  X, Maximize2, Image as ImageIcon, Clock
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { ProjectStatus } from "@/lib/enums";
import type { Product } from "@/lib/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const ThreeDConfigurator = dynamic(() => import('@/components/ThreeDConfigurator'), { ssr: false });
import { createProject, brandPublishProject, brandSendForRevisions, pollGeneration, pollActiveGenerations, regenerateGeneration, deletePendingProject } from "@/app/actions/project";
import { useAppwriteUpload, type UploadedAsset } from "@/lib/use-appwrite-upload";
import { APPWRITE_REFERENCE_IMAGES_BUCKET_ID } from "@/lib/appwrite-config";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ADMIN_LABEL, BRAND_LABEL, PROJECT_STATUS_META } from "@/lib/status";
import { useMediaQuery } from "@/lib/use-media-query";
import { TaskDrawer } from "@/components/tasks/TaskDrawer";
import { TaskColumn, type BoardColumn } from "@/components/tasks/TaskColumn";
import { TaskToolbar } from "@/components/tasks/TaskToolbar";
import { StatusBanner } from "@/components/tasks/StatusBanner";
import {
  DimensionEditor,
  Lightbox,
  MetaGrid,
  MetaItem,
  ReferenceGrid,
  RevisionNotesCard,
  SectionCard,
  SectionHeading,
} from "@/components/tasks/TaskDetailParts";
import {
  formatRelativeShort,
  getCreatedDate,
  getDimensions,
  getLatestModelUpdatedAt,
  getReferenceAssets,
  getSku,
  getThumbnail,
  type TaskJob,
} from "@/components/tasks/types";

const getViewerProduct = (project: TaskJob): Product | null => {
  const glb = project.assetUrls?.glb;
  const usdz = project.assetUrls?.usdz;
  if (!glb) return null;
  const dimensions = getDimensions(project);
  return {
    id: project.id,
    name: project.name,
    category: 'Chairs',
    brand: project.brand?.name || 'Peka AR',
    price: 0,
    src: glb,
    usdz,
    thumbnail: getThumbnail(project),
    description: project.instructions || '',
    idealPhysicalDimensions: {
      width: Number(dimensions.width ?? 0),
      height: Number(dimensions.height ?? 0),
      depth: Number(dimensions.depth ?? dimensions.length ?? 0),
    },
  };
};

const COLUMNS: (BoardColumn & { id: ProjectStatus })[] = [
  { id: 'PENDING', label: 'Processing', icon: Clock, headerChip: 'bg-[var(--surface-sky)] text-[var(--surface-sky-deep)]' },
  { id: 'REVISIONS', label: 'Revisions', icon: MessageSquareWarning, headerChip: 'bg-[var(--warning)]/20 text-[var(--warning-content)]' },
  { id: 'COMPLETED', label: 'Review', icon: Eye, headerChip: 'bg-[var(--accent-pale)] text-[var(--positive-deep)]' },
  { id: 'PUBLISHED', label: 'Published', icon: CheckCircle2, headerChip: 'bg-[var(--forest)] text-[var(--on-forest)]' },
];

const BOARD_STATUSES: ProjectStatus[] = COLUMNS.map((c) => c.id);

const EMPTY_HINTS: Record<ProjectStatus, string> = {
  PENDING: "Tasks you submit appear here while in production.",
  REVISIONS: "Projects you send back for changes appear here.",
  COMPLETED: "Models ready for your review appear here.",
  PUBLISHED: "Approved models will show up here.",
};

export default function TasksClient({ initialJobs, role, autoPoll }: { initialJobs: TaskJob[], role: string, autoPoll: boolean }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [userViewMode, setUserViewMode] = useState<'board' | 'list' | null>(null);
  const viewMode = userViewMode ?? (isDesktop ? 'board' : 'list');
  const handleViewMode = (v: 'board' | 'list') => setUserViewMode(v);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [productName, setProductName] = useState('');
  const [productSku, setProductSku] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dimW, setDimW] = useState('');
  const [dimH, setDimH] = useState('');
  const [dimD, setDimD] = useState('');
  const [reviewJob, setReviewJob] = useState<TaskJob | null>(null);
  const [revisionsJob, setRevisionsJob] = useState<TaskJob | null>(null);
  const [processingJob, setProcessingJob] = useState<TaskJob | null>(null);
  const [publishedJob, setPublishedJob] = useState<TaskJob | null>(null);
  const [requestChangesNote, setRequestChangesNote] = useState('');
  const [isRequestingChanges, setIsRequestingChanges] = useState(false);
  const [showRequestChangesForm, setShowRequestChangesForm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedAssets, setUploadedAssets] = useState<UploadedAsset[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [failedRefImages, setFailedRefImages] = useState<Set<string>>(new Set());
  const [generationMode, setGenerationMode] = useState<"PREMIUM" | "FAST">("PREMIUM");
  const [viewTags, setViewTags] = useState<Record<string, string>>({});
  const [isPolling, setIsPolling] = useState(false);
  const [pollingProjectId, setPollingProjectId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // One-shot auto-poll on mount: when the server flagged non-terminal FAST
  // tasks (autoPoll), check their generation status once so the page refreshes
  // into fresh statuses without a manual Check Status click. ranRef guards
  // React StrictMode's double effect invocation in dev; polls share the same
  // 30/min rate-limit bucket as the button (one batch call = one unit).
  const autoPollRanRef = useRef(false);
  useEffect(() => {
    if (!autoPoll || autoPollRanRef.current) return;
    autoPollRanRef.current = true;
    void (async () => {
      const result = await pollActiveGenerations();
      if (result.ok && result.data.polled > 0) {
        startTransition(() => { router.refresh(); });
      }
    })();
  }, [autoPoll, router, startTransition]);

  const labelFor = useCallback((status: ProjectStatus) => (
    role === "ADMIN" ? ADMIN_LABEL[status] : BRAND_LABEL[status]
  ), [role]);

  const reviewViewerProduct = useMemo(
    () => (reviewJob ? getViewerProduct(reviewJob) : null),
    [reviewJob]
  );
  const publishedViewerProduct = useMemo(
    () => (publishedJob ? getViewerProduct(publishedJob) : null),
    [publishedJob]
  );

  const { upload: uploadFile, isUploading, error: uploadError, reset: resetUpload } = useAppwriteUpload({
    bucketId: APPWRITE_REFERENCE_IMAGES_BUCKET_ID,
    maxSizeMB: 16,
    allowedExtensions: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');

  const filteredJobs = initialJobs.filter(job => {
    const matchesSearch = job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          getSku(job).toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCardClick = (job: TaskJob) => {
    if (job.status === 'PENDING') setProcessingJob(job);
    else if (job.status === 'REVISIONS') setRevisionsJob(job);
    else if (job.status === 'COMPLETED') setReviewJob(job);
    else if (job.status === 'PUBLISHED') setPublishedJob(job);
  };

  const closeAllDrawers = () => {
    setReviewJob(null);
    setRevisionsJob(null);
    setProcessingJob(null);
    setPublishedJob(null);
    setRequestChangesNote('');
    setShowRequestChangesForm(false);
    setFailedRefImages(new Set());
    setActionError(null);
  };

  const markFailed = useCallback((id: string) => {
    setFailedRefImages((prev) => { const next = new Set(prev); next.add(id); return next; });
  }, []);

  const publishJob = async (jobId: string) => {
    if (role === "ADMIN") return;
    setIsPublishing(true);
    setActionError(null);
    const result = await brandPublishProject(jobId);
    if (result.ok) {
      startTransition(() => {
        router.refresh();
      });
      closeAllDrawers();
    } else {
      setActionError(result.message);
    }
    setIsPublishing(false);
  };

  const sendForRevisions = async (jobId: string) => {
    if (!requestChangesNote.trim()) return;
    setIsRequestingChanges(true);
    setActionError(null);
    const result = await brandSendForRevisions(jobId, requestChangesNote.trim());
    if (result.ok) {
      setRequestChangesNote('');
      setShowRequestChangesForm(false);
      startTransition(() => {
        router.refresh();
      });
      closeAllDrawers();
    } else {
      setActionError(result.message);
    }
    setIsRequestingChanges(false);
  };

  const pollJobGeneration = async (projectId: string) => {
    setIsPolling(true);
    setPollingProjectId(projectId);
    try {
      const result = await pollGeneration(projectId);
      if (result.ok) {
        startTransition(() => { router.refresh(); });
      }
    } finally {
      setIsPolling(false);
      setPollingProjectId(null);
    }
  };

  const regenerateJob = async (projectId: string) => {
    setIsPolling(true);
    setPollingProjectId(projectId);
    try {
      const result = await regenerateGeneration(projectId);
      if (result.ok) {
        startTransition(() => { router.refresh(); });
      }
    } finally {
      setIsPolling(false);
      setPollingProjectId(null);
    }
  };

  const deleteJob = async (projectId: string) => {
    if (!window.confirm("Delete this task permanently? Its reference images will be removed. Credits will not be refunded.")) return;
    setIsDeleting(true);
    setActionError(null);
    const result = await deletePendingProject(projectId);
    if (result.ok) {
      startTransition(() => { router.refresh(); });
      closeAllDrawers();
    } else {
      setActionError(result.message);
    }
    setIsDeleting(false);
  };

  const resetWizard = () => {
    setWizardStep(0);
    setProductName('');
    setProductSku('');
    setInstructions('');
    setDimW('');
    setDimH('');
    setDimD('');
    setUploadedAssets([]);
    setFormError(null);
    resetUpload();
    setUploadSuccess(false);
    setGenerationMode("PREMIUM");
    setViewTags({});
  };

  const submitNewJob = async () => {
    setFormError(null);
    if (!productName.trim()) {
      setFormError("Please enter a product name.");
      setWizardStep(0);
      return;
    }
    if (!productSku.trim()) {
      setFormError("Please enter a SKU.");
      setWizardStep(0);
      return;
    }
    if (uploadedAssets.length === 0) {
      setFormError("Please upload at least one reference image.");
      setWizardStep(2);
      return;
    }
    const width = Number(dimW || 0);
    const height = Number(dimH || 0);
    const depth = Number(dimD || 0);
    if (width <= 0 || height <= 0 || depth <= 0) {
      setFormError("Please enter valid dimensions (all values must be greater than 0).");
      setWizardStep(1);
      return;
    }
    if (generationMode === "FAST") {
      const tags = Object.keys(viewTags);
      if (tags.length === 0) {
        setFormError("Please tag at least one image as Front for AI pipeline mode.");
        setWizardStep(2);
        return;
      }
      if (!viewTags["front"]) {
        setFormError("Front view is required for AI pipeline mode.");
        setWizardStep(2);
        return;
      }
    }
    setIsSubmitting(true);
    const generationViews = generationMode === "FAST" ? viewTags : null;
    const result = await createProject(
      productName.trim(),
      uploadedAssets.map(a => a.id),
      productSku.trim(),
      instructions.trim() || undefined,
      { width, height, depth, unit: 'cm' },
      generationMode,
      generationViews,
    );
    if (result.ok) {
      resetWizard();
      startTransition(() => {
        router.refresh();
      });
      setIsWizardOpen(false);
    } else {
      setFormError(result.message);
    }
    setIsSubmitting(false);
  };

  const MAX_IMAGES = 5;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadedAssets.length >= MAX_IMAGES) {
      setFormError("Maximum 5 images reached.");
      return;
    }
    const asset = await uploadFile(file, "REFERENCE_IMAGE");
    if (asset) {
      setUploadedAssets((prev) => [...prev, asset]);
      setUploadSuccess(true);
      setTimeout(() => setUploadSuccess(false), 2000);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const actionButton = (
    <Button
      onClick={() => { resetWizard(); setIsWizardOpen(true); }}
      size="sm"
      leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
    >
      New Task
    </Button>
  );

  const WIZARD_STEPS = ["Details", "Dimensions", "Photos"];
  const wizardCanContinue = wizardStep === 0
    ? productName.trim().length > 0 && productSku.trim().length > 0
    : wizardStep === 1
      ? Number(dimW) > 0 && Number(dimH) > 0 && Number(dimD) > 0
      : uploadedAssets.length > 0 && (generationMode === "PREMIUM" || Object.keys(viewTags).length > 0);

  const VIEW_TAG_OPTIONS = [
    { value: "front", label: "Front", required: true },
    { value: "left", label: "Left", required: false },
    { value: "back", label: "Back", required: false },
    { value: "right", label: "Right", required: false },
  ];

  const assignViewTag = (tag: string, assetId: string) => {
    setViewTags((prev) => {
      const next = { ...prev };
      // Remove any existing assignment of this asset to another tag
      for (const [k, v] of Object.entries(next)) {
        if (v === assetId) delete next[k];
      }
      next[tag] = assetId;
      return next;
    });
  };

  const removeViewTag = (tag: string) => {
    setViewTags((prev) => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
  };

  return (
    <DashboardLayout title="Tasks Pipeline" action={role !== "ADMIN" ? actionButton : undefined}>

      <TaskToolbar
        search={searchQuery}
        onSearch={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilter={(v) => setStatusFilter(v as ProjectStatus | 'all')}
        statusOptions={BOARD_STATUSES.map((s) => ({ value: s, label: labelFor(s) }))}
        count={filteredJobs.length}
        viewMode={viewMode}
        onViewMode={handleViewMode}
      />

      {viewMode === 'board' ? (
        filteredJobs.length === 0 ? (
          <div role="status" className="flex flex-col items-center rounded-[24px] bg-[var(--color-canvas)] px-6 py-16 text-center shadow-[var(--shadow-1)]">
            <BoxIcon className="mb-3 h-8 w-8 text-[var(--color-text-muted)]" aria-hidden="true" />
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">No tasks found</h3>
            <p className="mt-1 max-w-sm text-sm text-[var(--color-text-muted)]">
              {initialJobs.length === 0
                ? "Get started by creating your first task."
                : "Try a different search or status filter."}
            </p>
            {role !== "ADMIN" && initialJobs.length === 0 && (
              <Button className="mt-4" onClick={() => { resetWizard(); setIsWizardOpen(true); }} leftIcon={<Plus className="w-4 h-4" />}>
                Create Task
              </Button>
            )}
          </div>
        ) : (
          <div className="task-board pb-4 xl:[--board-h:calc(100dvh_-_250px)]">
            {COLUMNS.map(col => (
              <TaskColumn
                key={col.id}
                column={col}
                jobs={filteredJobs.filter(j => j.status === col.id)}
                getLabel={(j) => labelFor(j.status)}
                getMeta={(j) => (
                  role === "ADMIN"
                    ? `${j.brand?.name || "Unknown Brand"} · ${getSku(j)} · ${formatRelativeShort(j.createdAt)}`
                    : `${getSku(j)} · ${formatRelativeShort(j.createdAt)}`
                )}
                onOpen={handleCardClick}
                emptyHint={EMPTY_HINTS[col.id]}
                renderAction={(job) => job.status === 'COMPLETED' ? (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setReviewJob(job)}
                    leftIcon={<Eye className="w-3.5 h-3.5" aria-hidden="true" />}
                    className="w-full"
                  >
                    Review Model
                  </Button>
                ) : undefined}
              />
            ))}
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-[24px] bg-[var(--color-canvas)]">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead className="bg-[var(--color-canvas-soft)]">
                <tr className="border-b border-[var(--color-border-default)]">
                  <th className="px-3 py-3 font-sans text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] sm:px-6 sm:py-4">Job ID</th>
                  <th className="px-3 py-3 font-sans text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] sm:px-6 sm:py-4">Product</th>
                  <th className="px-3 py-3 font-sans text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] sm:px-6 sm:py-4">Status</th>
                  <th className="hidden px-3 py-3 font-sans text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] sm:px-6 sm:py-4 md:table-cell">Created</th>
                  <th className="px-3 py-3 text-right font-sans text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] sm:px-6 sm:py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-sm text-[var(--color-text-muted)] sm:px-6 sm:py-12">
                      No tasks match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map(job => (
                    <tr key={job.id} className="transition-colors hover:bg-[var(--color-canvas-soft)]">
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <span className="rounded-md border border-[var(--color-border-default)] bg-[var(--color-canvas-soft)] px-2 py-1 font-sans text-[11px] font-medium text-[var(--color-text-primary)]">
                          {job.id.slice(0, 8)}…
                        </span>
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        <div className="flex items-center gap-3">
                          {getThumbnail(job) ? (
                            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-[var(--color-border-default)]">
                              <Image src={getThumbnail(job)} alt="" fill sizes="40px" unoptimized className="object-cover" />
                            </div>
                          ) : (
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-canvas-soft)]">
                              <BoxIcon className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-[var(--color-text-primary)]">{job.name}</div>
                            <div className="font-sans text-[10px] text-[var(--color-text-muted)]">{getSku(job)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 sm:px-6 sm:py-4">
                        {(() => {
                          const meta = PROJECT_STATUS_META[job.status];
                          const Icon = meta.icon;
                          return (
                            <Badge tone={meta.tone} icon={<Icon className="w-3 h-3" aria-hidden="true" />}>
                              {labelFor(job.status)}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="hidden px-3 py-3 font-sans text-xs text-[var(--color-text-muted)] sm:px-6 sm:py-4 md:table-cell">
                        {getCreatedDate(job)}
                      </td>
                      <td className="px-3 py-3 text-right sm:px-6 sm:py-4">
                        {job.status === 'COMPLETED' ? (
                          <Button variant="primary" size="sm" onClick={() => setReviewJob(job)}>
                            Review
                          </Button>
                        ) : job.status === 'PUBLISHED' ? (
                          <Button variant="tertiary" size="sm" onClick={() => setPublishedJob(job)}>
                            View 3D
                          </Button>
                        ) : (
                          <Button variant="tertiary" size="sm" onClick={() => handleCardClick(job)}>
                            Details
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── New Task wizard ─────────────────────────────── */}
      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title="Create New Task"
        description={`Step ${wizardStep + 1} of 3 — ${WIZARD_STEPS[wizardStep]}`}
        size="2xl"
        variant="dialog"
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {WIZARD_STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-colors ${i === wizardStep ? "w-8 bg-[var(--color-text-primary)]" : i < wizardStep ? "w-4 bg-[var(--color-text-primary)]/50" : "w-4 bg-[var(--color-border-default)]"}`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              {wizardStep > 0 ? (
                <Button variant="ghost" onClick={() => { setFormError(null); setWizardStep((s) => s - 1); }}>
                  Back
                </Button>
              ) : (
                <Button variant="ghost" onClick={() => setIsWizardOpen(false)}>
                  Cancel
                </Button>
              )}
              {wizardStep < 2 ? (
                <Button onClick={() => { setFormError(null); setWizardStep((s) => s + 1); }} disabled={!wizardCanContinue}>
                  Continue
                </Button>
              ) : (
                <Button onClick={submitNewJob} isLoading={isSubmitting} disabled={!wizardCanContinue} leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}>
                  Create Task
                </Button>
              )}
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {formError && (
            <div role="alert" className="flex items-center gap-2 rounded-xl border border-[var(--negative)]/40 bg-[var(--negative)]/10 px-4 py-3 text-[12px] text-[var(--negative-deep)]">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{formError}</span>
            </div>
          )}

          {wizardStep === 0 && (
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2 font-sans text-sm font-bold uppercase tracking-widest text-[var(--color-text-primary)]">
                <Edit3 className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" /> Product Details
              </h3>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--color-text-secondary)]" htmlFor="productName">Product Name <span className="text-[var(--negative-deep)]">*</span></label>
                <Input id="productName" type="text" required value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g. Modern Eames Chair" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--color-text-secondary)]" htmlFor="productSku">SKU <span className="text-[var(--negative-deep)]">*</span></label>
                <Input id="productSku" type="text" required value={productSku} onChange={(e) => setProductSku(e.target.value)} placeholder="e.g. CHAIR-001" />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-[var(--color-text-secondary)]" htmlFor="additionalInstructions">Additional Instructions (Optional)</label>
                <textarea
                  id="additionalInstructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="input-base h-24 w-full resize-none rounded-xl px-4 py-3 font-sans text-sm outline-none"
                  placeholder="Specific notes on material finish, stitching, hidden details…"
                />
              </div>
            </section>
          )}

          {wizardStep === 1 && (
            <section className="space-y-4">
              <h3 className="flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2 font-sans text-sm font-bold uppercase tracking-widest text-[var(--color-text-primary)]">
                <Ruler className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" /> Physical Dimensions (CM)
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)]">Required for exact 1:1 scale in AR rendering.</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]" htmlFor="dimWidth">Width</label>
                  <Input id="dimWidth" type="number" required min="1" placeholder="0.0" value={dimW} onChange={(e) => setDimW(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]" htmlFor="dimHeight">Height</label>
                  <Input id="dimHeight" type="number" required min="1" placeholder="0.0" value={dimH} onChange={(e) => setDimH(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]" htmlFor="dimDepth">Depth</label>
                  <Input id="dimDepth" type="number" required min="1" placeholder="0.0" value={dimD} onChange={(e) => setDimD(e.target.value)} />
                </div>
              </div>
            </section>
          )}

          {wizardStep === 2 && (
            <section className="space-y-4">
              <div>
                <h3 className="mb-1 flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-widest text-[var(--color-text-primary)]">
                  <UploadCloud className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" /> Reference Images
                </h3>
                <p className="mb-4 text-[11px] text-[var(--color-text-muted)]">Upload standard JPG/PNG photos from the required angles.</p>
              </div>

              {/* Mode selector */}
              <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] p-4">
                <p className="mb-3 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">Generation Mode</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setGenerationMode("PREMIUM")}
                    className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition-colors ${
                      generationMode === "PREMIUM"
                        ? "border-[var(--color-text-primary)] bg-[var(--color-text-primary)]/5"
                        : "border-[var(--color-border-default)] hover:border-[var(--color-text-primary)]/50"
                    }`}
                  >
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">Artist</span>
                    <span className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">Hand-finished by a 3D artist. 10 credits.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setGenerationMode("FAST")}
                    className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition-colors ${
                      generationMode === "FAST"
                        ? "border-[var(--color-text-primary)] bg-[var(--color-text-primary)]/5"
                        : "border-[var(--color-border-default)] hover:border-[var(--color-text-primary)]/50"
                    }`}
                  >
                    <span className="text-sm font-semibold text-[var(--color-text-primary)]">AI pipeline</span>
                    <span className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">AI-generated 3D model (~5-10 min). 2 credits.</span>
                  </button>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading || uploadedAssets.length >= MAX_IMAGES}
                aria-label="Upload reference image"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || uploadedAssets.length >= MAX_IMAGES}
                className="flex w-full flex-col items-center gap-3 rounded-xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-canvas)] py-6 text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-[var(--color-border-default)] disabled:hover:text-[var(--color-text-muted)]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-6 w-6 animate-spin" aria-hidden="true" />
                    <span className="text-[12px] font-medium">Uploading…</span>
                  </>
                ) : uploadedAssets.length >= MAX_IMAGES ? (
                  <>
                    <ImageIcon className="h-6 w-6" aria-hidden="true" />
                    <span className="text-[12px] font-medium">Maximum 5 images reached</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6" aria-hidden="true" />
                    <div className="text-center">
                      <span className="text-[12px] font-medium">Select Image</span>
                      <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">JPG, PNG, WebP · max 16MB · {uploadedAssets.length}/{MAX_IMAGES}</p>
                    </div>
                  </>
                )}
              </button>
              {uploadError && (
                <div role="alert" className="flex items-center gap-2 rounded-xl border border-[var(--negative)]/40 bg-[var(--negative)]/10 px-3 py-2 font-sans text-[11px] text-[var(--negative-deep)]">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>{uploadError}</span>
                </div>
              )}
              {uploadSuccess && (
                <div role="status" className="flex items-center gap-2 rounded-xl border border-[var(--positive)]/40 bg-[var(--positive)]/10 px-3 py-2 font-sans text-[11px] text-[var(--positive-deep)]">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>Image uploaded successfully</span>
                </div>
              )}
              {uploadedAssets.length > 0 && (
                <div>
                  <p className="mb-2 font-sans text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                    Uploaded Images ({uploadedAssets.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {uploadedAssets.map((asset, i) => (
                      <div
                        key={asset.id}
                        className="group relative h-20 w-20 cursor-pointer overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] transition-colors hover:border-[var(--color-text-primary)]"
                        onClick={() => setLightboxUrl(`/api/v1/assets/${asset.id}/file`)}
                        title="Click to enlarge"
                      >
                        <Image src={`/api/v1/assets/${asset.id}/file`} alt={`Uploaded ${i + 1}`} fill sizes="80px" unoptimized className="object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/20">
                          <Maximize2 className="h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUploadedAssets(prev => prev.filter(a => a.id !== asset.id));
                          }}
                          className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--negative)] text-white opacity-0 transition-opacity hover:bg-[var(--negative-deep)] focus:opacity-100 focus:outline-none group-hover:opacity-100"
                          aria-label="Remove image"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* View tag assignment for AI pipeline mode */}
              {generationMode === "FAST" && uploadedAssets.length > 0 && (
                <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] p-4">
                  <p className="mb-1 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                    Tag Views <span className="text-[var(--negative-deep)]">*</span>
                  </p>
                  <p className="mb-3 text-[10px] text-[var(--color-text-muted)]">
                    Assign each uploaded image to a view angle. Front is required. Best results with clear, high-quality images.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {VIEW_TAG_OPTIONS.map(({ value, label, required }) => (
                      <div key={value} className="flex min-w-0 items-center gap-3">
                        <span className="w-16 shrink-0 text-xs font-medium text-[var(--color-text-primary)]">
                          {label}{required && <span className="text-[var(--negative-deep)]"> *</span>}
                        </span>
                        <select
                          value={viewTags[value] || ""}
                          onChange={(e) => {
                            if (e.target.value) assignViewTag(value, e.target.value);
                            else removeViewTag(value);
                          }}
                          className="input-base min-w-0 flex-1 rounded-lg px-3 py-1.5 text-xs"
                        >
                          <option value="">— Select image —</option>
                          {uploadedAssets.map((asset) => {
                            const usedElsewhere = Object.entries(viewTags).some(([k, v]) => k !== value && v === asset.id);
                            return (
                              <option key={asset.id} value={asset.id} disabled={usedElsewhere}>
                                Image {uploadedAssets.indexOf(asset) + 1}{usedElsewhere ? " (assigned)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-muted)]" aria-hidden="true" />
                <p className="text-[10px] leading-relaxed text-[var(--color-text-muted)]">
                  For best results, ensure images have flat lighting (no harsh shadows) and the product is fully visible within the frame.
                </p>
              </div>
            </section>
          )}
        </div>
      </Modal>

      {/* ── Processing drawer (PENDING) ─────────────────── */}
      <TaskDrawer
        open={!!processingJob}
        onClose={() => { setProcessingJob(null); setActionError(null); }}
        title={processingJob?.name ?? ""}
        subtitle={processingJob ? `${processingJob.id} · ${getSku(processingJob)}` : ""}
        badge={processingJob ? <Badge tone="info" icon={<Clock className="w-3 h-3" aria-hidden="true" />}>{labelFor("PENDING")}</Badge> : undefined}
        footer={(() => {
          if (!processingJob) return undefined;
          const primary = processingJob.generationMode === "FAST" && processingJob.generationStatus === "FAILED" ? (
            <Button
              onClick={() => regenerateJob(processingJob.id)}
              isLoading={isPolling && pollingProjectId === processingJob.id}
              leftIcon={<Loader2 className="w-4 h-4" aria-hidden="true" />}
              className="flex-1"
            >
              Regenerate (1 credit)
            </Button>
          ) : processingJob.generationMode === "FAST" && processingJob.generationStatus !== "SUCCEEDED" ? (
            <Button
              variant="tertiary"
              onClick={() => pollJobGeneration(processingJob.id)}
              isLoading={isPolling && pollingProjectId === processingJob.id}
              leftIcon={<Loader2 className="w-4 h-4" aria-hidden="true" />}
              className="flex-1"
            >
              Check Status
            </Button>
          ) : null;
          const canDelete = role !== "ADMIN";
          if (!primary && !canDelete) return undefined;
          return (
            <div className="flex items-center gap-3">
              {canDelete && (
                <Button
                  variant="destructive"
                  onClick={() => deleteJob(processingJob.id)}
                  isLoading={isDeleting}
                  className="flex-1"
                >
                  Delete Task
                </Button>
              )}
              {primary}
            </div>
          );
        })()}
      >
        {processingJob && (
          <div className="space-y-4">
            {actionError && (
              <div role="alert" className="rounded-xl border border-[var(--negative)]/40 bg-[var(--negative)]/10 px-4 py-3 text-sm text-[var(--negative-deep)]">
                {actionError}
              </div>
            )}
            <StatusBanner status="PENDING" />
            {processingJob.generationMode === "FAST" && (
              <div className="rounded-xl border border-[var(--surface-sky)]/40 bg-[var(--surface-sky)]/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[var(--surface-sky-deep)]">AI pipeline</span>
                  {processingJob.generationStatus && (
                    <Badge tone={processingJob.generationStatus === "FAILED" ? "danger" : "info"}>
                      {processingJob.generationStatus}
                    </Badge>
                  )}
                </div>
                {processingJob.generationStatus === "RUNNING" && (
                  <p className="mt-1 text-[10px] text-[var(--color-text-muted)]">AI is generating your 3D model. This takes ~5-10 minutes. You can close this drawer and check back later.</p>
                )}
                {processingJob.generationStatus === "FAILED" && processingJob.generationError && (
                  <p className="mt-1 text-[10px] text-[var(--negative-deep)]">{processingJob.generationError}</p>
                )}
                {processingJob.generationStatus === "SUCCEEDED" && (
                  <p className="mt-1 text-[10px] text-[var(--positive-deep)]">Model generated successfully. Refresh to see it.</p>
                )}
              </div>
            )}
            <SectionCard>
              <SectionHeading
                icon={BoxIcon}
                iconClassName="bg-[var(--surface-sky)] text-[var(--surface-sky-deep)]"
              >
                Project Details
              </SectionHeading>
              <MetaGrid>
                <MetaItem label="Name">{processingJob.name}</MetaItem>
                <MetaItem label="SKU">{getSku(processingJob)}</MetaItem>
                <MetaItem label="Brand">{processingJob.brand?.name || "Unknown"}</MetaItem>
                <MetaItem label="Created">{getCreatedDate(processingJob)}</MetaItem>
              </MetaGrid>
              {processingJob.instructions && (
                <div className="mt-4">
                  <span className="mb-1 block font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Additional Instructions</span>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">{processingJob.instructions}</p>
                </div>
              )}
            </SectionCard>
            <DimensionEditor projectId={processingJob.id} dims={getDimensions(processingJob)} />
            <SectionCard>
              <SectionHeading
                icon={ImageIcon}
                iconClassName="bg-[var(--accent-pale)] text-[var(--ink-deep)]"
              >
                Reference Images
              </SectionHeading>
              <ReferenceGrid assets={getReferenceAssets(processingJob)} failed={failedRefImages} onFail={markFailed} onPreview={setLightboxUrl} />
            </SectionCard>
          </div>
        )}
      </TaskDrawer>

      {/* ── Revisions drawer (REVISIONS) ────────────────── */}
      <TaskDrawer
        open={!!revisionsJob}
        onClose={() => { setRevisionsJob(null); setRequestChangesNote(''); setShowRequestChangesForm(false); }}
        title={revisionsJob ? revisionsJob.name : ""}
        subtitle={revisionsJob ? `${revisionsJob.id} · ${getSku(revisionsJob)}` : ""}
        badge={revisionsJob ? <Badge tone="warning" icon={<MessageSquareWarning className="w-3 h-3" aria-hidden="true" />}>{labelFor("REVISIONS")}</Badge> : undefined}
      >
        {revisionsJob && (
          <div className="space-y-4">
            <StatusBanner status="REVISIONS" />
            {(revisionsJob.revisionRequests?.length ?? 0) > 0 && (
              <RevisionNotesCard items={revisionsJob.revisionRequests ?? []} />
            )}
            <SectionCard>
              <SectionHeading
                icon={ImageIcon}
                iconClassName="bg-[var(--accent-pale)] text-[var(--ink-deep)]"
              >
                Reference Images
              </SectionHeading>
              <ReferenceGrid assets={getReferenceAssets(revisionsJob)} failed={failedRefImages} onFail={markFailed} onPreview={setLightboxUrl} />
            </SectionCard>
            <DimensionEditor projectId={revisionsJob.id} dims={getDimensions(revisionsJob)} />
          </div>
        )}
      </TaskDrawer>

      {/* ── Review drawer (COMPLETED) ───────────────────── */}
      <TaskDrawer
        open={!!reviewJob}
        onClose={() => { setReviewJob(null); setRequestChangesNote(''); setShowRequestChangesForm(false); }}
        title={reviewJob ? reviewJob.name : ""}
        subtitle={reviewJob ? `${reviewJob.id} · ${getSku(reviewJob)}` : ""}
        badge={reviewJob ? <Badge tone="success" icon={<Eye className="w-3 h-3" aria-hidden="true" />}>{labelFor("COMPLETED")}</Badge> : undefined}
        footer={reviewJob && role !== "ADMIN" ? (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button variant="tertiary" onClick={() => setShowRequestChangesForm((v) => !v)} leftIcon={<Edit3 className="w-4 h-4" aria-hidden="true" />} className="flex-1">
              Request Changes
            </Button>
            <Button onClick={() => reviewJob && publishJob(reviewJob.id)} isLoading={isPublishing} leftIcon={<Check className="w-4 h-4" aria-hidden="true" />} className="flex-1">
              Approve & Publish
            </Button>
          </div>
        ) : undefined}
      >
        {reviewJob && (
          <div className="space-y-4">
            {actionError && (
              <div role="alert" className="rounded-xl border border-[var(--negative)]/40 bg-[var(--negative)]/10 px-4 py-3 text-sm text-[var(--negative-deep)]">
                {actionError}
              </div>
            )}
            <StatusBanner status="COMPLETED" />
            <section aria-label="3D model preview">
              {reviewViewerProduct ? (
                <>
                  <ThreeDConfigurator
                    key="review-viewer"
                    product={reviewViewerProduct}
                    heightClassName="relative w-full h-[340px] min-h-0 sm:h-[420px]"
                  />
                  {(() => {
                    const updated = getLatestModelUpdatedAt(reviewJob);
                    if (!updated) return null;
                    return (
                      <p className="mt-2 text-center font-sans text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                        Model last updated {formatRelativeShort(updated)}
                      </p>
                    );
                  })()}
                </>
              ) : (
                <SectionCard>
                  <div className="flex items-center justify-center py-10 text-sm text-[var(--color-text-muted)]">
                    No GLB asset is available for review.
                  </div>
                </SectionCard>
              )}
            </section>
            <SectionCard>
              <SectionHeading
                icon={BoxIcon}
                iconClassName="bg-[var(--surface-sky)] text-[var(--surface-sky-deep)]"
              >
                Project Details
              </SectionHeading>
              <MetaGrid>
                <MetaItem label="Name">{reviewJob.name}</MetaItem>
                <MetaItem label="SKU">{getSku(reviewJob)}</MetaItem>
                <MetaItem label="Created">{getCreatedDate(reviewJob)}</MetaItem>
                <MetaItem label="Brand">{reviewJob.brand?.name || "Unknown"}</MetaItem>
              </MetaGrid>
              {reviewJob.instructions && (
                <div className="mt-4">
                  <span className="mb-1 block font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Additional Instructions</span>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">{reviewJob.instructions}</p>
                </div>
              )}
            </SectionCard>
            <DimensionEditor projectId={reviewJob.id} dims={getDimensions(reviewJob)} />
            <SectionCard>
              <SectionHeading
                icon={ImageIcon}
                iconClassName="bg-[var(--accent-pale)] text-[var(--ink-deep)]"
              >
                Reference Images
              </SectionHeading>
              <ReferenceGrid assets={getReferenceAssets(reviewJob)} failed={failedRefImages} onFail={markFailed} onPreview={setLightboxUrl} columns={2} />
            </SectionCard>
            {role !== "ADMIN" && showRequestChangesForm && (
              <SectionCard>
                <h4 className="flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-primary)]">
                  <Edit3 className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" /> Request Changes
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">Describe what should be changed. Your note will be sent to the production team.</p>
                <textarea
                  value={requestChangesNote}
                  onChange={(e) => setRequestChangesNote(e.target.value)}
                  placeholder="e.g. The cushion is too thin — please increase the height by ~3cm."
                  className="textarea-base mt-3 h-28 w-full resize-none"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setShowRequestChangesForm(false); setRequestChangesNote(''); }}>
                    Cancel
                  </Button>
                  <Button onClick={() => reviewJob && sendForRevisions(reviewJob.id)} isLoading={isRequestingChanges} disabled={!requestChangesNote.trim()} leftIcon={<Check className="w-4 h-4" aria-hidden="true" />}>
                    Send Request
                  </Button>
                </div>
              </SectionCard>
            )}
          </div>
        )}
      </TaskDrawer>

      {/* ── Published drawer (PUBLISHED) ────────────────── */}
      <TaskDrawer
        open={!!publishedJob}
        onClose={() => { setPublishedJob(null); setRequestChangesNote(''); setShowRequestChangesForm(false); }}
        title={publishedJob?.name ?? ""}
        subtitle={publishedJob ? `${publishedJob.id} · ${getSku(publishedJob)}` : ""}
        badge={publishedJob ? <Badge tone="success" icon={<CheckCircle2 className="w-3 h-3" aria-hidden="true" />}>{labelFor("PUBLISHED")}</Badge> : undefined}
        footer={publishedJob && role !== "ADMIN" ? (
          <Button variant="tertiary" onClick={() => setShowRequestChangesForm((v) => !v)} leftIcon={<Edit3 className="w-4 h-4" aria-hidden="true" />} className="w-full">
            Send for Revisions
          </Button>
        ) : undefined}
      >
        {publishedJob && (
          <div className="space-y-4">
            {actionError && (
              <div role="alert" className="rounded-xl border border-[var(--negative)]/40 bg-[var(--negative)]/10 px-4 py-3 text-sm text-[var(--negative-deep)]">
                {actionError}
              </div>
            )}
            <StatusBanner status="PUBLISHED" />
            <section aria-label="3D model preview">
              {publishedViewerProduct ? (
                <>
                  <ThreeDConfigurator
                    key="published-viewer"
                    product={publishedViewerProduct}
                    heightClassName="relative w-full h-[340px] min-h-0 sm:h-[420px]"
                  />
                  {(() => {
                    const updated = getLatestModelUpdatedAt(publishedJob);
                    if (!updated) return null;
                    return (
                      <p className="mt-2 text-center font-sans text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                        Model last updated {formatRelativeShort(updated)}
                      </p>
                    );
                  })()}
                </>
              ) : (
                <SectionCard>
                  <div className="flex items-center justify-center py-10 text-sm text-[var(--color-text-muted)]">
                    No GLB asset is available for this project.
                  </div>
                </SectionCard>
              )}
            </section>
            <SectionCard>
              <SectionHeading
                icon={BoxIcon}
                iconClassName="bg-[var(--surface-sky)] text-[var(--surface-sky-deep)]"
              >
                Project Details
              </SectionHeading>
              <MetaGrid>
                <MetaItem label="Name">{publishedJob.name}</MetaItem>
                <MetaItem label="SKU">{getSku(publishedJob)}</MetaItem>
                <MetaItem label="Created">{getCreatedDate(publishedJob)}</MetaItem>
                <MetaItem label="Brand">{publishedJob.brand?.name || "Unknown"}</MetaItem>
              </MetaGrid>
              {publishedJob.instructions && (
                <div className="mt-4">
                  <span className="mb-1 block font-sans text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-muted)]">Additional Instructions</span>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-[var(--color-text-primary)]">{publishedJob.instructions}</p>
                </div>
              )}
            </SectionCard>
            <DimensionEditor projectId={publishedJob.id} dims={getDimensions(publishedJob)} />
            <SectionCard>
              <SectionHeading
                icon={ImageIcon}
                iconClassName="bg-[var(--accent-pale)] text-[var(--ink-deep)]"
              >
                Reference Images
              </SectionHeading>
              <ReferenceGrid assets={getReferenceAssets(publishedJob)} failed={failedRefImages} onFail={markFailed} onPreview={setLightboxUrl} columns={2} />
            </SectionCard>
            {role !== "ADMIN" && showRequestChangesForm && (
              <SectionCard>
                <h4 className="flex items-center gap-2 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-primary)]">
                  <Edit3 className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" /> Send for Revisions
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-muted)]">This will remove the model from your live embed. The production team will make the requested changes and resubmit.</p>
                <textarea
                  value={requestChangesNote}
                  onChange={(e) => setRequestChangesNote(e.target.value)}
                  placeholder="e.g. The handle is positioned too low — please adjust by 2cm."
                  className="textarea-base mt-3 h-28 w-full resize-none"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => { setShowRequestChangesForm(false); setRequestChangesNote(''); }}>
                    Cancel
                  </Button>
                  <Button onClick={() => sendForRevisions(publishedJob.id)} isLoading={isRequestingChanges} disabled={!requestChangesNote.trim()} leftIcon={<Check className="w-4 h-4" aria-hidden="true" />}>
                    Send Request
                  </Button>
                </div>
              </SectionCard>
            )}
          </div>
        )}
      </TaskDrawer>

      <Lightbox url={lightboxUrl} onClose={() => setLightboxUrl(null)} />
    </DashboardLayout>
  );
}
