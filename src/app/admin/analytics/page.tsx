import React from 'react';
import AdminLayout from "@/components/admin/AdminLayout";
import { Users, Box, UserPlus, Activity, ArrowRight } from 'lucide-react';
import { requirePrincipalOrRedirect } from '@/server/auth-guards';
import { Role } from '@/server/auth-guards';
import { formatCount } from '@/lib/utils';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { LinkButton } from '@/components/ui/LinkButton';
import { PROJECT_STATUS_META } from '@/lib/status';
import { getPlatformKPIs, getSignupsSeries, getTopBrands } from "@/app/actions/admin-analytics";

function formatDate(date: Date) {
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function toShortMonth(isoLabel: string): string {
  const d = new Date(isoLabel + '-01');
  return d.toLocaleDateString('en-US', { month: 'short' });
}

export default async function AdminAnalyticsPage() {
  const principal = await requirePrincipalOrRedirect({ roles: [Role.ADMIN] });

  const [kpis, signupsSeries, topBrands] = await Promise.all([
    getPlatformKPIs(),
    getSignupsSeries(12),
    getTopBrands(10),
  ]);

  const { totalUsers, totalProjects, signupsThisMonth, eventsThisMonth, projectsByStatus } = kpis;

  // Fixed well per slot (not cycled): accent-pale → sky → butter → forest anchor.
  const KPI_WELLS = [
    { bg: "var(--accent-pale)", fg: "var(--ink-deep)" },
    { bg: "var(--surface-sky)", fg: "var(--surface-sky-deep)" },
    { bg: "var(--surface-butter)", fg: "var(--surface-butter-deep)" },
    { bg: "var(--forest)", fg: "var(--on-forest)" },
  ];

  const totalStatusCount = projectsByStatus.reduce((sum, s) => sum + s._count, 0);

  const metrics = [
    { label: 'Total Users', value: formatCount(totalUsers), icon: Users },
    { label: 'Total Projects', value: formatCount(totalProjects), icon: Box },
    { label: 'Signups (This Month)', value: formatCount(signupsThisMonth), icon: UserPlus },
    { label: 'Events (This Month)', value: formatCount(eventsThisMonth), icon: Activity },
  ];

  const maxCount = Math.max(1, ...signupsSeries.counts);
  const totalSignupsAll = signupsSeries.counts.reduce((sum, n) => sum + n, 0);

  return (
    <AdminLayout
      title="Platform Analytics"
      user={{
        name: principal.companyName,
        email: principal.email,
        role: principal.role,
      }}
    >
      <div className="space-y-8 animate-in fade-in duration-500">

        <div>
          <p className="label-mono text-[var(--color-text-muted)] mb-1">Platform analytics</p>
          <h2 className="page-title text-[var(--color-text-primary)] mb-2">Platform Analytics</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Platform-wide KPIs, signup momentum, and project distribution.</p>
        </div>

        {/* Section 1 — Platform KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, i) => {
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
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: well.bg, color: well.fg }}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                  </div>
                  <div className="label-mono text-[var(--color-text-muted)] mb-1">{metric.label}</div>
                  <div className="font-display text-3xl font-bold tracking-tight tabular-nums text-[var(--color-text-primary)]">{metric.value}</div>
                </CardBody>
              </Card>
              </div>
            );
          })}
        </div>

        {/* Section 2 — Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Signups Over Time */}
          <Card className="rounded-[24px]">
            <CardBody className="pt-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h3 className="label-mono text-[var(--color-text-primary)]">Signups Over Time</h3>
                <span className="pill bg-[var(--accent-pale)] text-[var(--positive-deep)] tabular-nums shrink-0">
                  {formatCount(totalSignupsAll)} signups · 12 mo
                </span>
              </div>
              <div className="h-64 w-full flex items-end gap-2 sm:gap-4 relative pt-10">
                <div className="absolute inset-x-0 top-10 border-t border-dashed border-[var(--color-border-default)] w-full" />
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--color-border-default)] w-full" />
                <div className="absolute inset-x-0 bottom-6 border-t border-dashed border-[var(--color-border-default)] w-full" />

                {signupsSeries.counts.map((count, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end h-full z-10 group cursor-crosshair">
                    <div
                      className="w-full bg-[var(--color-accent)] rounded-t-sm group-hover:bg-[var(--color-accent-active)] transition-[background-color] relative"
                      style={{ height: `${(count / maxCount) * 100}%`, maxHeight: 'calc(100% - 24px)' }}
                    >
                      <div aria-hidden="true" className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-canvas)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] shadow-[var(--shadow-1)] text-[9px] font-sans tabular-nums px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {count.toLocaleString()} signups
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[9px] font-sans tracking-widest text-[var(--color-text-muted)]">
                {signupsSeries.labels.map((label, i) => (
                  <span key={i}>{toShortMonth(label)}</span>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Projects by Status */}
          <Card className="rounded-[24px] overflow-hidden">
            <CardHeader>
              <h3 className="label-mono text-[var(--color-text-primary)]">Projects by Status</h3>
            </CardHeader>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell className="th-mono">Status</TableCell>
                  <TableCell className="th-mono text-right">Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projectsByStatus.length > 0 ? projectsByStatus.map((item) => {
                  const meta = PROJECT_STATUS_META[item.status];
                  const share = totalStatusCount > 0 ? Math.round((item._count / totalStatusCount) * 100) : 0;
                  return (
                    <TableRow key={item.status}>
                      <TableCell>
                        <Badge tone={meta.tone} icon={React.createElement(meta.icon, { className: 'w-3 h-3' })}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-3">
                          <div
                            className="hidden sm:block h-1.5 w-24 rounded-full bg-[var(--color-canvas-soft)] overflow-hidden"
                            role="img"
                            aria-label={`${meta.label}: ${share}% of projects`}
                          >
                            <div
                              className="h-full bg-[var(--color-primary)] rounded-full"
                              style={{ width: `${share}%` }}
                            />
                          </div>
                          <span className="font-display text-lg font-bold tracking-tight tabular-nums text-[var(--color-text-primary)]">{item._count}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }) : (
                  <TableEmptyState colSpan={2} message="No projects created yet" />
                )}
              </TableBody>
            </Table>
          </Card>

        </div>

        {/* Section 3 — Top Brands */}
        <Card className="rounded-[24px] overflow-hidden">
          <CardHeader>
            <h3 className="label-mono text-[var(--color-text-primary)]">Top Brands</h3>
          </CardHeader>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="th-mono">Brand Name</TableCell>
                <TableCell className="th-mono">Email</TableCell>
                <TableCell className="th-mono">Projects</TableCell>
                <TableCell className="th-mono">Status</TableCell>
                <TableCell className="th-mono">Joined</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {topBrands.length > 0 ? topBrands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">{brand.name ?? 'Unnamed Brand'}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[var(--color-text-secondary)]">{brand.email}</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-display text-lg font-bold tracking-tight text-[var(--color-text-primary)]">{brand._count.projects}</span>
                  </TableCell>
                  <TableCell>
                    <Badge tone={brand.status === 'ACTIVE' ? 'success' : 'danger'}>
                      {brand.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-sans text-[var(--color-text-muted)]">{formatDate(new Date(brand.createdAt))}</span>
                  </TableCell>
                </TableRow>
              )) : (
                <TableEmptyState colSpan={5} message="No brands registered yet" />
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Section 4 — Admin Notes */}
        <Card className="rounded-[24px]">
          <CardBody className="flex items-center justify-between">
            <div>
              <h3 className="label-mono text-[var(--color-text-primary)] mb-1">Admin Analytics</h3>
              <p className="text-xs text-[var(--color-text-muted)]">These analytics reflect platform-wide data. For per-project analytics, visit the existing Analytics page.</p>
            </div>
            <LinkButton href="/analytics" variant="tertiary" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
              Per-Project Analytics
            </LinkButton>
          </CardBody>
        </Card>

      </div>
    </AdminLayout>
  );
}
