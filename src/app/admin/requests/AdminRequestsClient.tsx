"use client";

import React, { useState, useEffect, useTransition } from "react";
import { Card } from "@/components/ui/Card";
import { Table, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { Trash2, ChevronDown, ChevronUp } from "lucide-react";
import {
  adminListContactRequests,
  adminUpdateContactRequest,
  adminDeleteContactRequest,
} from "@/app/actions/subscription";
import { ContactRequestStatus } from "@/lib/enums";
import { formatDistanceToNow } from "date-fns";

type ContactRequest = {
  $id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  interestedTier: string;
  status: string;
  sourceIp: string | null;
  $createdAt: string;
};

const statusTone = (status: string) => {
  switch (status) {
    case "NEW": return "info" as const;
    case "CONTACTED": return "warning" as const;
    case "RESOLVED": return "success" as const;
    default: return "neutral" as const;
  }
};

const tierTone = (tier: string) => {
  switch (tier) {
    case "PREMIUM": return "success" as const;
    case "BUSINESS": return "info" as const;
    case "ENTERPRISE": return "inverted" as const;
    default: return "neutral" as const;
  }
};

export function AdminRequestsClient() {
  const [requests, setRequests] = useState<ContactRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    adminListContactRequests(statusFilter ? (statusFilter as ContactRequestStatus) : undefined)
      .then((result) => {
        if (cancelled) return;
        setRequests(result.requests as ContactRequest[]);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load requests");
      });
    return () => { cancelled = true; };
  }, [statusFilter]);

  const handleStatusChange = (id: string, newStatus: ContactRequestStatus) => {
    startTransition(async () => {
      const result = await adminUpdateContactRequest(id, newStatus);
      if (result.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.$id === id ? { ...r, status: newStatus } : r))
        );
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm("Permanently delete this contact request?")) return;
    startTransition(async () => {
      const result = await adminDeleteContactRequest(id);
      if (result.ok) {
        setRequests((prev) => prev.filter((r) => r.$id !== id));
      }
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="label-mono text-[var(--text-muted)] mb-1">Admin</p>
          <h2 className="page-title text-[var(--text-primary)]">Contact Requests</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Inquiries from the pricing page contact form.
          </p>
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-40"
        >
          <option value="">All Statuses</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="RESOLVED">Resolved</option>
        </Select>
      </div>

      {error && (
        <div className="text-sm text-[var(--negative-deep)]" role="alert">
          {error}
        </div>
      )}

      <Card>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] font-normal">Email</TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] font-normal">Name</TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] font-normal">Company</TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] font-normal">Tier</TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] font-normal">Status</TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] font-normal">Created</TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] font-normal w-24">{" "}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {requests.length === 0 && !error ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell>{" "}</TableCell>
                </TableRow>
              ))
            ) : requests.length === 0 ? (
              <TableEmptyState
                colSpan={7}
                message="No contact requests yet."
              />
            ) : (
              requests.map((req) => (
                <React.Fragment key={req.$id}>
                  <TableRow>
                    <TableCell>
                      <span className="font-medium text-[var(--text-primary)] text-sm">{req.email}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[var(--text-secondary)] text-sm">{req.name}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[var(--text-secondary)] text-sm">{req.company ?? "\u2014"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge tone={tierTone(req.interestedTier)}>{req.interestedTier}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge tone={statusTone(req.status)}>{req.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-[var(--text-secondary)] text-sm">
                        {formatDistanceToNow(new Date(req.$createdAt), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedId(expandedId === req.$id ? null : req.$id)}
                          aria-label={expandedId === req.$id ? "Collapse message" : "Expand message"}
                        >
                          {expandedId === req.$id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(req.$id)}
                          aria-label="Delete request"
                          className="text-[var(--negative)]"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedId === req.$id && (
                    <TableRow>
                      <td colSpan={7} className="px-3 sm:px-6 py-3 sm:py-4 bg-[var(--canvas-soft)]">
                        <div className="py-3 px-2 space-y-3">
                          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{req.message}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)]">Set status:</span>
                            {(["NEW", "CONTACTED", "RESOLVED"] as const).map((s) => (
                              <Button
                                key={s}
                                variant={req.status === s ? "primary" : "tertiary"}
                                size="sm"
                                onClick={() => handleStatusChange(req.$id, s)}
                                disabled={isPending || req.status === s}
                              >
                                {s}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </td>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
