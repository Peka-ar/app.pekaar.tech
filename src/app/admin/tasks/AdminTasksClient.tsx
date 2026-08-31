"use client";
import React, { useState, useTransition, useCallback, useRef } from 'react';
import {
  Search, Filter, Loader2, MessageSquareWarning,
  X, UploadCloud, Box, Image as ImageIcon,
  Check, PackageCheck, ExternalLink,
  History, RefreshCw
} from 'lucide-react';
import Image from 'next/image';
import type { ProjectStatus } from "@/lib/enums";
import { adminSubmitProject } from "@/app/actions/admin";
import { useAppwriteUpload, type UploadedAsset } from "@/lib/use-appwrite-upload";
import { APPWRITE_MODELS_BUCKET_ID } from "@/lib/appwrite-config";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ADMIN_LABEL, PROJECT_STATUS_META } from "@/lib/status";

type TaskBrand = {
  id: string;
  name: string | null;
  email: string;
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
  requester?: { id: string; name: string | null; email: string } | null;
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
  { id: 'PENDING', label: 'Queued', icon: PackageCheck },
  { id: 'REVISIONS', label: 'Revisions Required', icon: MessageSquareWarning },
  { id: 'COMPLETED', label: 'Completed', icon: Check },
];

const BOARD_STATUSES: ProjectStatus[] = COLUMNS.map((c) => c.id);

