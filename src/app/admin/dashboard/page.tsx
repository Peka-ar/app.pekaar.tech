import React, { Suspense } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Users, Box, UserCheck, Activity, ArrowUpRight } from "lucide-react";
import { requirePrincipalOrRedirect } from "@/server/auth-guards";
import { Role } from "@/server/auth-guards";
import {
  getPlatformKPIs,
  getSignupsSeries,
  getTopBrands,
  getProjectsByMonth,
} from "@/app/actions/admin-analytics";
import { formatCount } from "@/lib/utils";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChartBars } from "@/components/charts/ChartBars";
import { LinkButton } from "@/components/ui/LinkButton";
import { PROJECT_STATUS_META } from "@/lib/status";
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

// Fixed well per slot (not cycled): accent-pale → sky → butter → forest anchor.
const KPI_WELLS = [
  { bg: "var(--accent-pale)", fg: "var(--ink-deep)" },
  { bg: "var(--surface-sky)", fg: "var(--surface-sky-deep)" },
  { bg: "var(--surface-butter)", fg: "var(--surface-butter-deep)" },
  { bg: "var(--forest)", fg: "var(--on-forest)" },
];

const AVATAR_WELLS = [
  { bg: "var(--accent-pale)", fg: "var(--ink-deep)" },
  { bg: "var(--surface-sky)", fg: "var(--surface-sky-deep)" },
  { bg: "var(--surface-butter)", fg: "var(--surface-butter-deep)" },
  { bg: "var(--forest)", fg: "var(--on-forest)" },
];

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

  const monthLabels = signups.labels.map((l) => {
    const d = new Date(l + "-01");
    return d.toLocaleDateString("en-US", { month: "short" });
  });

  const totalProjects12 = projectsByMonth.counts.reduce((sum, n) => sum + n, 0);
  const totalSignups12 = signups.counts.reduce((sum, n) => sum + n, 0);
  const monthLabelsProjects = projectsByMonth.labels.map((l) => {
    const d = new Date(l + "-01");
    return d.toLocaleDateString("en-US", { month: "short" });
  });

  const statusByKey = new Map(kpis.projectsByStatus.map((s) => [s.status, s._count]));
  const statusTiles = (["PENDING", "REVISIONS", "COMPLETED", "PUBLISHED"] as const).map(
    (status) => ({ status, count: statusByKey.get(status) ?? 0 })
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="label-mono text-[var(--color-text-muted)] mb-1">Platform overview</p>
          <h2 className="page-title text-[var(--color-text-primary)] mb-2">
            Welcome to your Dashboard
          </h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Platform overview at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LinkButton href="/admin/tasks" variant="primary" size="sm" rightIcon={<ArrowUpRight className="w-3 h-3" />}>
            Manage Tasks
          </LinkButton>
          <LinkButton href="/admin/users" variant="tertiary" size="sm">
            View Users
          </LinkButton>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric, i) => {
          const Icon = metric.icon;
          const well = KPI_WELLS[i % KPI_WELLS.length];
          return (
            <div
              key={i}
              className="animate-in fade-in duration-500"
              // Staggered entrance: one chunk per card, ~100ms apart, runs once on mount.
              style={{ animationDelay: `${i * 100}ms` }}
            >
            <Card
              className="rounded-[24px] h-full hover:shadow-[var(--shadow-1)] transition-[box-shadow]"
            >
              <CardBody className="flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: well.bg, color: well.fg }}
                  >
                    <Icon
                      className="w-4 h-4"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className="label-mono text-[var(--color-text-muted)] mb-1">
                  {metric.label}
                </div>
                <div className="font-display text-3xl font-bold tracking-tight tabular-nums text-[var(--color-text-primary)]">
                  {metric.value}
                </div>
              </CardBody>
            </Card>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusTiles.map(({ status, count }) => {
          const meta = PROJECT_STATUS_META[status];
          const Icon = meta.icon;
          return (
            <div
              key={status}
              className="bg-[var(--color-canvas)] rounded-[24px] px-4 py-3 flex items-center gap-3"
            >
              <Badge tone={meta.tone} icon={<Icon className="w-3 h-3" />}>
                {meta.label}
              </Badge>
              <span className="font-display text-xl font-bold tracking-tight tabular-nums text-[var(--color-text-primary)]">
                {count.toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="rounded-[24px]">
          <CardBody className="pt-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h3 className="label-mono text-[var(--color-text-primary)]">
                Projects by Month
              </h3>
              <span className="pill bg-[var(--accent-pale)] text-[var(--positive-deep)] tabular-nums shrink-0">
                {formatCount(totalProjects12)} projects · 12 mo
              </span>
            </div>
            <ChartBars
              counts={projectsByMonth.counts}
              labels={monthLabelsProjects}
              noun="project"
              emptyTitle="No projects yet"
              emptyHint="Projects created by brands will appear here by month."
              emptyIcon={<Box className="w-6 h-6" aria-hidden="true" />}
            />
          </CardBody>
        </Card>

        <Card className="rounded-[24px]">
          <CardBody className="pt-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h3 className="label-mono text-[var(--color-text-primary)]">
                Signups by Month
              </h3>
              <span className="pill bg-[var(--accent-pale)] text-[var(--positive-deep)] tabular-nums shrink-0">
                {formatCount(totalSignups12)} signups · 12 mo
              </span>
            </div>
            <ChartBars
              counts={signups.counts}
              labels={monthLabels}
              noun="signup"
              emptyTitle="No signups yet"
              emptyHint="New brand registrations will appear here by month."
              emptyIcon={<Users className="w-6 h-6" aria-hidden="true" />}
            />
          </CardBody>
        </Card>
      </div>

      <Card className="rounded-[24px] overflow-hidden">
        <CardHeader>
          <CardTitle>Top Brands</CardTitle>
        </CardHeader>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell className="th-mono">
                Brand Name
              </TableCell>
              <TableCell className="th-mono">
                Email
              </TableCell>
              <TableCell className="th-mono">
                Projects
              </TableCell>
              <TableCell className="th-mono">
                Status
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {brands.length > 0 ? (
              brands.map((brand, i) => {
                const well = AVATAR_WELLS[i % AVATAR_WELLS.length];
                const statusTone =
                  brand.status === "SUSPENDED" ? "danger" : "success";
                return (
                  <TableRow key={brand.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: well.bg, color: well.fg }}
                        >
                          <Users className="w-4 h-4" strokeWidth={2} />
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
                      <span className="font-display text-lg font-bold tracking-tight tabular-nums text-[var(--color-text-primary)]">
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
