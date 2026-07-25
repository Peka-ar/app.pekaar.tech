import React, { Suspense } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Users, Box, UserCheck, Activity } from "lucide-react";
import { requirePrincipalOrRedirect } from "@/lib/auth-guards";
import { Role } from "@/generated/prisma/client";
import {
  getPlatformKPIs,
  getSignupsSeries,
  getTopBrands,
  getProjectsByMonth,
} from "@/app/actions/admin-analytics";
import { formatCount } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableEmptyState,
} from "@/components/ui/Table";
import { AdminDashboardSkeleton } from "./AdminDashboardSkeleton";
import AdminDashboardError from "./AdminDashboardError";

export default async function AdminDashboardPage() {
  const principal = await requirePrincipalOrRedirect({ roles: [Role.ADMIN] });
  return (
    <AdminLayout
      title="Admin Dashboard"
      user={{
        name: principal.companyName,
        email: principal.email,
        role: principal.role,
      }}
    >
      <Suspense fallback={<AdminDashboardSkeleton />}>
        <AdminDashboardContent />
      </Suspense>
    </AdminLayout>
  );
}

async function AdminDashboardContent() {
  const [kpis, signups, projectsByMonth, brands] = await Promise.all([
    getPlatformKPIs().catch(() => null),
    getSignupsSeries(12).catch(() => null),
    getProjectsByMonth(12).catch(() => null),
    getTopBrands(10).catch(() => null),
  ]);

  if (!kpis || !signups || !projectsByMonth || !brands) {
    return <AdminDashboardError />;
  }

  const {
    totalUsers,
    totalProjects,
    suspendedUsers,
    eventsThisMonth,
  } = kpis;

  const activeUsers = totalUsers - suspendedUsers;

  const METRICS = [
    { label: "Total Users", value: formatCount(totalUsers), icon: Users },
    { label: "Total Projects", value: formatCount(totalProjects), icon: Box },
    {
      label: "Active Users",
      value: formatCount(activeUsers),
      icon: UserCheck,
    },
    {
      label: "Events This Month",
      value: formatCount(eventsThisMonth),
      icon: Activity,
    },
  ];

  const maxSignupCount = Math.max(1, ...signups.counts);
  const monthLabels = signups.labels.map((l) => {
    const d = new Date(l + "-01");
    return d.toLocaleDateString("en-US", { month: "short" });
  });

  const maxProjectCount = Math.max(1, ...projectsByMonth.counts);
  const monthLabelsProjects = projectsByMonth.labels.map((l) => {
    const d = new Date(l + "-01");
    return d.toLocaleDateString("en-US", { month: "short" });
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-serif italic text-[var(--color-text-primary)] mb-2">
          Welcome to your Dashboard
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Platform overview at a glance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <Card key={i}>
              <CardBody className="flex flex-col hover:border-[var(--color-text-primary)] transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-canvas)] border border-[var(--color-border-default)] flex items-center justify-center">
                    <Icon
                      className="w-4 h-4 text-[var(--color-text-muted)]"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest font-mono mb-1">
                  {metric.label}
                </div>
                <div className="text-3xl font-serif italic text-[var(--color-text-primary)]">
                  {metric.value}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardBody className="pt-6">
            <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)] mb-6">
              Projects by Month
            </h3>
            <div className="h-64 w-full flex items-end gap-2 sm:gap-4 relative pt-10">
              <div className="absolute inset-x-0 top-10 border-t border-dashed border-[var(--color-border-default)] w-full" />
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--color-border-default)] w-full" />
              <div className="absolute inset-x-0 bottom-6 border-t border-dashed border-[var(--color-text-primary)] w-full" />
              {projectsByMonth.counts.map((count, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col justify-end h-full z-10 group cursor-crosshair"
                >
                  <div
                    className="w-full bg-[var(--color-canvas-secondary)] rounded-t-sm group-hover:bg-[var(--color-text-primary)] transition-colors relative"
                    style={{
                      height: `${(count / maxProjectCount) * 100}%`,
                      maxHeight: "calc(100% - 24px)",
                    }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-text-primary)] text-[var(--color-canvas)] text-[9px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {count.toLocaleString()} Projects
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-mono tracking-widest text-[var(--color-text-muted)]">
              {monthLabelsProjects.map((label, i) => (
                <span key={i}>{label}</span>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="pt-6">
            <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)] mb-6">
              Signups by Month
            </h3>
            <div className="h-64 w-full flex items-end gap-2 sm:gap-4 relative pt-10">
              <div className="absolute inset-x-0 top-10 border-t border-dashed border-[var(--color-border-default)] w-full" />
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--color-border-default)] w-full" />
              <div className="absolute inset-x-0 bottom-6 border-t border-dashed border-[var(--color-text-primary)] w-full" />
              {signups.counts.map((count, i) => (
                <div
                  key={i}
                  className="flex-1 flex flex-col justify-end h-full z-10 group cursor-crosshair"
                >
                  <div
                    className="w-full bg-[var(--color-canvas-secondary)] rounded-t-sm group-hover:bg-[var(--color-text-primary)] transition-colors relative"
                    style={{
                      height: `${(count / maxSignupCount) * 100}%`,
                      maxHeight: "calc(100% - 24px)",
                    }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-text-primary)] text-[var(--color-canvas)] text-[9px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {count.toLocaleString()} Signups
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-mono tracking-widest text-[var(--color-text-muted)]">
              {monthLabels.map((label, i) => (
                <span key={i}>{label}</span>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Brands</CardTitle>
        </CardHeader>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">
                Brand Name
              </TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">
                Email
              </TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">
                Projects
              </TableCell>
              <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {brands.length > 0 ? (
              brands.map((brand) => {
                const statusTone =
                  brand.status === "SUSPENDED" ? "danger" : "success";
                return (
                  <TableRow key={brand.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-border-default)] flex items-center justify-center">
                          <Users className="w-4 h-4 text-[var(--color-text-muted)]" />
                        </div>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">
                          {brand.name ?? "Unnamed"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[var(--color-text-muted)]">
                        {brand.email}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg font-serif italic text-[var(--color-text-primary)]">
                        {brand._count.projects.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge tone={statusTone}>
                        {brand.status === "SUSPENDED"
                          ? "Suspended"
                          : "Active"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableEmptyState colSpan={4} message="No brands found." />
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
