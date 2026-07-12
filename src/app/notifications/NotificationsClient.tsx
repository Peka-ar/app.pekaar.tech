"use client";
import React, { useState } from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Search, Filter, CheckCircle2, AlertTriangle, Clock, RefreshCw } from 'lucide-react';

function getStatusBadge(status: string) {
  switch (status) {
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3" />
          Completed
        </span>
      );
    case 'Failed':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase bg-red-50 text-red-700 border border-red-200">
          <AlertTriangle className="w-3 h-3" />
          Failed
        </span>
      );
    case 'Processing':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase bg-amber-50 text-amber-700 border border-amber-200">
          <RefreshCw className="w-3 h-3 animate-spin" />
          Processing
        </span>
      );
    case 'Queued':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase bg-[#EFEDEA] text-[#4A4742] border border-[#E5E2DD]">
          <Clock className="w-3 h-3" />
          Queued
        </span>
      );
    default:
      return null;
  }
}

export default function NotificationsClient({ initialJobs }: { initialJobs: { id: string; product: string; date: string; completed: string; status: string }[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const filteredJobs = initialJobs.filter(job => {
    const matchesSearch = job.product.toLowerCase().includes(searchTerm.toLowerCase()) || job.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || job.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout title="Status History">
      <div className="space-y-6 animate-in fade-in duration-500">
        
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7670]" />
            <input 
              type="text" 
              placeholder="Search by Product Name or Job ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E2DD] bg-white text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7670]" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-2.5 rounded-xl border border-[#E5E2DD] bg-white text-sm focus:outline-none focus:border-[#1A1A1A] transition-colors appearance-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Completed">Completed</option>
                <option value="Processing">Processing</option>
                <option value="Queued">Queued</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E5E2DD] rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F9F8F6] border-b border-[#E5E2DD]">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-bold">Job ID</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-bold">Product Name</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-bold">Initiated Date</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-bold">Completion Time</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2DD]">
                {filteredJobs.length > 0 ? (
                  filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-[#F9F8F6] transition-colors">
                      <td className="px-6 py-4 text-xs font-mono text-[#1A1A1A]">{job.id}</td>
                      <td className="px-6 py-4 text-sm text-[#1A1A1A] font-medium">{job.product}</td>
                      <td className="px-6 py-4 text-xs text-[#4A4742]">{job.date}</td>
                      <td className="px-6 py-4 text-xs text-[#4A4742]">{job.completed}</td>
                      <td className="px-6 py-4">
                        {getStatusBadge(job.status)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#7A7670] text-sm">
                      No jobs found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
