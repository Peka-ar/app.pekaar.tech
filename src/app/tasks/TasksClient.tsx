"use client";
import React, { useState, useEffect, useTransition } from 'react';
import { 
  Plus, UploadCloud, CheckCircle2, AlertCircle, Loader2, Ruler, X, Check,
  Search, Filter, List as ListIcon, LayoutGrid, Clock, Edit3, Eye, Box as BoxIcon
} from 'lucide-react';
import dynamic from 'next/dynamic';
import type { Product } from "@/lib/types";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const ThreeDConfigurator = dynamic(() => import('@/components/ThreeDConfigurator'), { ssr: false });
import { createProject, updateProjectStatus } from "@/app/actions/project";
import { claimProject, submitForReview } from "@/app/actions/admin";
import { UploadDropzone } from "@/lib/uploadthing";
import { ProjectStatus } from "@prisma/client";
import { useRouter } from "next/navigation";

const COLUMNS: { id: ProjectStatus; label: string; icon: React.ElementType }[] = [
  { id: 'PENDING', label: 'Queued', icon: Clock },
  { id: 'IN_PROGRESS', label: 'Processing', icon: Loader2 },
  { id: 'REVIEW', label: 'Review Required', icon: Eye },
  { id: 'PUBLISHED', label: 'Published', icon: CheckCircle2 },
];

const getThumbnail = (project: any) => project.referenceUrls?.[0] || '';
const getSku = (project: any) => project.sku || 'No SKU';
const getAssigneeName = (project: any) => project.assignedUser?.name || project.assignedUser?.email || 'Unassigned';
const getInitials = (name: string) => name === 'Unassigned' ? 'UN' : name.slice(0, 2).toUpperCase();
const getCreatedDate = (project: any) => new Date(project.createdAt).toLocaleDateString();
const getAssets = (project: any) => (project.assetUrls && typeof project.assetUrls === 'object' ? project.assetUrls : {}) as { glb?: string; usdz?: string };
const getDimensions = (project: any) => (project.dimensions && typeof project.dimensions === 'object' ? project.dimensions : {}) as { width?: number; height?: number; depth?: number; length?: number; unit?: string };
const getViewerProduct = (project: any): Product | null => {
  const glb = getAssets(project).glb;
  if (!glb) return null;

  const dimensions = getDimensions(project);
  return {
    id: project.id,
    name: project.name,
    category: 'Chairs',
    brand: project.brand?.name || 'STUDIO.V',
    price: 0,
    src: glb,
    thumbnail: getThumbnail(project),
    description: project.instructions || '',
    idealPhysicalDimensions: {
      width: Number(dimensions.width ?? 0),
      height: Number(dimensions.height ?? 0),
      depth: Number(dimensions.depth ?? dimensions.length ?? 0),
    },
  };
};

