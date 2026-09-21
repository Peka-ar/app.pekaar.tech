"use client";

import React from "react";
import { Search, Filter, List as ListIcon, LayoutGrid } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/components/ui/cn";

export function TaskToolbar({
  search,
  onSearch,
  statusFilter,
  onStatusFilter,
  statusOptions,
  count,
  viewMode,
  onViewMode,
  searchPlaceholder = "Search tasks or SKUs…",
}: {
  search: string;
  onSearch: (v: string) => void;
  statusFilter: string;
  onStatusFilter: (v: string) => void;
  statusOptions: { value: string; label: string }[];
  count: number;
  viewMode?: "board" | "list";
  onViewMode?: (v: "board" | "list") => void;
  searchPlaceholder?: string;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-[24px] bg-[var(--color-canvas)] px-4 py-3 shadow-[var(--shadow-1)] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
        <div className="w-full sm:w-64">
          <Input
            type="search"
            aria-label="Search tasks"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={searchPlaceholder}
            leftIcon={<Search className="h-4 w-4" aria-hidden="true" />}
          />
        </div>
        <div className="w-full sm:w-44">
          <Select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => onStatusFilter(e.target.value)}
            icon={<Filter className="h-3.5 w-3.5" aria-hidden="true" />}
          >
            <option value="all">All Statuses</option>
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="pill shrink-0 bg-[var(--color-canvas-soft)] tabular-nums text-[var(--color-text-secondary)]">
          {count} {count === 1 ? "task" : "tasks"}
        </span>
        {viewMode && onViewMode && (
          <div
            role="tablist"
            aria-label="View mode"
            className="flex shrink-0 items-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-canvas)] p-1"
          >
            {(
              [
                { id: "list", label: "List", icon: ListIcon },
                { id: "board", label: "Board", icon: LayoutGrid },
              ] as const
            ).map((v) => {
              const Icon = v.icon;
              const active = viewMode === v.id;
              return (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => onViewMode(v.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-1.5 font-sans text-[11px] font-medium uppercase tracking-widest transition-colors",
                    active
                      ? "bg-[var(--color-canvas-soft)] text-[var(--color-text-primary)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" /> {v.label}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
