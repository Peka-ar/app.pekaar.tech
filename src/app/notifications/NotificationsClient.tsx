"use client";
import React, { useState } from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Search, Filter } from 'lucide-react';
import { PROJECT_STATUS_META } from "@/lib/status";
import { Table, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { ProjectStatus } from "@/lib/enums";

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
  const [isAllRead, setIsAllRead] = useState(false);

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
          <div className="max-w-md w-full">
            <Input
              type="text"
              placeholder="Search by Product Name or Job ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>

          <div className="flex items-center gap-3">
            <div className="w-full sm:w-52">
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as ProjectStatus | 'All')}
                icon={<Filter className="w-3.5 h-3.5" />}
              >
                <option value="All">All Statuses</option>
                {statusOptions.map(status => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_META[status].label}
                  </option>
                ))}
              </Select>
            </div>
            <Button variant="tertiary" size="sm" onClick={() => setIsAllRead(true)} className="hidden sm:inline-flex">
              Mark all read
            </Button>
          </div>
        </div>

        <Table>
          <TableHead>
              <TableRow>
                <TableCell className="th-mono">Job ID</TableCell>
                <TableCell className="th-mono">Product Name</TableCell>
                <TableCell className="th-mono">Initiated Date</TableCell>
                <TableCell className="th-mono">Completion Time</TableCell>
                <TableCell className="th-mono">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredJobs.length > 0 ? (
                filteredJobs.map((job, idx) => {
                  const isUnread = !isAllRead && idx === 0;
                  return (
                    <TableRow key={job.id} className={isUnread ? 'bg-[var(--accent-pale)]/60' : ''}>
                      <TableCell className="text-xs font-sans text-[var(--color-text-primary)]">
                        <span className="inline-flex items-center gap-2">
                          {isUnread && <span className="w-2 h-2 rounded-full bg-[var(--accent)] shrink-0" aria-hidden="true" />}
                          {job.id}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-[var(--color-text-primary)] font-medium">{job.product}</TableCell>
                      <TableCell className="text-xs font-sans text-[var(--color-text-muted)]">{job.date}</TableCell>
                      <TableCell className="text-xs font-sans text-[var(--color-text-muted)]">{job.completed}</TableCell>
                      <TableCell>
                        {getStatusBadge(job.status)}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableEmptyState colSpan={5} message="No jobs found matching your criteria." />
              )}
            </TableBody>
          </Table>
      </div>
    </DashboardLayout>
  );
}