import React from 'react';
import AdminLayout from "@/components/admin/AdminLayout";
import { Users, Box, UserPlus, Activity, ArrowRight } from 'lucide-react';
import { requirePrincipalOrRedirect } from '@/lib/auth-guards';
import { Role } from '@/lib/auth-guards';
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

  const metrics = [
    { label: 'Total Users', value: formatCount(totalUsers), icon: Users },
    { label: 'Total Projects', value: formatCount(totalProjects), icon: Box },
    { label: 'Signups (This Month)', value: formatCount(signupsThisMonth), icon: UserPlus },
    { label: 'Events (This Month)', value: formatCount(eventsThisMonth), icon: Activity },
  ];

  const maxCount = Math.max(1, ...signupsSeries.counts);

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

        {/* Section 1 — Platform KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <Card key={i}>
                <CardBody className="flex flex-col hover:border-[var(--color-text-primary)] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-canvas)] border border-[var(--color-border-default)] flex items-center justify-center mb-4">
                    <Icon className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                  </div>
                  <div className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest font-mono mb-1">{metric.label}</div>
                  <div className="text-3xl font-serif italic text-[var(--color-text-primary)]">{metric.value}</div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Section 2 — Two-column grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* Signups Over Time */}
          <Card>
            <CardBody className="pt-6">
              <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)] mb-6">Signups Over Time</h3>
              <div className="h-64 w-full flex items-end gap-2 sm:gap-4 relative pt-10">
                <div className="absolute inset-x-0 top-10 border-t border-dashed border-[var(--color-border-default)] w-full" />
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--color-border-default)] w-full" />
                <div className="absolute inset-x-0 bottom-6 border-t border-dashed border-[var(--color-text-primary)] w-full" />

                {signupsSeries.counts.map((count, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end h-full z-10 group cursor-crosshair">
                    <div
                      className="w-full bg-[var(--color-border-default)] rounded-t-sm group-hover:bg-[var(--color-text-primary)] transition-colors relative"
                      style={{ height: `${(count / maxCount) * 100}%`, maxHeight: 'calc(100% - 24px)' }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-text-primary)] text-[var(--color-canvas)] text-[9px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {count.toLocaleString()} signups
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2 text-[9px] font-mono tracking-widest text-[var(--color-text-muted)]">
                {signupsSeries.labels.map((label, i) => (
                  <span key={i}>{toShortMonth(label)}</span>
                ))}
              </div>
            </CardBody>
          </Card>

          {/* Projects by Status */}
          <Card>
            <CardHeader>
              <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">Projects by Status</h3>
            </CardHeader>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Status</TableCell>
                  <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal text-right">Count</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {projectsByStatus.length > 0 ? projectsByStatus.map((item) => {
                  const meta = PROJECT_STATUS_META[item.status];
                  return (
                    <TableRow key={item.status}>
                      <TableCell>
                        <Badge tone={meta.tone} icon={React.createElement(meta.icon, { className: 'w-3 h-3' })}>
                          {meta.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-lg font-serif italic text-[var(--color-text-primary)]">{item._count}</span>
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
        <Card>
          <CardHeader>
            <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">Top Brands</h3>
          </CardHeader>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Brand Name</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Email</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Projects</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Status</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Joined</TableCell>
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
                    <span className="text-lg font-serif italic text-[var(--color-text-primary)]">{brand._count.projects}</span>
                  </TableCell>
                  <TableCell>
                    <Badge tone={brand.status === 'ACTIVE' ? 'success' : 'danger'}>
                      {brand.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-mono text-[var(--color-text-muted)]">{formatDate(new Date(brand.createdAt))}</span>
                  </TableCell>
                </TableRow>
              )) : (
                <TableEmptyState colSpan={5} message="No brands registered yet" />
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Section 4 — Admin Notes */}
        <Card>
          <CardBody className="flex items-center justify-between">
            <div>
              <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)] mb-1">Admin Analytics</h3>
              <p className="text-xs text-[var(--color-text-muted)]">These analytics reflect platform-wide data. For per-project analytics, visit the existing Analytics page.</p>
            </div>
            <LinkButton href="/analytics" variant="secondary" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
              Per-Project Analytics
            </LinkButton>
          </CardBody>
        </Card>

      </div>
    </AdminLayout>
  );
}
