"use client";
import React, { useState } from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Search, Filter } from 'lucide-react';
import { PROJECT_STATUS_META } from "@/lib/status";
import { Table, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import type { ProjectStatus } from "@/generated/prisma/client";

type Job = {
  id: string;
  product: string;
  date: string;
  completed: string;
  status: ProjectStatus;
};

function getStatusBadge(status: ProjectStatus) {
  const meta = PROJECT_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge tone={meta.tone} icon={<Icon className="w-3 h-3" />}>
      {meta.label}
    </Badge>
  );
}

export default function NotificationsClient({ initialJobs }: { initialJobs: Job[] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'All'>('All');

  const statusOptions: ProjectStatus[] = ['PENDING', 'REVISIONS', 'COMPLETED', 'PUBLISHED'];

  const filteredJobs = initialJobs.filter(job => {
    const matchesSearch = job.product.toLowerCase().includes(searchTerm.toLowerCase()) || job.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || job.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <DashboardLayout title="Notifications">
      <div className="space-y-6 animate-in fade-in duration-500">

        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Search by Product Name or Job ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface)] text-sm focus:outline-none focus:border-[var(--color-text-primary)] transition-colors"
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ProjectStatus | 'All')}
                className="pl-10 pr-8 py-2.5 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface)] text-sm focus:outline-none focus:border-[var(--color-text-primary)] transition-colors appearance-none cursor-pointer"
              >
                <option value="All">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_META[status].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-3xl overflow-hidden shadow-sm">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-bold">Job ID</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-bold">Product Name</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-bold">Initiated Date</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-bold">Completion Time</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-bold">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="text-xs font-mono text-[var(--color-text-primary)]">{job.id}</TableCell>
                    <TableCell className="text-sm text-[var(--color-text-primary)] font-medium">{job.product}</TableCell>
                    <TableCell className="text-xs text-[var(--color-text-secondary)]">{job.date}</TableCell>
                    <TableCell className="text-xs text-[var(--color-text-secondary)]">{job.completed}</TableCell>
                    <TableCell>
                      {getStatusBadge(job.status)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableEmptyState colSpan={5} message="No jobs found matching your criteria." />
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}