const getThumbnail = (project: TaskJob) => {
  const ref = project.assets?.find((a) => a.type === 'REFERENCE_IMAGE');
  return ref ? `/api/v1/assets/${ref.id}/file` : '';
};
const getSku = (project: TaskJob) => project.sku || 'No SKU';
const getInitials = (name: string) => name === 'Unassigned' ? 'UN' : name.slice(0, 2).toUpperCase();
const getCreatedDate = (project: TaskJob) => new Date(project.createdAt).toLocaleDateString();
const getDimensions = (project: TaskJob) => (project.dimensions && typeof project.dimensions === 'object' ? project.dimensions : {}) as { width?: number; height?: number; depth?: number; length?: number; unit?: string };

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
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [glbAsset, setGlbAsset] = useState<UploadedAsset | null>(null);
  const [usdzAsset, setUsdzAsset] = useState<UploadedAsset | null>(null);
  const [glbFileName, setGlbFileName] = useState<string | null>(null);
  const [usdzFileName, setUsdzFileName] = useState<string | null>(null);
  const [failedRefImages, setFailedRefImages] = useState<Set<string>>(new Set());

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

  const openModal = (job: TaskJob) => {
    setSelectedTask(job);
    resetModelUploadState();
    setFailedRefImages(new Set());
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
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
    try {
      await adminSubmitProject(selectedTask.id, glbAsset.id, usdzAsset?.id);
      refreshTasks();
      closeModal();
    } catch (e) {
      console.error(e);
    }
    setIsSubmitting(false);
  };

  const resetModelUploadState = () => {
    setGlbAsset(null);
    setUsdzAsset(null);
    setGlbFileName(null);
    setUsdzFileName(null);
    resetGlb();
    resetUsdz();
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
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
                <option key={status} value={status}>{ADMIN_LABEL[status]}</option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto pb-4 h-[calc(100vh-210px)] animate-in fade-in duration-300">
        <div className="flex gap-6 min-w-max h-full items-start">
          {COLUMNS.map(col => {
            const columnJobs = filteredJobs.filter(j => j.status === col.id);
            const ColIcon = col.icon;
            return (
              <div key={col.id} className="w-72 flex flex-col bg-[var(--color-canvas)] rounded-3xl p-4 border border-[var(--color-border-default)] shadow-sm max-h-full">
                <div className="flex items-center justify-between mb-4 px-2 border-b border-[var(--color-border-default)] pb-3">
                  <div className="flex items-center gap-2">
                    <ColIcon className={`w-4 h-4 text-[var(--color-text-primary)]`} />
                    <h3 className="text-[11px] font-mono uppercase tracking-widest font-bold text-[var(--color-text-primary)]">
                      {col.label}
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono text-[var(--color-text-muted)] bg-[var(--color-canvas-secondary)] px-2 py-0.5 rounded-full border border-[var(--color-border-default)]">
                    {columnJobs.length}
                  </span>
                </div>

                <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-2">
                  {columnJobs.map(job => (
                    <div
                      key={job.id}
                      className="bg-[var(--color-surface)] p-4 rounded-2xl border border-[var(--color-border-default)] shadow-sm hover:border-[var(--color-text-primary)] hover:shadow-md transition-all cursor-pointer group shrink-0"
                      onClick={() => openModal(job)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          openModal(job);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      {getThumbnail(job) && (
                        <div className="relative w-full h-32 bg-[var(--color-canvas)] rounded-xl mb-3 overflow-hidden border border-[var(--color-border-default)]">
                          <Image src={getThumbnail(job)} alt="" fill sizes="288px" unoptimized className="object-cover group-hover:scale-105 transition-transform duration-700" />
                        </div>
                      )}
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)] bg-[var(--color-canvas-secondary)] px-2 py-0.5 rounded-md">{job.id}</span>
                        <span className="shrink-0">
                          {(() => {
                            const meta = PROJECT_STATUS_META[job.status];
                            const Icon = meta.icon;
                            return <Icon className="w-3.5 h-3.5" style={{ color: meta.tone === 'success' ? 'var(--color-accent-3)' : meta.tone === 'warning' ? '#f59e0b' : meta.tone === 'danger' ? '#ef4444' : 'var(--color-text-muted)' }} />;
                          })()}
                        </span>
                      </div>
                      <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-1.5 leading-tight">{job.name}</h4>
                      <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
                        {job.brand?.name || 'Unknown Brand'}
                      </p>

                      <div className="flex justify-between items-center mt-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[var(--color-text-primary)] text-[var(--color-surface)] flex items-center justify-center text-[8px] font-bold tracking-widest">
                            {getInitials(job.brand?.name || 'UB')}
                          </div>
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{getSku(job)}</span>
                        </div>
                        <span className="text-[9px] text-[var(--color-text-muted)] uppercase">{getCreatedDate(job)}</span>
                      </div>
                    </div>
                  ))}
                  {columnJobs.length === 0 && (
                    <div className="flex-1 border-2 border-dashed border-[var(--color-border-default)] rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[120px] bg-[var(--color-surface)]/50">
                      <Box className="w-6 h-6 text-[var(--color-border-default)] mb-2" />
                      <span className="text-[11px] text-[var(--color-text-muted)] font-mono tracking-widest uppercase">Empty</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={selectedTask ? `Manage: ${selectedTask.name}` : ''}
        description={selectedTask ? `${selectedTask.id} • ${getSku(selectedTask)}` : ''}
        size="xl"
        variant="dialog"
      >
        {selectedTask && (
          <div className="space-y-6 max-h-[65vh] overflow-y-auto pr-2">
            <section className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] rounded-2xl p-5 space-y-4">
              <h3 className="text-xs uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--color-border-default)]">
                <Box className="w-4 h-4 text-[var(--color-text-muted)]" /> Project Info
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Name</span>
                  <p className="font-medium text-[var(--color-text-primary)]">{selectedTask.name}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">SKU</span>
                  <p className="font-mono text-[var(--color-text-primary)]">{getSku(selectedTask)}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Brand</span>
                  <p className="text-[var(--color-text-primary)]">{selectedTask.brand?.name || 'Unknown'}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{selectedTask.brand?.email}</p>
                </div>
                <div>
                  <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Status</span>
                  <div>
                    {(() => {
                      const meta = PROJECT_STATUS_META[selectedTask.status];
                      const Icon = meta.icon;
                      return (
                        <Badge tone={meta.tone} icon={<Icon className="w-3 h-3" />}>
                          {ADMIN_LABEL[selectedTask.status]}
                        </Badge>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-1">Additional Instructions</span>
                {selectedTask.instructions ? (
                  <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">{selectedTask.instructions}</p>
                ) : (
                  <p className="text-sm text-[var(--color-text-muted)] italic">No additional instructions specified</p>
                )}
              </div>

              {(() => {
                const dims = getDimensions(selectedTask);
                const unit = dims.unit || 'cm';
                return (
                  <div>
                    <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-2">Dimensions</span>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] p-3 rounded-xl text-center">
                        <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)]">W</span>
                        <p className="text-sm font-mono text-[var(--color-text-primary)]">{dims.width ?? '-'}{unit}</p>
                      </div>
                      <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] p-3 rounded-xl text-center">
                        <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)]">H</span>
                        <p className="text-sm font-mono text-[var(--color-text-primary)]">{dims.height ?? '-'}{unit}</p>
                      </div>
                      <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] p-3 rounded-xl text-center">
                        <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)]">D</span>
                        <p className="text-sm font-mono text-[var(--color-text-primary)]">{dims.depth ?? dims.length ?? '-'}{unit}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div>
                <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[var(--color-text-muted)] mb-2">Reference Images</span>
                <div className="grid grid-cols-4 gap-3">
                  {(selectedTask.assets?.filter((a) => a.type === 'REFERENCE_IMAGE') || []).map((asset, index) => (
                    failedRefImages.has(asset.id) ? (
                      <div key={asset.id} className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-canvas)] aspect-square flex items-center justify-center" title="Image unavailable">
                        <ImageIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
                      </div>
                    ) : (
                      <div key={asset.id} className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-canvas)] aspect-square relative" title="Click to view">
                        <Image
                          src={`/api/v1/assets/${asset.id}/file`}
                          alt={`Ref ${index + 1}`}
                          fill
                          sizes="(min-width: 640px) 25vw, 50vw"
                          unoptimized
                          className="object-cover opacity-80 mix-blend-multiply"
                          onError={() => setFailedRefImages((prev) => { const next = new Set(prev); next.add(asset.id); return next; })}
                        />
                      </div>
                    )
                  ))}
                  {(!selectedTask.assets?.filter((a) => a.type === 'REFERENCE_IMAGE').length) && (
                    <div className="border border-[var(--color-border-default)] rounded-xl overflow-hidden bg-[var(--color-canvas)] aspect-square flex items-center justify-center">
                      <ImageIcon className="w-5 h-5 text-[var(--color-text-muted)]" />
                    </div>
                  )}
                </div>
              </div>
            </section>

            {selectedTask.status === 'REVISIONS' && selectedTask.revisionRequests && selectedTask.revisionRequests.length > 0 && (
              <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
                <h3 className="text-xs uppercase tracking-widest font-mono font-bold text-amber-900 flex items-center gap-2 pb-2 border-b border-amber-200">
                  <MessageSquareWarning className="w-4 h-4" /> Brand Revision Notes
                </h3>
                <div className="space-y-3">
                  {selectedTask.revisionRequests.map((req) => (
                    <div key={req.id} className="bg-[var(--color-surface)] border border-amber-200 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-amber-900">
                          {req.requester?.name || req.requester?.email || 'Brand'}
                        </span>
                        <span className="text-[9px] text-amber-700 font-mono">
                          {new Date(req.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap leading-relaxed">{req.note}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {isPublished && (
              <section className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] rounded-2xl p-5 space-y-3">
                <h3 className="text-xs uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--color-border-default)]">
                  <Check className="w-4 h-4 text-emerald-600" /> Published
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">This project is live on the brand&apos;s storefront. Embed links are serving this model.</p>
              </section>
            )}

            {canSubmit && (
              <section className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] rounded-2xl p-5 space-y-5">
                <h3 className="text-xs uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)] flex items-center gap-2 pb-2 border-b border-[var(--color-border-default)]">
                  <UploadCloud className="w-4 h-4 text-[var(--color-text-muted)]" /> 3D Model Assets
                </h3>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-2">GLB Model <span className="text-red-500">*</span></label>
                  <input type="file" accept=".glb" onChange={handleGlbUpload} className="hidden" id="glb-upload" disabled={isUploadingGlb} ref={glbInputRef} />
                  {liveGlb && !glbAsset && (
                    <div className="mb-2 flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-xl p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Box className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Current</p>
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{liveGlb.originalName}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">{(liveGlb.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      </div>
                      <a href={`/api/v1/assets/${liveGlb.id}/file`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 shrink-0">
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {glbAsset ? (
                    <div className="flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-xl p-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">New</p>
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{glbFileName || 'GLB Model'}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{glbAsset.size ? `${(glbAsset.size / 1024 / 1024).toFixed(1)} MB` : ''}</p>
                      </div>
                      <button onClick={() => { setGlbAsset(null); setGlbFileName(null); }} className="p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="glb-upload" className="flex flex-col items-center justify-center w-full border-2 border-dashed border-[var(--color-border-default)] rounded-xl py-6 cursor-pointer hover:border-[var(--color-text-primary)] transition-colors bg-[var(--color-surface)]">
                      {isUploadingGlb ? (
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
                      ) : liveGlb ? (
                        <RefreshCw className="w-6 h-6 text-[var(--color-text-muted)]" />
                      ) : (
                        <UploadCloud className="w-6 h-6 text-[var(--color-text-muted)]" />
                      )}
                      <span className="text-xs text-[var(--color-text-muted)] mt-2">
                        {isUploadingGlb ? 'Uploading…' : liveGlb ? 'Replace GLB file' : 'Select GLB file'}
                      </span>
                      {isUploadingGlb && (
                        <div className="w-full px-8 mt-3">
                          <div className="h-1.5 w-full bg-[var(--color-border-default)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-text-primary)] transition-all duration-150 ease-out"
                              style={{ width: `${Math.max(2, glbProgress)}%` }}
                            />
                          </div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)] mt-1.5 text-center">{glbProgress}%</p>
                        </div>
                      )}
                    </label>
                  )}
                  {glbError && <p className="text-xs text-red-500 mt-1">{glbError}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--color-text-secondary)] mb-2">USDZ Model <span className="text-[var(--color-text-muted)] text-[10px] font-normal">(Optional)</span></label>
                  <input type="file" accept=".usdz" onChange={handleUsdzUpload} className="hidden" id="usdz-upload" disabled={isUploadingUsdz} ref={usdzInputRef} />
                  {liveUsdz && !usdzAsset && (
                    <div className="mb-2 flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-xl p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <Box className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
                        <div className="min-w-0">
                          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Current</p>
                          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{liveUsdz.originalName}</p>
                          <p className="text-[10px] text-[var(--color-text-muted)]">{(liveUsdz.size / 1024 / 1024).toFixed(1)} MB</p>
                        </div>
                      </div>
                      <a href={`/api/v1/assets/${liveUsdz.id}/file`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-[var(--color-primary)] hover:underline inline-flex items-center gap-1 shrink-0">
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                  {usdzAsset ? (
                    <div className="flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-xl p-3">
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">New</p>
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{usdzFileName || 'USDZ Model'}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">{usdzAsset.size ? `${(usdzAsset.size / 1024 / 1024).toFixed(1)} MB` : ''}</p>
                      </div>
                      <button onClick={() => { setUsdzAsset(null); setUsdzFileName(null); }} className="p-1.5 rounded-full bg-red-50 text-red-500 hover:bg-red-100 shrink-0">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label htmlFor="usdz-upload" className="flex flex-col items-center justify-center w-full border-2 border-dashed border-[var(--color-border-default)] rounded-xl py-4 cursor-pointer hover:border-[var(--color-text-primary)] transition-colors bg-[var(--color-surface)]">
                      {isUploadingUsdz ? (
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--color-text-muted)]" />
                      ) : liveUsdz ? (
                        <RefreshCw className="w-6 h-6 text-[var(--color-text-muted)]" />
                      ) : (
                        <UploadCloud className="w-6 h-6 text-[var(--color-text-muted)]" />
                      )}
                      <span className="text-xs text-[var(--color-text-muted)] mt-2">
                        {isUploadingUsdz ? 'Uploading…' : liveUsdz ? 'Replace USDZ file' : 'Select USDZ file'}
                      </span>
                      {isUploadingUsdz && (
                        <div className="w-full px-8 mt-3">
                          <div className="h-1.5 w-full bg-[var(--color-border-default)] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--color-text-primary)] transition-all duration-150 ease-out"
                              style={{ width: `${Math.max(2, usdzProgress)}%` }}
                            />
                          </div>
                          <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)] mt-1.5 text-center">{usdzProgress}%</p>
                        </div>
                      )}
                    </label>
                  )}
                  {usdzError && <p className="text-xs text-red-500 mt-1">{usdzError}</p>}
                </div>

                {hasArchivedModels && (
                  <details className="bg-[var(--color-canvas)] border border-[var(--color-border-default)] rounded-xl p-3 group">
                    <summary className="flex items-center justify-between cursor-pointer list-none">
                      <span className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest font-bold text-[var(--color-text-secondary)]">
                        <History className="w-3.5 h-3.5" /> Previous models ({archivedGlbs.length + archivedUsdzs.length})
                      </span>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)] group-open:hidden">Show</span>
                      <span className="text-[10px] font-mono text-[var(--color-text-muted)] hidden group-open:inline">Hide</span>
                    </summary>
                    <div className="mt-3 space-y-2">
                      <p className="text-[10px] text-[var(--color-text-muted)] leading-relaxed">
                        Earlier uploads remain available in Appwrite storage. New uploads replace the previous ones.
                      </p>
                      {[...archivedGlbs, ...archivedUsdzs].map((m) => {
                        const isGlb = m.type === 'MODEL_GLB';
                        return (
                          <div key={m.id} className="flex items-center justify-between bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-lg p-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              <Box className="w-3.5 h-3.5 text-[var(--color-text-muted)] shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-[var(--color-text-primary)] truncate">{m.originalName}</p>
                                <p className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">
                                  {isGlb ? 'GLB' : 'USDZ'} · {(m.size / 1024 / 1024).toFixed(1)} MB · {new Date(m.updatedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}

                <button
                  onClick={handleSubmit}
                  disabled={!glbAsset || isSubmitting}
                  className="w-full py-3 bg-[var(--color-text-primary)] text-[var(--color-surface)] text-xs uppercase tracking-widest font-medium rounded-xl hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Submit for Review
                </button>
              </section>
            )}

            {selectedTask.status === 'COMPLETED' && (
              <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
                <h3 className="text-xs uppercase tracking-widest font-mono font-bold text-emerald-900 flex items-center gap-2 pb-2 border-b border-emerald-200">
                  <Check className="w-4 h-4" /> Submitted
                </h3>
                <p className="text-sm text-emerald-900">The brand has been notified. Awaiting their decision to publish or request revisions.</p>
                {selectedTask.assetUrls?.glb && (
                  <a href={selectedTask.assetUrls.glb} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:underline">
                    View GLB <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </section>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