export default function TasksClient({ initialJobs, role }: { initialJobs: any[], role: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [jobs, setJobs] = useState<any[]>(initialJobs);

  useEffect(() => {
    setJobs(initialJobs);
  }, [initialJobs]);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [reviewJob, setReviewJob] = useState<any | null>(null);
  const [isRevisionModalOpen, setIsRevisionModalOpen] = useState(false);
  const [viewJobParams, setViewJobParams] = useState<any | null>(null);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);
  const [uploadedAssetUrls, setUploadedAssetUrls] = useState<{glb?: string; usdz?: string}>({});
  const [viewPublishedJob, setViewPublishedJob] = useState<any | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<any | 'all'>('all');

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          getSku(job).toLowerCase().includes(searchQuery.toLowerCase()) ||
                          job.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusIndicator = (status: ProjectStatus) => {
    switch (status) {
      case 'IN_PROGRESS': return <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />;
      case 'PUBLISHED': return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'REVIEW': return <AlertCircle className="w-3.5 h-3.5 text-[#1A1A1A]" />;
      default: return <div className="w-2.5 h-2.5 rounded-full bg-[#7A7670] ml-0.5" />;
    }
  };

  const getStatusBadge = (status: ProjectStatus) => {
    switch (status) {
      case 'IN_PROGRESS': return <span className="px-2.5 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase bg-amber-50 text-amber-600 border border-amber-100 flex items-center gap-1.5 w-fit"><Loader2 className="w-3 h-3 animate-spin" /> Processing</span>;
      case 'PUBLISHED': return <span className="px-2.5 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center gap-1.5 w-fit"><CheckCircle2 className="w-3 h-3" /> Published</span>;
      case 'REVIEW': return <span className="px-2.5 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase bg-[#1A1A1A] text-white border border-[#1A1A1A] flex items-center gap-1.5 w-fit"><AlertCircle className="w-3 h-3" /> Review Req</span>;
      default: return <span className="px-2.5 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase bg-[#EFEDEA] text-[#7A7670] border border-[#E5E2DD] flex items-center gap-1.5 w-fit"><Clock className="w-3 h-3" /> Queued</span>;
    }
  };

  const approveJob = async (jobId: string) => {
    if (role === 'ADMIN') return;
    try {
      await updateProjectStatus(jobId, "PUBLISHED");
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      console.error(e);
    }
    setReviewJob(null);
  };

  const submitNewJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadedImageUrls.length === 0) return;
    const nameVal = (document.getElementById('productName') as HTMLInputElement)?.value || 'New Custom Upload';
    const skuVal = (document.getElementById('productSku') as HTMLInputElement)?.value || undefined;
    const instructionsVal = (document.getElementById('additionalInstructions') as HTMLTextAreaElement)?.value || undefined;
    const width = Number((document.getElementById('dimWidth') as HTMLInputElement)?.value || 0);
    const height = Number((document.getElementById('dimHeight') as HTMLInputElement)?.value || 0);
    const depth = Number((document.getElementById('dimDepth') as HTMLInputElement)?.value || 0);
    
    try {
      await createProject(nameVal, uploadedImageUrls, skuVal, instructionsVal, {
        width,
        height,
        depth,
        unit: 'cm',
      });
      startTransition(() => {
        router.refresh();
      });
    } catch (e) {
      console.error(e);
    }
    setIsWizardOpen(false);
  };

  const actionButton = (
    <button 
      onClick={() => setIsWizardOpen(true)}
      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full text-[10px] uppercase tracking-widest font-medium flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
    >
      <Plus className="w-4 h-4" aria-hidden="true" />
      New Task
    </button>
  );

  return (
    <DashboardLayout title="Tasks Pipeline" action={actionButton}>
      
      {/* Professional Toolbar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[#7A7670] absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tasks or SKUs..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#E5E2DD] rounded-full text-xs font-sans focus:outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] transition-colors shadow-sm"
            />
          </div>
          <div className="relative">
            <Filter className="w-3.5 h-3.5 text-[#1A1A1A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ProjectStatus | 'all')}
              className="appearance-none flex items-center pl-9 pr-8 py-2 bg-white border border-[#E5E2DD] rounded-full text-xs font-medium text-[#1A1A1A] hover:bg-[#F9F8F6] transition-colors shrink-0 shadow-sm outline-none focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="PENDING">Queued</option>
              <option value="IN_PROGRESS">Processing</option>
              <option value="REVIEW">Review Req</option>
              <option value="PUBLISHED">Published</option>
            </select>
          </div>
        </div>
        
        <div className="flex items-center p-1 bg-[#EFEDEA] rounded-full border border-[#E5E2DD] shrink-0">
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-mono font-medium transition-all duration-200 ${viewMode === 'list' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#7A7670] hover:text-[#1A1A1A]'}`}
          >
            <ListIcon className="w-3.5 h-3.5" /> List
          </button>
          <button 
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] uppercase tracking-widest font-mono font-medium transition-all duration-200 ${viewMode === 'board' ? 'bg-white text-[#1A1A1A] shadow-sm' : 'text-[#7A7670] hover:text-[#1A1A1A]'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Board
          </button>
        </div>
      </div>

      {viewMode === 'board' ? (
        /* Enhanced Kanban Board Container */
        <div className="flex-1 overflow-x-auto pb-4 h-[calc(100vh-210px)] animate-in fade-in duration-300">
          <div className="flex gap-6 min-w-max h-full items-start">
            {COLUMNS.map(col => {
              const columnJobs = filteredJobs.filter(j => j.status === col.id);
              const ColIcon = col.icon;
              return (
                <div key={col.id} className="w-80 flex flex-col bg-[#F9F8F6] rounded-3xl p-4 border border-[#E5E2DD] shadow-sm max-h-full">
                  <div className="flex items-center justify-between mb-4 px-2 border-b border-[#E5E2DD] pb-3">
                    <div className="flex items-center gap-2">
                      <ColIcon className={`w-4 h-4 ${col.id === 'IN_PROGRESS' ? 'text-amber-500 animate-spin' : 'text-[#1A1A1A]'}`} />
                      <h3 className="text-[11px] font-mono uppercase tracking-widest font-bold text-[#1A1A1A]">
                        {col.label}
                      </h3>
                    </div>
                    <span className="text-[10px] font-mono text-[#7A7670] bg-[#EFEDEA] px-2 py-0.5 rounded-full border border-[#E5E2DD]">
                      {columnJobs.length}
                    </span>
                  </div>
                  
                  <div className="flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar pb-2">
                    {columnJobs.map(job => (
                      <div 
                        key={job.id} 
                        className="bg-white p-4 rounded-2xl border border-[#E5E2DD] shadow-sm hover:border-[#1A1A1A] hover:shadow-md transition-all cursor-pointer group shrink-0"
                        onClick={() => {
                          if (job.status === 'REVIEW') setReviewJob(job);
                          else if (job.status === 'PUBLISHED') setViewPublishedJob(job);
                          else setViewJobParams(job);
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        {getThumbnail(job) && (
                          <div className="w-full h-32 bg-[#F9F8F6] rounded-xl mb-3 overflow-hidden border border-[#E5E2DD]">
                            <img src={getThumbnail(job)} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          </div>
                        )}
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-[#7A7670] bg-[#EFEDEA] px-2 py-0.5 rounded-md">{job.id}</span>
                          {getStatusIndicator(job.status)}
                        </div>
                        <h4 className="text-sm font-medium text-[#1A1A1A] mb-1.5 leading-tight">{job.name}</h4>
                        
                        <div className="flex justify-between items-center mt-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[8px] font-bold tracking-widest">
                              {getInitials(getAssigneeName(job))}
                            </div>
                            <span className="text-[10px] font-mono text-[#7A7670]">{getSku(job)}</span>
                          </div>
                          <span className="text-[9px] text-[#7A7670] uppercase">{getCreatedDate(job)}</span>
                        </div>

                        {job.status === 'REVIEW' && (
                          <div className="mt-4 pt-3 border-t border-[#E5E2DD]">
                            <button className="w-full py-2 bg-[#1A1A1A] text-white text-[10px] uppercase tracking-widest rounded-xl font-medium hover:bg-[#2A2825] active:scale-95 transition-all duration-200 shadow-sm flex items-center justify-center gap-2">
                              <Eye className="w-3.5 h-3.5" /> Review Model
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {columnJobs.length === 0 && (
                      <div className="flex-1 border-2 border-dashed border-[#E5E2DD] rounded-2xl flex flex-col items-center justify-center p-8 text-center min-h-[120px] bg-white/50">
                        <BoxIcon className="w-6 h-6 text-[#E5E2DD] mb-2" />
                        <span className="text-[11px] text-[#A3A3A3] font-mono tracking-widest uppercase">Empty</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Professional List View Container */
        <div className="bg-white border border-[#E5E2DD] rounded-3xl shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E2DD] bg-[#F9F8F6]">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-bold">Job ID</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-bold">Product</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-bold">Status</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-bold">Assignee</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-bold">Created</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2DD]">
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-[#7A7670] font-serif italic text-sm">
                      No tasks match your search or filter.
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map(job => (
                    <tr key={job.id} className="hover:bg-[#F9F8F6] transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-mono font-medium text-[#1A1A1A] bg-[#EFEDEA] px-2 py-1 rounded-md border border-[#E5E2DD]">
                        {job.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {getThumbnail(job) ? (
                          <img src={getThumbnail(job)} alt="" className="w-10 h-10 rounded-lg object-cover border border-[#E5E2DD]" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-[#EFEDEA] border border-[#E5E2DD] flex items-center justify-center">
                            <BoxIcon className="w-4 h-4 text-[#A3A3A3]" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-medium text-[#1A1A1A]">{job.name}</div>
                          <div className="text-[10px] font-mono text-[#7A7670]">{getSku(job)}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-[#4A4742]">
                        <div className="w-6 h-6 rounded-full bg-[#1A1A1A] text-white flex items-center justify-center text-[8px] font-bold tracking-widest">
                          {getInitials(getAssigneeName(job))}
                        </div>
                        <span className="text-xs">{getAssigneeName(job)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#7A7670] font-mono">
                      {getCreatedDate(job)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {job.status === 'REVIEW' ? (
                        <button 
                          onClick={() => setReviewJob(job)}
                          className="px-4 py-1.5 bg-[#1A1A1A] text-white rounded-full text-[10px] uppercase tracking-widest font-medium hover:bg-[#2A2825] active:scale-95 transition-all duration-200"
                        >
                          Review
                        </button>
                      ) : job.status === 'PUBLISHED' ? (
                        <button 
                          onClick={() => setViewPublishedJob(job)}
                          className="px-4 py-1.5 bg-white border border-[#E5E2DD] text-[#4A4742] rounded-full text-[10px] uppercase tracking-widest font-medium hover:border-[#1A1A1A] transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          View 3D
                        </button>
                      ) : (
                        <button 
                          onClick={() => setViewJobParams(job)}
                          className="px-4 py-1.5 bg-white border border-[#E5E2DD] text-[#4A4742] rounded-full text-[10px] uppercase tracking-widest font-medium hover:border-[#1A1A1A] transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
                        >
                          Details
                        </button>
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

      {/* Enhanced New Job Modal */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm transition-opacity" onClick={() => setIsWizardOpen(false)} aria-hidden="true" />
          <div className="relative bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-[#E5E2DD] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#E5E2DD] bg-[#F9F8F6]">
              <div>
                <h2 className="text-2xl font-serif italic text-[#1A1A1A]">Create New Task</h2>
                <p className="text-[#7A7670] text-sm mt-1">Upload reference photos and dimensions to generate a new 3D asset.</p>
              </div>
              <button 
                onClick={() => setIsWizardOpen(false)}
                className="p-2 bg-white border border-[#E5E2DD] hover:bg-[#EFEDEA] rounded-full transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[#1A1A1A] shadow-sm"
                aria-label="Close modal"
              >
                <X className="w-5 h-5 text-[#1A1A1A]" aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-8 bg-white custom-scrollbar">
              <form id="new-job-form" onSubmit={submitNewJob} className="grid grid-cols-1 md:grid-cols-2 gap-10">
                
                {/* Left Column: Details & Dimensions */}
                <div className="space-y-8">
                  <section>
                    <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-4 flex items-center gap-2 border-b border-[#E5E2DD] pb-2">
                      <Edit3 className="w-4 h-4 text-[#7A7670]" /> Product Details
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#4A4742] mb-1.5" htmlFor="productName">Product Name <span className="text-red-500">*</span></label>
                        <input id="productName" type="text" required className="w-full px-4 py-3 rounded-xl border border-[#E5E2DD] bg-[#F9F8F6] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none transition-colors text-sm font-sans" placeholder="e.g. Modern Eames Chair" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#4A4742] mb-1.5" htmlFor="productSku">SKU <span className="text-red-500">*</span></label>
                        <input id="productSku" type="text" required className="w-full px-4 py-3 rounded-xl border border-[#E5E2DD] bg-[#F9F8F6] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none transition-colors text-sm font-mono" placeholder="e.g. CHAIR-001" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-[#4A4742] mb-1.5" htmlFor="additionalInstructions">Additional Instructions (Optional)</label>
                        <textarea id="additionalInstructions" className="w-full px-4 py-3 rounded-xl border border-[#E5E2DD] bg-[#F9F8F6] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none transition-colors text-sm font-sans resize-none h-24" placeholder="Specific notes on material finish, stitching, hidden details..."></textarea>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-4 flex items-center gap-2 border-b border-[#E5E2DD] pb-2">
                      <Ruler className="w-4 h-4 text-[#7A7670]" /> Physical Dimensions (CM)
                    </h3>
                    <p className="text-[11px] text-[#7A7670] mb-4">Required for exact 1:1 scale in AR rendering.</p>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#4A4742] mb-1.5" htmlFor="dimWidth">Width</label>
                        <input id="dimWidth" type="number" required min="1" className="w-full px-4 py-2.5 rounded-xl border border-[#E5E2DD] bg-[#F9F8F6] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none transition-colors text-sm font-mono" placeholder="0.0" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#4A4742] mb-1.5" htmlFor="dimHeight">Height</label>
                        <input id="dimHeight" type="number" required min="1" className="w-full px-4 py-2.5 rounded-xl border border-[#E5E2DD] bg-[#F9F8F6] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none transition-colors text-sm font-mono" placeholder="0.0" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#4A4742] mb-1.5" htmlFor="dimDepth">Depth</label>
                        <input id="dimDepth" type="number" required min="1" className="w-full px-4 py-2.5 rounded-xl border border-[#E5E2DD] bg-[#F9F8F6] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none transition-colors text-sm font-mono" placeholder="0.0" />
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Column: Multiple Angles Upload */}
                <div className="space-y-6 bg-[#F9F8F6] p-6 rounded-2xl border border-[#E5E2DD]">
                  <div>
                    <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-1 flex items-center gap-2">
                      <UploadCloud className="w-4 h-4 text-[#7A7670]" /> Reference Images
                    </h3>
                    <p className="text-[11px] text-[#7A7670] mb-4">Upload standard JPG/PNG photos from the required angles.</p>
                  </div>

                  <UploadDropzone
                    endpoint="brandImageRoute"
                    onClientUploadComplete={(res) => {
                      setUploadedImageUrls(res.map(r => r.url));
                    }}
                    onUploadError={(error) => {
                      console.error("Upload error:", error.message);
                    }}
                    className="ut-button:bg-[#1A1A1A] ut-button:hover:bg-[#2A2825] ut-button:rounded-full ut-button:text-[10px] ut-button:uppercase ut-button:tracking-widest ut-button:font-medium ut-label:text-[#7A7670] ut-allowed-content:text-[#A3A3A3] ut-upload-icon:text-[#7A7670]"
                  />
                  {uploadedImageUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {uploadedImageUrls.map((url, i) => (
                        <div key={i} className="w-16 h-16 rounded-xl overflow-hidden border border-[#E5E2DD] bg-white shadow-sm">
                          <img src={url} alt={`Uploaded ${i + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="bg-white border border-[#E5E2DD] rounded-xl p-3 flex gap-3 items-start">
                    <AlertCircle className="w-4 h-4 text-[#7A7670] shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[#7A7670] leading-relaxed">
                      For best results, ensure images have flat lighting (no harsh shadows) and the product is fully visible within the frame.
                    </p>
                  </div>

                </div>

              </form>
            </div>

            <div className="px-8 py-5 border-t border-[#E5E2DD] bg-[#F9F8F6] flex justify-between items-center">
              <button 
                type="button"
                onClick={() => setIsWizardOpen(false)}
                className="px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-medium text-[#4A4742] hover:text-[#1A1A1A] hover:bg-[#EFEDEA] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[#1A1A1A]"
              >
                Cancel
              </button>
              
              <button 
                type="submit"
                form="new-job-form"
                className="px-8 py-3 bg-[#1A1A1A] text-white rounded-full text-[11px] uppercase tracking-widest font-bold hover:bg-[#2A2825] active:scale-95 transition-transform duration-200 shadow-md flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
              >
                <Plus className="w-4 h-4" /> Queue Generation
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Model Inspector Review Mode Modal */}
      {reviewJob && (
        <div className="fixed inset-0 z-50 flex bg-[#EFEDEA] flex-col animate-in fade-in duration-300">
          <header className="bg-white border-b border-[#E5E2DD] px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setReviewJob(null)}
                className="p-2 hover:bg-[#EFEDEA] rounded-full transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[#1A1A1A]"
                aria-label="Close review"
              >
                <X className="w-5 h-5 text-[#1A1A1A]" aria-hidden="true" />
              </button>
              <div>
                <h2 className="text-xl font-serif italic text-[#1A1A1A]">Review Generation: {reviewJob.name}</h2>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#7A7670]">{getSku(reviewJob)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => approveJob(reviewJob.id)}
                className="px-6 py-2 bg-emerald-500 text-white rounded-full text-[10px] uppercase tracking-widest font-medium flex items-center gap-2 hover:bg-emerald-600 active:scale-95 transition-transform duration-200 shadow-sm"
              >
                <Check className="w-4 h-4" />
                Approve & Publish
              </button>
            </div>
          </header>
          
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto flex items-start justify-center w-full">
            <div className="w-full max-w-[1400px]">
              {getViewerProduct(reviewJob) ? (
                <ThreeDConfigurator product={getViewerProduct(reviewJob)!} />
              ) : (
                <div className="bg-white border border-[#E5E2DD] rounded-3xl p-12 text-center text-sm text-[#7A7670]">No GLB asset is available for review.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Published Model View Modal */}
      {viewPublishedJob && (
        <div className="fixed inset-0 z-50 flex bg-[#EFEDEA] flex-col animate-in fade-in duration-300">
          <header className="bg-white border-b border-[#E5E2DD] px-6 py-4 flex items-center justify-between shrink-0 shadow-sm z-10">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setViewPublishedJob(null)}
                className="p-2 hover:bg-[#EFEDEA] rounded-full transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[#1A1A1A]"
                aria-label="Close review"
              >
                <X className="w-5 h-5 text-[#1A1A1A]" aria-hidden="true" />
              </button>
              <div>
                <h2 className="text-xl font-serif italic text-[#1A1A1A]">{viewPublishedJob.name}</h2>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#7A7670]">{getSku(viewPublishedJob)} • PUBLISHED</span>
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto flex items-start justify-center w-full">
            <div className="w-full max-w-[1400px]">
              {getViewerProduct(viewPublishedJob) ? (
                <ThreeDConfigurator product={getViewerProduct(viewPublishedJob)!} />
              ) : (
                <div className="bg-white border border-[#E5E2DD] rounded-3xl p-12 text-center text-sm text-[#7A7670]">No GLB asset is available for this project.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Input Parameters Modal for Draft/Queued/Processing */}
      {viewJobParams && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm transition-opacity" onClick={() => setViewJobParams(null)} aria-hidden="true" />
          <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-[#E5E2DD] animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#E5E2DD] bg-[#F9F8F6]">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-2xl font-serif italic text-[#1A1A1A]">Job Details</h2>
                  {getStatusBadge(viewJobParams.status)}
                </div>
                <p className="text-[#7A7670] text-sm font-mono">{viewJobParams.id} • {getSku(viewJobParams)}</p>
              </div>
              <button 
                onClick={() => setViewJobParams(null)}
                className="p-2 bg-white border border-[#E5E2DD] hover:bg-[#EFEDEA] rounded-full transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[#1A1A1A] shadow-sm"
              >
                <X className="w-5 h-5 text-[#1A1A1A]" aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-8 bg-white custom-scrollbar">
              <div className="space-y-8">
                
                <section>
                  <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-4 flex items-center gap-2 border-b border-[#E5E2DD] pb-2">
                     Product Info
                  </h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[#7A7670] mb-1">Name</span>
                      <p className="text-sm font-medium text-[#1A1A1A]">{viewJobParams.name}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[#7A7670] mb-1">Assignee</span>
                      <p className="text-sm font-medium text-[#1A1A1A]">{getAssigneeName(viewJobParams)}</p>
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-4 flex items-center gap-2 border-b border-[#E5E2DD] pb-2">
                     Physical Dimensions (CM)
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    {(() => {
                      const dimensions = getDimensions(viewJobParams);
                      const unit = dimensions.unit || 'cm';
                      return (<>
                    <div className="bg-[#F9F8F6] border border-[#E5E2DD] p-3 rounded-xl">
                      <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[#7A7670] mb-1">Width</span>
                      <p className="text-sm font-mono text-[#1A1A1A]">{dimensions.width ?? '-'} {unit}</p>
                    </div>
                    <div className="bg-[#F9F8F6] border border-[#E5E2DD] p-3 rounded-xl">
                      <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[#7A7670] mb-1">Height</span>
                      <p className="text-sm font-mono text-[#1A1A1A]">{dimensions.height ?? '-'} {unit}</p>
                    </div>
                    <div className="bg-[#F9F8F6] border border-[#E5E2DD] p-3 rounded-xl">
                      <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[#7A7670] mb-1">Depth</span>
                      <p className="text-sm font-mono text-[#1A1A1A]">{dimensions.depth ?? dimensions.length ?? '-'} {unit}</p>
                    </div>
                      </>);
                    })()}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-4 flex items-center gap-2 border-b border-[#E5E2DD] pb-2">
                     Instructions & Notes
                  </h3>
                  <div className="space-y-4">
                    {viewJobParams.instructions && (
                      <div className="bg-[#F9F8F6] border border-[#E5E2DD] p-4 rounded-xl">
                        <span className="block text-[10px] font-sans uppercase tracking-[0.15em] text-[#7A7670] mb-2">Instructions</span>
                        <p className="text-sm text-[#1A1A1A] whitespace-pre-wrap leading-relaxed">{viewJobParams.instructions}</p>
                      </div>
                    )}
                    {!viewJobParams.instructions && (
                      <p className="text-sm text-[#7A7670] italic">No special instructions provided.</p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-4 flex items-center gap-2 border-b border-[#E5E2DD] pb-2">
                     Reference Images
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {(viewJobParams.referenceUrls || []).map((url: string, index: number) => (
                      <div key={url} className="border border-[#E5E2DD] rounded-xl overflow-hidden bg-[#F9F8F6] aspect-square flex flex-col relative">
                        <img src={url} alt={`Reference ${index + 1}`} className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-multiply" />
                        <div className="absolute bottom-0 inset-x-0 bg-white/90 backdrop-blur-sm border-t border-[#E5E2DD] py-1.5 px-2">
                          <span className="text-[9px] font-medium text-[#1A1A1A] uppercase tracking-wider">Reference {index + 1}</span>
                        </div>
                      </div>
                    ))}
                    {(!viewJobParams.referenceUrls || viewJobParams.referenceUrls.length === 0) && (
                      <div className="border border-[#E5E2DD] rounded-xl overflow-hidden bg-[#F9F8F6] aspect-square flex items-center justify-center">
                        <BoxIcon className="w-6 h-6 text-[#E5E2DD]" />
                      </div>
                    )}
                  </div>
                </section>

                {role === 'ADMIN' && viewJobParams.status === 'IN_PROGRESS' && (
                  <section>
                    <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-4 flex items-center gap-2 border-b border-[#E5E2DD] pb-2">
                      <UploadCloud className="w-4 h-4 text-[#7A7670]" /> Upload 3D Assets
                    </h3>
                    <UploadDropzone
                      endpoint="adminAssetRoute"
                      onClientUploadComplete={(res) => {
                        const assets: {glb?: string; usdz?: string} = {};
                        res.forEach(r => {
                          if (r.name.endsWith('.glb')) assets.glb = r.url;
                          else if (r.name.endsWith('.usdz')) assets.usdz = r.url;
                          else if (!assets.glb) assets.glb = r.url;
                        });
                        setUploadedAssetUrls(assets);
                      }}
                      onUploadError={(error) => {
                        console.error("Asset upload error:", error.message);
                      }}
                      className="ut-button:bg-[#1A1A1A] ut-button:hover:bg-[#2A2825] ut-button:rounded-full ut-button:text-[10px] ut-button:uppercase ut-button:tracking-widest ut-button:font-medium ut-label:text-[#7A7670] ut-allowed-content:text-[#A3A3A3] ut-upload-icon:text-[#7A7670]"
                    />
                    {(uploadedAssetUrls.glb || uploadedAssetUrls.usdz) && (
                      <div className="flex flex-wrap gap-3 mt-3">
                        {uploadedAssetUrls.glb && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-[11px] font-mono text-emerald-700 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5" /> GLB uploaded
                          </div>
                        )}
                        {uploadedAssetUrls.usdz && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-[11px] font-mono text-emerald-700 flex items-center gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5" /> USDZ uploaded
                          </div>
                        )}
                      </div>
                    )}
                  </section>
                )}

              </div>
            </div>

            <div className="px-8 py-5 border-t border-[#E5E2DD] bg-[#F9F8F6] flex justify-end gap-3">
              <button 
                onClick={() => setViewJobParams(null)}
                className="px-6 py-2.5 bg-white border border-[#E5E2DD] hover:border-[#1A1A1A] rounded-full text-xs uppercase tracking-widest font-medium text-[#1A1A1A] transition-colors"
              >
                Close
              </button>
              {role === 'ADMIN' && viewJobParams.status === 'PENDING' && (
                <button 
                  onClick={async () => {
                    await claimProject(viewJobParams.id);
                    startTransition(() => {
                      router.refresh();
                    });
                    setViewJobParams(null);
                  }}
                  className="px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-xs uppercase tracking-widest font-medium hover:bg-[#2A2825] transition-colors"
                >
                  Claim Task
                </button>
              )}
              {role === 'ADMIN' && viewJobParams.status === 'IN_PROGRESS' && (
                <button 
                  onClick={async () => {
                    if (!uploadedAssetUrls.glb && !uploadedAssetUrls.usdz) return;
                    await submitForReview(viewJobParams.id, { 
                      glb: uploadedAssetUrls.glb || "", 
                      usdz: uploadedAssetUrls.usdz || "" 
                    });
                    startTransition(() => {
                      router.refresh();
                    });
                    setViewJobParams(null);
                  }}
                  className="px-6 py-2.5 bg-emerald-500 text-white rounded-full text-xs uppercase tracking-widest font-medium hover:bg-emerald-600 transition-colors"
                >
                  Submit for Review
                </button>
              )}
            </div>
            
          </div>
        </div>
      )}

      {/* Request Revision Modal */}
      {isRevisionModalOpen && reviewJob && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm transition-opacity" onClick={() => setIsRevisionModalOpen(false)} aria-hidden="true" />
          <div className="relative bg-white w-full max-w-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-[#E5E2DD] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-8 py-6 border-b border-[#E5E2DD] bg-[#F9F8F6]">
              <div>
                <h2 className="text-xl font-serif italic text-[#1A1A1A]">Request Revisions</h2>
                <p className="text-[#7A7670] text-xs mt-1">Provide specific feedback to the generation pipeline.</p>
              </div>
              <button 
                onClick={() => setIsRevisionModalOpen(false)}
                className="p-2 bg-white border border-[#E5E2DD] hover:bg-[#EFEDEA] rounded-full transition-colors outline-none focus-visible:outline-2 focus-visible:outline-[#1A1A1A] shadow-sm"
              >
                <X className="w-5 h-5 text-[#1A1A1A]" aria-hidden="true" />
              </button>
            </div>

            <div className="p-8 space-y-6 bg-white">
              <div>
                <label className="block text-xs font-bold text-[#4A4742] mb-2">Specific Instructions</label>
                <textarea 
                  id="specificInstructions"
                  className="w-full px-4 py-3 rounded-xl border border-[#E5E2DD] bg-[#F9F8F6] focus:border-[#1A1A1A] focus:ring-1 focus:ring-[#1A1A1A] outline-none transition-colors text-sm font-sans resize-none h-32" 
                  placeholder="e.g. The walnut texture on the back legs is slightly too dark. Please lighten it to match the front legs..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#4A4742] mb-2">Reference Images (Optional)</label>
                <div className="border-2 border-dashed border-[#E5E2DD] rounded-xl p-8 flex flex-col items-center justify-center bg-[#F9F8F6] hover:border-[#1A1A1A] transition-colors cursor-pointer group">
                  <UploadCloud className="w-6 h-6 text-[#A3A3A3] mb-3 group-hover:text-[#1A1A1A] transition-colors" />
                  <span className="text-sm font-medium text-[#1A1A1A]">Upload markups or references</span>
                  <span className="text-xs text-[#7A7670] mt-1">Drop images here</span>
                </div>
              </div>
            </div>

            <div className="px-8 py-5 border-t border-[#E5E2DD] bg-[#F9F8F6] flex justify-end gap-3">
              <button 
                onClick={() => setIsRevisionModalOpen(false)}
                className="px-6 py-2.5 bg-white border border-[#E5E2DD] hover:border-[#1A1A1A] rounded-full text-xs uppercase tracking-widest font-medium text-[#1A1A1A] transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  setIsRevisionModalOpen(false);
                  setReviewJob(null);
                }}
                className="px-6 py-2.5 bg-[#1A1A1A] text-white rounded-full text-[11px] uppercase tracking-widest font-bold hover:bg-[#2A2825] active:scale-95 transition-transform duration-200 shadow-md"
              >
                Submit Revision
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
