"use client";
import React, { useState, useTransition, useCallback, useRef, useMemo } from 'react';
import {
  Plus, UploadCloud, CheckCircle2, AlertCircle, Loader2, Ruler, Check,
  Search, Filter, List as ListIcon, LayoutGrid, MessageSquareWarning, Edit3, Eye, Box as BoxIcon,
  X, Maximize2, Image as ImageIcon, Clock
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import type { ProjectStatus } from "@/lib/enums";
import type { Product } from "@/lib/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const ThreeDConfigurator = dynamic(() => import('@/components/ThreeDConfigurator'), { ssr: false });
import { createProject, brandPublishProject, brandSendForRevisions } from "@/app/actions/project";
import { useAppwriteUpload, type UploadedAsset } from "@/lib/use-appwrite-upload";
import { APPWRITE_REFERENCE_IMAGES_BUCKET_ID } from "@/lib/appwrite-config";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { BRAND_LABEL, PROJECT_STATUS_META } from "@/lib/status";
import { useMediaQuery } from "@/lib/use-media-query";

type TaskBrand = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  productCategory?: string | null;
  storefrontPlatform?: string | null;
  catalogSize?: string | null;
};

type TaskAsset = {
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

type RevisionRequestLite = {
  id: string;
  note: string;
  createdAt: Date | string;
};

type TaskJob = {
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
};

const COLUMNS: { id: ProjectStatus; label: string; icon: React.ElementType }[] = [
  { id: 'PENDING', label: 'Processing', icon: Clock },
  { id: 'REVISIONS', label: 'Revisions', icon: MessageSquareWarning },
  { id: 'COMPLETED', label: 'Review', icon: Eye },
  { id: 'PUBLISHED', label: 'Published', icon: CheckCircle2 },
];

const BOARD_STATUSES: ProjectStatus[] = COLUMNS.map((c) => c.id);

const getThumbnail = (project: TaskJob) => {
  const ref = project.assets?.find((a) => a.type === 'REFERENCE_IMAGE');
  return ref ? `/api/v1/assets/${ref.id}/file` : '';
};
const getSku = (project: TaskJob) => project.sku || 'No SKU';
const getProductCategory = (project: TaskJob) => project.brand?.productCategory?.trim() || 'Not specified';
const getInitials = (name: string) => name === 'Unassigned' ? 'UN' : name.slice(0, 2).toUpperCase();
const getCreatedDate = (project: TaskJob) => new Date(project.createdAt).toLocaleDateString();
const getAssets = (project: TaskJob) => {
  const glb = project.assetUrls?.glb;
  const usdz = project.assetUrls?.usdz;
  return { glb, usdz } as { glb?: string; usdz?: string };
};
const getDimensions = (project: TaskJob) => (project.dimensions && typeof project.dimensions === 'object' ? project.dimensions : {}) as { width?: number; height?: number; depth?: number; length?: number; unit?: string };
const getViewerProduct = (project: TaskJob): Product | null => {
  const { glb, usdz } = getAssets(project);
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

const formatRelativeShort = (value: Date | string): string => {
  const date = typeof value === 'string' ? new Date(value) : value;
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString();
};

const getLatestModelUpdatedAt = (project: TaskJob): Date | string | null => {
  const readyModels = (project.assets || []).filter((a) => a.status === 'READY' && (a.type === 'MODEL_GLB' || a.type === 'MODEL_USDZ'));
  if (readyModels.length === 0) return null;
  return readyModels.reduce((latest, a) => {
    const t = new Date(a.updatedAt).getTime();
    return t > new Date(latest.updatedAt).getTime() ? a : latest;
  }).updatedAt;
};

export default function TasksClient({ initialJobs, role }: { initialJobs: TaskJob[], role: string }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [viewMode, setViewMode] = useState<'board' | 'list'>(isDesktop ? 'board' : 'list');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
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

  const clearFormError = useCallback(() => setFormError(null), []);

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

  const closeAllModals = () => {
    setReviewJob(null);
    setRevisionsJob(null);
    setProcessingJob(null);
    setPublishedJob(null);
    setRequestChangesNote('');
    setShowRequestChangesForm(false);
    setFailedRefImages(new Set());
    setActionError(null);
  };

  const publishJob = async (jobId: string) => {
    if (role === "ADMIN") return;
    setIsPublishing(true);
    setActionError(null);
    const result = await brandPublishProject(jobId);
    if (result.ok) {
      startTransition(() => {
        router.refresh();
      });
      closeAllModals();
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
      closeAllModals();
    } else {
      setActionError(result.message);
    }
    setIsRequestingChanges(false);
  };

  const submitNewJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (uploadedAssets.length === 0) {
      setFormError("Please upload at least one reference image.");
      return;
    }

    const formData = new FormData(e.currentTarget as HTMLFormElement);
    const nameVal = (formData.get('productName') as string) || 'New Custom Upload';
    const skuVal = (formData.get('productSku') as string) || undefined;
    const instructionsVal = (formData.get('additionalInstructions') as string) || undefined;
    const width = Number(formData.get('dimWidth') || 0);
    const height = Number(formData.get('dimHeight') || 0);
    const depth = Number(formData.get('dimDepth') || 0);

    if (width <= 0 || height <= 0 || depth <= 0) {
      setFormError("Please enter valid dimensions (all values must be greater than 0).");
      return;
    }

    setIsSubmitting(true);
    const result = await createProject(nameVal, uploadedAssets.map(a => a.id), skuVal, instructionsVal, {
      width,
      height,
      depth,
      unit: 'cm',
    });
    if (result.ok) {
      setUploadedAssets([]);
      resetUpload();
      setUploadSuccess(false);
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
      onClick={() => setIsWizardOpen(true)}
      size="sm"
      leftIcon={<Plus className="w-4 h-4" aria-hidden="true" />}
    >
      New Task
    </Button>
  );

  return (
    <DashboardLayout title="Tasks Pipeline" action={role !== "ADMIN" ? actionButton : undefined}>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center sm:gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks or SKUs..."
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="w-full sm:w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
              icon={<Filter className="w-3.5 h-3.5" />}
            >
              <option value="all">All Statuses</option>
              {BOARD_STATUSES.map((status) => (
                <option key={status} value={status}>{BRAND_LABEL[status]}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="flex items-center p-1 bg-[var(--color-canvas)] rounded-full border border-[var(--color-border-default)] shrink-0 self-end sm:self-auto">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-sans font-medium transition-colors ${viewMode === 'list' ? 'bg-[var(--color-canvas-soft)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
          >
            <ListIcon className="w-3.5 h-3.5" /> List
          </button>
          <button
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-sans font-medium transition-colors ${viewMode === 'board' ? 'bg-[var(--color-canvas-soft)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Board
          </button>
        </div>
      </div>

      {viewMode === 'board' ? (
        <div className="flex-1 overflow-x-auto pb-4 h-[calc(100vh-210px)] animate-in fade-in duration-300">
          <div className="flex gap-6 min-w-max h-full items-start">
            {COLUMNS.map(col => {
              const columnJobs = filteredJobs.filter(j => j.status === col.id);
              const ColIcon = col.icon;
              return (
                <div key={col.id} className="w-80 flex flex-col bg-[var(--color-canvas)] rounded-[24px] p-4 max-h-full">
                  <div className="flex items-center justify-between mb-4 px-2 border-b border-[var(--color-border-default)] pb-3">
                    <div className="flex items-center gap-2">
                      <ColIcon className={`w-4 h-4 ${col.id === 'PENDING' ? 'text-[var(--text-muted)]' : col.id === 'REVISIONS' ? 'text-[var(--warning-content)]' : col.id === 'COMPLETED' ? 'text-[var(--color-text-primary)]' : 'text-[var(--positive-deep)]'}`} />
                      <h3 className="label-mono text-[var(--color-text-primary)]">
                        {col.label}
                      </h3>
                    </div>
                    <span className="text-[10px] font-sans text-[var(--color-text-muted)] bg-[var(--color-canvas-soft)] px-2 py-0.5 rounded-full">
                      {columnJobs.length}
                    </span>
                  </div>

                  <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-2">
                    {columnJobs.map(job => (
                      <div
                        key={job.id}
                        className="bg-[var(--color-canvas)] p-4 rounded-[24px] border border-[var(--color-border-default)] hover:border-[var(--color-text-primary)] hover:shadow-[var(--shadow-1)] transition-[border-color,box-shadow] cursor-pointer group shrink-0"
                        onClick={() => handleCardClick(job)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleCardClick(job);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {getThumbnail(job) && (
                          <div className="relative w-full h-32 bg-[var(--color-canvas)] rounded-2xl mb-3 overflow-hidden border border-[var(--color-border-default)]">
                            <Image src={getThumbnail(job)} alt="" fill sizes="320px" unoptimized className="object-cover group-hover:scale-105 transition-transform duration-700" />
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-sans uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-canvas-soft)] px-2 py-0.5 rounded-md">{job.id}</span>
                          {(() => {
                            const meta = PROJECT_STATUS_META[job.status];
                            const Icon = meta.icon;
                            return (
                              <Badge tone={meta.tone} icon={<Icon className="w-3 h-3" />}>
                                {BRAND_LABEL[job.status]}
                              </Badge>
                            );
                          })()}
                        </div>
                        <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-1.5 leading-tight">{job.name}</h4>
                        {role === "ADMIN" && (
                          <p className="text-[10px] font-sans uppercase tracking-widest text-[var(--color-text-muted)]">
                            Category: {getProductCategory(job)}
                          </p>
                        )}

                        <div className="flex justify-between items-center mt-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[var(--color-text-primary)] text-[var(--color-canvas)] flex items-center justify-center text-[8px] font-bold tracking-widest">
                              {getInitials(job.brand?.name || 'UB')}
                            </div>
                            <span className="text-[10px] font-sans text-[var(--color-text-muted)]">{getSku(job)}</span>
                          </div>
                          <span className="text-[9px] text-[var(--color-text-muted)] uppercase">{getCreatedDate(job)}</span>
                        </div>

                        {(job.status === 'COMPLETED') && (
                          <div className="mt-4 pt-3 border-t border-[var(--color-border-default)]">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setReviewJob(job);
                              }}
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                              className="w-full"
                            >
                              Review Model
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {columnJobs.length === 0 && (
                      <div className="flex-1 border-2 border-dashed border-[var(--color-border-default)] rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[120px]">
                        <BoxIcon className="w-6 h-6 text-[var(--color-text-muted)] mb-2" />
                        <span className="text-[11px] text-[var(--color-text-muted)] font-sans tracking-widest uppercase">Empty</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-[var(--color-canvas)] rounded-[24px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[var(--color-canvas-soft)]">
                <tr className="border-b border-[var(--color-border-default)]">
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] uppercase tracking-widest font-sans text-[var(--color-text-muted)] font-bold">Job ID</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] uppercase tracking-widest font-sans text-[var(--color-text-muted)] font-bold">Product</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] uppercase tracking-widest font-sans text-[var(--color-text-muted)] font-bold">Status</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] uppercase tracking-widest font-sans text-[var(--color-text-muted)] font-bold">Created</th>
                  <th className="px-3 sm:px-6 py-3 sm:py-4 text-[10px] uppercase tracking-widest font-sans text-[var(--color-text-muted)] font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-default)]">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 sm:px-6 py-10 sm:py-12 text-center text-[var(--color-text-muted)] text-sm">
                      No tasks match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map(job => (
                    <tr key={job.id} className="hover:bg-[var(--color-canvas-soft)] transition-colors group">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="text-[11px] font-sans font-medium text-[var(--color-text-primary)] bg-[var(--color-canvas-soft)] px-2 py-1 rounded-md border border-[var(--color-border-default)]">
                          {job.id}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-3">
                          {getThumbnail(job) ? (
                            <div className="relative w-10 h-10 overflow-hidden rounded-lg border border-[var(--color-border-default)] shrink-0">
                              <Image src={getThumbnail(job)} alt="" fill sizes="40px" unoptimized className="object-cover" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-[var(--color-canvas-soft)] border border-[var(--color-border-default)] flex items-center justify-center shrink-0">
                              <BoxIcon className="w-4 h-4 text-[var(--color-text-muted)]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{job.name}</div>
                            <div className="text-[10px] font-sans text-[var(--color-text-muted)]">{getSku(job)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        {(() => {
                          const meta = PROJECT_STATUS_META[job.status];
                          const Icon = meta.icon;
                          return (
                            <Badge tone={meta.tone} icon={<Icon className="w-3 h-3" />}>
                              {BRAND_LABEL[job.status]}
                            </Badge>
                          );
                        })()}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs text-[var(--color-text-muted)] font-sans">
                        {getCreatedDate(job)}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-right">
                        {job.status === 'COMPLETED' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setReviewJob(job)}
                          >
                            Review
                          </Button>
                        ) : job.status === 'PUBLISHED' ? (
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => setPublishedJob(job)}
                          >
                            View 3D
                          </Button>
                        ) : (
                          <Button
                            variant="tertiary"
                            size="sm"
                            onClick={() => handleCardClick(job)}
                          >
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

      <Modal
        isOpen={isWizardOpen}
        onClose={() => setIsWizardOpen(false)}
        title="Create New Task"
        description="Upload reference photos and dimensions to generate a new 3D asset."
        size="xl"
        variant="dialog"
        footer={
          <div className="flex justify-between items-center w-full">
            <Button
              variant="ghost"
              onClick={() => setIsWizardOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="new-job-form"
              isLoading={isSubmitting}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Task
            </Button>
          </div>
        }
      >
        <form id="new-job-form" onSubmit={submitNewJob} onChange={clearFormError} className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {formError && (
            <div className="col-span-1 md:col-span-2 -mt-2">
              <div className="flex items-center gap-2 text-[12px] text-[var(--negative-deep)] bg-[var(--negative)]/10 border border-[var(--negative)]/40 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            </div>
          )}

          <div className="space-y-8">
            <section>
              <h3 className="text-sm uppercase tracking-widest font-sans font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2">
                <Edit3 className="w-4 h-4 text-[var(--color-text-muted)]" /> Product Details
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5" htmlFor="productName">Product Name <span className="text-[var(--negative-deep)]">*</span></label>
                  <Input
                    id="productName"
                    name="productName"
                    type="text"
                    required
                    placeholder="e.g. Modern Eames Chair"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5" htmlFor="productSku">SKU <span className="text-[var(--negative-deep)]">*</span></label>
                  <Input
                    id="productSku"
                    name="productSku"
                    type="text"
                    required
                    placeholder="e.g. CHAIR-001"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-1.5" htmlFor="additionalInstructions">Additional Instructions (Optional)</label>
                  <textarea
                    id="additionalInstructions"
                    name="additionalInstructions"
                    className="input-base w-full px-4 py-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] focus:border-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-text-primary)] outline-none transition-colors text-sm font-sans resize-none h-24"
                    placeholder="Specific notes on material finish, stitching, hidden details..."
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm uppercase tracking-widest font-sans font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2">
                <Ruler className="w-4 h-4 text-[var(--color-text-muted)]" /> Physical Dimensions (CM)
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mb-4">Required for exact 1:1 scale in AR rendering.</p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5" htmlFor="dimWidth">Width</label>
                  <Input
                    id="dimWidth"
                    name="dimWidth"
                    type="number"
                    required
                    min="1"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5" htmlFor="dimHeight">Height</label>
                  <Input
                    id="dimHeight"
                    name="dimHeight"
                    type="number"
                    required
                    min="1"
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--color-text-secondary)] mb-1.5" htmlFor="dimDepth">Depth</label>
                  <Input
                    id="dimDepth"
                    name="dimDepth"
                    type="number"
                    required
                    min="1"
                    placeholder="0.0"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6 bg-[var(--color-canvas)] p-6 rounded-2xl border border-[var(--color-border-default)]">
            <div>
              <h3 className="text-sm uppercase tracking-widest font-sans font-bold text-[var(--color-text-primary)] mb-1 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-[var(--color-text-muted)]" /> Reference Images
              </h3>
              <p className="text-[11px] text-[var(--color-text-muted)] mb-4">Upload standard JPG/PNG photos from the required angles.</p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
              className="hidden"
              disabled={isUploading || uploadedAssets.length >= MAX_IMAGES}
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || uploadedAssets.length >= MAX_IMAGES}
              className="w-full border border-dashed border-[var(--color-border-default)] rounded-xl py-8 flex flex-col items-center gap-3 text-[var(--color-text-muted)] hover:border-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-[var(--color-border-default)] disabled:hover:text-[var(--color-text-muted)] bg-[var(--color-canvas)]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-[12px] font-medium">Uploading...</span>
                </>
              ) : uploadedAssets.length >= MAX_IMAGES ? (
                <>
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[12px] font-medium">Maximum 5 images reached</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-6 h-6" />
                  <div className="text-center">
                    <span className="text-[12px] font-medium">Select Image</span>
                    <p className="text-[10px] text-[var(--color-text-muted)] mt-1">JPG, PNG, WebP · max 16MB · {uploadedAssets.length}/{MAX_IMAGES}</p>
                  </div>
                </>
              )}
            </button>

            {uploadError && (
              <div className="flex items-center gap-2 text-[11px] font-sans text-[var(--negative-deep)] bg-[var(--negative)]/10 border border-[var(--negative)]/40 rounded-xl px-3 py-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="flex items-center gap-2 text-[11px] font-sans text-[var(--positive-deep)] bg-[var(--positive)]/10 border border-[var(--positive)]/40 rounded-xl px-3 py-2 animate-in fade-in slide-in-from-top-1 duration-300">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Image uploaded successfully</span>
              </div>
            )}

            {uploadedAssets.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-sans uppercase tracking-widest text-[var(--color-text-muted)]">
                    Uploaded Images ({uploadedAssets.length})
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {uploadedAssets.map((asset, i) => (
                    <div
                      key={asset.id}
                      className="group relative w-20 h-20 rounded-xl overflow-hidden border border-[var(--color-border-default)] bg-[var(--color-canvas)] cursor-pointer hover:border-[var(--color-text-primary)] transition-colors"
                      onClick={() => setLightboxUrl(`/api/v1/assets/${asset.id}/file`)}
                      title="Click to enlarge"
                    >
                      <Image src={`/api/v1/assets/${asset.id}/file`} alt={`Uploaded ${i + 1}`} fill sizes="80px" unoptimized className="object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <Maximize2 className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setUploadedAssets(prev => prev.filter(a => a.id !== asset.id));
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[var(--negative)] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--negative-deep)] focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--negative)]/40"
                        aria-label="Remove image"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] rounded-xl p-3 flex gap-3 items-start">
              <AlertCircle className="w-4 h-4 text-[var(--color-text-muted)] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                For best results, ensure images have flat lighting (no harsh shadows) and the product is fully visible within the frame.
              </p>
            </div>

          </div>

        </form>
      </Modal>

      <Modal
        isOpen={!!processingJob}
        onClose={() => setProcessingJob(null)}
        title={processingJob ? processingJob.name : ''}
        description={processingJob ? `${getSku(processingJob)} • Processing` : ''}
        size="lg"
        variant="dialog"
      >
        {processingJob && (
          <div className="space-y-6">
            <section>
              <h3 className="text-sm uppercase tracking-widest font-sans font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2">
                Product Info
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Name</span>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">{processingJob.name}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Status</span>
                  <Badge tone="warning" icon={<Clock className="w-3 h-3" />}>Processing</Badge>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm uppercase tracking-widest font-sans font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2">
                Physical Dimensions (CM)
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {(() => {
                  const dimensions = getDimensions(processingJob);
                  const unit = dimensions.unit || 'cm';
                  return (<>
                    <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] p-3 rounded-xl">
                      <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Width</span>
                      <p className="text-sm font-sans text-[var(--color-text-primary)]">{dimensions.width ?? '-'} {unit}</p>
                    </div>
                    <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] p-3 rounded-xl">
                      <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Height</span>
                      <p className="text-sm font-sans text-[var(--color-text-primary)]">{dimensions.height ?? '-'} {unit}</p>
                    </div>
                    <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] p-3 rounded-xl">
                      <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Depth</span>
                      <p className="text-sm font-sans text-[var(--color-text-primary)]">{dimensions.depth ?? dimensions.length ?? '-'} {unit}</p>
                    </div>
                  </>);
                })()}
              </div>
            </section>

            <section>
              <h3 className="text-sm uppercase tracking-widest font-sans font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2">
                Reference Images
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {(processingJob.assets?.filter((a) => a.type === 'REFERENCE_IMAGE') || []).map((asset, index: number) => (
                  <div key={asset.id} className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-canvas)] aspect-square flex flex-col relative">
                    <Image src={`/api/v1/assets/${asset.id}/file`} alt={`Reference ${index + 1}`} fill sizes="(min-width: 640px) 25vw, 50vw" unoptimized className="object-cover opacity-80 mix-blend-multiply" />
                    <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-sm border-t border-[var(--color-border-default)] py-1.5 px-2">
                      <span className="text-[9px] font-medium text-[var(--color-text-primary)] uppercase tracking-wider">Reference {index + 1}</span>
                    </div>
                  </div>
                ))}
                {(!processingJob.assets?.filter((a) => a.type === 'REFERENCE_IMAGE').length) && (
                  <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-canvas)] aspect-square flex items-center justify-center">
                    <BoxIcon className="w-6 h-6 text-[var(--color-border-default)]" />
                  </div>
                )}
              </div>
            </section>

            <div className="bg-[var(--warning)]/15 border border-[var(--warning)]/40 rounded-xl p-4 flex gap-3 items-start">
              <Clock className="w-5 h-5 text-[var(--warning-deep)] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--warning-content)]">Awaiting production</p>
                <p className="text-[11px] text-[var(--warning-content)] mt-1">Your project is in the production queue. You will be notified when the 3D model is ready for your review.</p>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!revisionsJob}
        onClose={() => {
          setRevisionsJob(null);
          setRequestChangesNote('');
          setShowRequestChangesForm(false);
        }}
        title={revisionsJob ? `Awaiting Revisions: ${revisionsJob.name}` : ''}
        description={revisionsJob ? `${getSku(revisionsJob)} • Revisions in progress` : ''}
        size="lg"
        variant="dialog"
      >
        {revisionsJob && (
          <div className="space-y-6">
            <div className="bg-[var(--warning)]/15 border border-[var(--warning)]/40 rounded-xl p-4 flex gap-3 items-start">
              <MessageSquareWarning className="w-5 h-5 text-[var(--warning-deep)] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--warning-content)]">Production team is making changes</p>
                <p className="text-[11px] text-[var(--warning-content)] mt-1">You will be notified when the updated model is ready for your review.</p>
              </div>
            </div>

            {revisionsJob.revisionRequests && revisionsJob.revisionRequests.length > 0 && (
              <section>
                <h3 className="text-sm uppercase tracking-widest font-sans font-bold text-[var(--color-text-primary)] mb-4 flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2">
                  <Edit3 className="w-4 h-4 text-[var(--color-text-muted)]" /> Your Revision Notes
                </h3>
                <div className="space-y-3">
                  {revisionsJob.revisionRequests.map((req) => (
                    <div key={req.id} className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-sans uppercase tracking-widest text-[var(--color-text-muted)]">You</span>
                        <span className="text-[9px] text-[var(--color-text-muted)] font-sans">
                          {new Date(req.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">{req.note}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!reviewJob}
        onClose={() => {
          setReviewJob(null);
          setRequestChangesNote('');
          setShowRequestChangesForm(false);
        }}
        title={reviewJob ? `Review: ${reviewJob.name}` : ''}
        description={reviewJob ? `${getSku(reviewJob)} • Awaiting your review` : ''}
        size="full"
        variant="takeover"
        headerAction={
          role !== "ADMIN" ? (
            <div className="flex items-center gap-2">
              <Button
                variant="tertiary"
                onClick={() => setShowRequestChangesForm((v) => !v)}
                leftIcon={<Edit3 className="w-4 h-4" />}
              >
                Request Changes
              </Button>
              <Button
                onClick={() => reviewJob && publishJob(reviewJob.id)}
                isLoading={isPublishing}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Approve & Publish
              </Button>
            </div>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] h-full min-h-0">
          {reviewJob && (
            <aside className="border-r border-[var(--color-border-default)] overflow-y-auto px-6 py-5 space-y-5 bg-[var(--color-canvas)]">
              <h3 className="text-[10px] font-sans uppercase tracking-widest font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <BoxIcon className="w-4 h-4 text-[var(--color-text-muted)]" /> Project Details
              </h3>

              {actionError && (
                <div role="alert" className="bg-[var(--negative)]/10 border border-[var(--negative)]/40 text-[var(--negative-deep)] text-sm rounded-xl px-4 py-3">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Name</span>
                  <p className="font-medium text-[var(--color-text-primary)]">{reviewJob.name}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">SKU</span>
                  <p className="font-sans text-[var(--color-text-primary)]">{getSku(reviewJob)}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Created</span>
                  <p className="text-[var(--color-text-primary)]">{getCreatedDate(reviewJob)}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Brand</span>
                  <p className="text-[var(--color-text-primary)]">{reviewJob.brand?.name || 'Unknown'}</p>
                </div>
              </div>

              {reviewJob.instructions && (
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Additional Instructions</span>
                  <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">{reviewJob.instructions}</p>
                </div>
              )}

              {(() => {
                const dims = getDimensions(reviewJob);
                const unit = dims.unit || 'cm';
                return (
                  <div>
                    <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-2">Physical Dimensions</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] p-2.5 rounded-xl text-center">
                        <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)]">W</span>
                        <p className="text-sm font-sans text-[var(--color-text-primary)]">{dims.width ?? '-'} {unit}</p>
                      </div>
                      <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] p-2.5 rounded-xl text-center">
                        <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)]">H</span>
                        <p className="text-sm font-sans text-[var(--color-text-primary)]">{dims.height ?? '-'} {unit}</p>
                      </div>
                      <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] p-2.5 rounded-xl text-center">
                        <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)]">D</span>
                        <p className="text-sm font-sans text-[var(--color-text-primary)]">{dims.depth ?? dims.length ?? '-'} {unit}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-2">Reference Images</span>
                <div className="grid grid-cols-2 gap-2">
                  {(reviewJob.assets?.filter((a) => a.type === 'REFERENCE_IMAGE') || []).map((asset, index) => (
                    failedRefImages.has(asset.id) ? (
                      <div key={asset.id} className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-canvas)] aspect-square flex items-center justify-center" title="Image unavailable">
                        <ImageIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
                      </div>
                    ) : (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setLightboxUrl(`/api/v1/assets/${asset.id}/file`)}
                        className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-canvas)] aspect-square relative cursor-zoom-in hover:border-[var(--color-text-primary)] transition-colors"
                      >
                        <Image
                          src={`/api/v1/assets/${asset.id}/file`}
                          alt={`Ref ${index + 1}`}
                          fill
                          sizes="200px"
                          className="object-cover opacity-80 mix-blend-multiply"
                          onError={() => setFailedRefImages((prev) => { const next = new Set(prev); next.add(asset.id); return next; })}
                        />
                      </button>
                    )
                  ))}
                  {(!reviewJob.assets?.filter((a) => a.type === 'REFERENCE_IMAGE').length) && (
                    <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-canvas)] aspect-square flex items-center justify-center">
                      <BoxIcon className="w-6 h-6 text-[var(--color-border-default)]" />
                    </div>
                  )}
                </div>
              </div>

              {role !== "ADMIN" && showRequestChangesForm && (
                <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] rounded-2xl p-5 space-y-3">
                  <div>
                    <h4 className="text-sm uppercase tracking-widest font-sans font-bold text-[var(--color-text-primary)] flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2">
                      <Edit3 className="w-4 h-4 text-[var(--color-text-muted)]" /> Request Changes
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-2">Describe what should be changed. Your note will be sent to the production team.</p>
                  </div>
                  <textarea
                    value={requestChangesNote}
                    onChange={(e) => setRequestChangesNote(e.target.value)}
                    placeholder="e.g. The cushion is too thin — please increase the height by ~3cm."
                    className="input-base w-full px-4 py-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] focus:border-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-text-primary)] outline-none transition-colors text-sm font-sans resize-none h-28"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowRequestChangesForm(false);
                        setRequestChangesNote('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => reviewJob && sendForRevisions(reviewJob.id)}
                      isLoading={isRequestingChanges}
                      disabled={!requestChangesNote.trim()}
                      leftIcon={<Check className="w-4 h-4" />}
                    >
                      Send Request
                    </Button>
                  </div>
                </div>
              )}
            </aside>
          )}

          <main className="overflow-y-auto bg-[var(--color-canvas)] min-h-0">
            {reviewViewerProduct ? (
              <>
                <ThreeDConfigurator key="review-viewer" product={reviewViewerProduct} />
                {reviewJob && (() => {
                  const updated = getLatestModelUpdatedAt(reviewJob);
                  if (!updated) return null;
                  return (
                    <p className="px-4 py-2 text-[10px] font-sans uppercase tracking-widest text-[var(--color-text-muted)] text-center border-t border-[var(--color-border-default)]">
                      Model last updated {formatRelativeShort(updated)}
                    </p>
                  );
                })()}
              </>
            ) : (
              <div className="h-full w-full flex items-center justify-center p-12 text-sm text-[var(--color-text-muted)]">No GLB asset is available for review.</div>
            )}
          </main>
        </div>
      </Modal>

      <Modal
        isOpen={!!publishedJob}
        onClose={() => {
          setPublishedJob(null);
          setRequestChangesNote('');
          setShowRequestChangesForm(false);
        }}
        title={publishedJob?.name || ''}
        description={publishedJob ? `${getSku(publishedJob)} • Published` : ''}
        size="full"
        variant="takeover"
        headerAction={
          role !== "ADMIN" ? (
            <Button
              variant="tertiary"
              onClick={() => setShowRequestChangesForm((v) => !v)}
              leftIcon={<Edit3 className="w-4 h-4" />}
            >
              Send for Revisions
            </Button>
          ) : undefined
        }
      >
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] h-full min-h-0">
          {publishedJob && (
            <aside className="border-r border-[var(--color-border-default)] overflow-y-auto px-6 py-5 space-y-5 bg-[var(--color-canvas)]">
              <h3 className="text-[10px] font-sans uppercase tracking-widest font-bold text-[var(--color-text-primary)] flex items-center gap-2">
                <BoxIcon className="w-4 h-4 text-[var(--color-text-muted)]" /> Project Details
              </h3>

              {actionError && (
                <div role="alert" className="bg-[var(--negative)]/10 border border-[var(--negative)]/40 text-[var(--negative-deep)] text-sm rounded-xl px-4 py-3">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Name</span>
                  <p className="font-medium text-[var(--color-text-primary)]">{publishedJob.name}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">SKU</span>
                  <p className="font-sans text-[var(--color-text-primary)]">{getSku(publishedJob)}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Created</span>
                  <p className="text-[var(--color-text-primary)]">{getCreatedDate(publishedJob)}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Brand</span>
                  <p className="text-[var(--color-text-primary)]">{publishedJob.brand?.name || 'Unknown'}</p>
                </div>
              </div>

              {publishedJob.instructions && (
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Additional Instructions</span>
                  <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">{publishedJob.instructions}</p>
                </div>
              )}

              {(() => {
                const dims = getDimensions(publishedJob);
                const unit = dims.unit || 'cm';
                return (
                  <div>
                    <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-2">Physical Dimensions</span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] p-2.5 rounded-xl text-center">
                        <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)]">W</span>
                        <p className="text-sm font-sans text-[var(--color-text-primary)]">{dims.width ?? '-'} {unit}</p>
                      </div>
                      <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] p-2.5 rounded-xl text-center">
                        <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)]">H</span>
                        <p className="text-sm font-sans text-[var(--color-text-primary)]">{dims.height ?? '-'} {unit}</p>
                      </div>
                      <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] p-2.5 rounded-xl text-center">
                        <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)]">D</span>
                        <p className="text-sm font-sans text-[var(--color-text-primary)]">{dims.depth ?? dims.length ?? '-'} {unit}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-2">Reference Images</span>
                <div className="grid grid-cols-2 gap-2">
                  {(publishedJob.assets?.filter((a) => a.type === 'REFERENCE_IMAGE') || []).map((asset, index) => (
                    failedRefImages.has(asset.id) ? (
                      <div key={asset.id} className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-canvas)] aspect-square flex items-center justify-center" title="Image unavailable">
                        <ImageIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
                      </div>
                    ) : (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => setLightboxUrl(`/api/v1/assets/${asset.id}/file`)}
                        className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-canvas)] aspect-square relative cursor-zoom-in hover:border-[var(--color-text-primary)] transition-colors"
                      >
                        <Image
                          src={`/api/v1/assets/${asset.id}/file`}
                          alt={`Ref ${index + 1}`}
                          fill
                          sizes="200px"
                          className="object-cover opacity-80 mix-blend-multiply"
                          onError={() => setFailedRefImages((prev) => { const next = new Set(prev); next.add(asset.id); return next; })}
                        />
                      </button>
                    )
                  ))}
                  {(!publishedJob.assets?.filter((a) => a.type === 'REFERENCE_IMAGE').length) && (
                    <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-canvas)] aspect-square flex items-center justify-center">
                      <BoxIcon className="w-6 h-6 text-[var(--color-border-default)]" />
                    </div>
                  )}
                </div>
              </div>

              {role !== "ADMIN" && showRequestChangesForm && (
                <div className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] rounded-2xl p-5 space-y-3">
                  <div>
                    <h4 className="text-sm uppercase tracking-widest font-sans font-bold text-[var(--color-text-primary)] flex items-center gap-2 border-b border-[var(--color-border-default)] pb-2">
                      <Edit3 className="w-4 h-4 text-[var(--color-text-muted)]" /> Send for Revisions
                    </h4>
                    <p className="text-[11px] text-[var(--color-text-muted)] mt-2">This will remove the model from your live embed. The production team will make the requested changes and resubmit.</p>
                  </div>
                  <textarea
                    value={requestChangesNote}
                    onChange={(e) => setRequestChangesNote(e.target.value)}
                    placeholder="e.g. The handle is positioned too low — please adjust by 2cm."
                    className="input-base w-full px-4 py-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] focus:border-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-text-primary)] outline-none transition-colors text-sm font-sans resize-none h-28"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setShowRequestChangesForm(false);
                        setRequestChangesNote('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => sendForRevisions(publishedJob.id)}
                      isLoading={isRequestingChanges}
                      disabled={!requestChangesNote.trim()}
                      leftIcon={<Check className="w-4 h-4" />}
                    >
                      Send Request
                    </Button>
                  </div>
                </div>
              )}
            </aside>
          )}

          <main className="overflow-y-auto bg-[var(--color-canvas)] min-h-0">
            {publishedViewerProduct ? (
              <>
                <ThreeDConfigurator key="published-viewer" product={publishedViewerProduct} />
                {publishedJob && (() => {
                  const updated = getLatestModelUpdatedAt(publishedJob);
                  if (!updated) return null;
                  return (
                    <p className="px-4 py-2 text-[10px] font-sans uppercase tracking-widest text-[var(--color-text-muted)] text-center border-t border-[var(--color-border-default)]">
                      Model last updated {formatRelativeShort(updated)}
                    </p>
                  );
                })()}
              </>
            ) : (
              <div className="h-full w-full flex items-center justify-center p-12 text-sm text-[var(--color-text-muted)]">No GLB asset is available for this project.</div>
            )}
          </main>
        </div>
      </Modal>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 cursor-zoom-out"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full h-full">
            <Image src={lightboxUrl} alt="Reference" fill sizes="(min-width: 1024px) 1024px, 100vw" unoptimized className="object-contain" />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
