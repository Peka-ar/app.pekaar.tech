import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ArrowUpRight, ArrowDownRight, Activity, Box, Eye, Smartphone } from 'lucide-react';
import Image from 'next/image';
import { getUserProjects } from "@/app/actions/project";
import { requirePrincipalOrRedirect } from "@/server/auth-guards";
import { formatDistanceToNow } from 'date-fns';
import { Suspense } from 'react';
import { Query } from "node-appwrite";
import { DB, AnalyticsEventRow, listAllRows } from "@/server/db/client";
import { formatCount } from "@/lib/utils";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ChartBars } from "@/components/charts/ChartBars";
import { PROJECT_STATUS_META } from "@/lib/status";
import { DashboardSkeleton } from "./DashboardSkeleton";
import { LinkButton } from "@/components/ui/LinkButton";
import DashboardError from "./DashboardError";

export default function DashboardPage() {
  return (
    <DashboardLayout title="Overview">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </DashboardLayout>
  );
}

type DashboardData =
  | { projects: Awaited<ReturnType<typeof getUserProjects>>; error?: undefined }
  | { error: true; projects?: undefined };

async function fetchDashboardData(): Promise<DashboardData> {
  try {
    const projects = await getUserProjects();
    return { projects };
  } catch {
    return { error: true };
  }
}

async function DashboardContent() {
  const principal = await requirePrincipalOrRedirect();

  const [data, allEvents] = await Promise.all([
    fetchDashboardData(),
    listAllRows<AnalyticsEventRow>(DB.analyticsEvents, [
      Query.equal("brandId", principal.userId),
    ]).catch(() => [] as AnalyticsEventRow[]),
  ]);

  if (data.error) {
    return <DashboardError />;
  }

  const projects = data.projects;
  const recentProjects = projects.slice(0, 3);

  const projectIds = projects.map((p) => p.id);
  const projectIdSet = new Set(projectIds);
  const events = allEvents.filter((e) => projectIdSet.has(e.projectId));

  let totalViews = 0;
  let arLaunches = 0;
  for (const event of events) {
    if (event.eventType === 'VIEW') totalViews++;
    else if (event.eventType === 'AR_LAUNCH') arLaunches++;
  }
  const totalInteractions = events.length;

  const interactionRate = totalViews > 0 ? Math.round((totalInteractions / totalViews) * 100) : 0;
  const conversionLift = totalViews > 0 ? ((totalInteractions / totalViews) * 100).toFixed(1) : '0.0';

  // Fixed well per slot (not cycled): accent-pale → sky → butter → forest anchor.
  const METRICS = [
    {
      label: 'Total Model Views',
      value: totalViews > 0 ? formatCount(totalViews) : '0',
      change: '--',
      trend: 'up' as const,
      icon: Eye,
      well: { bg: 'var(--accent-pale)', fg: 'var(--ink-deep)' },
    },
    {
      label: 'AR Launches',
      value: arLaunches > 0 ? formatCount(arLaunches) : '0',
      change: '--',
      trend: 'up' as const,
      icon: Smartphone,
      well: { bg: 'var(--surface-sky)', fg: 'var(--surface-sky-deep)' },
    },
    {
      label: 'Interaction Rate',
      value: totalViews > 0 ? `${interactionRate}%` : '--',
      change: '--',
      trend: 'down' as const,
      icon: Activity,
      well: { bg: 'var(--surface-butter)', fg: 'var(--surface-butter-deep)' },
    },
    {
      label: 'Est. Conversion Lift',
      value: totalViews > 0 ? `+${conversionLift}%` : '--',
      change: '--',
      trend: 'up' as const,
      icon: Box,
      well: { bg: 'var(--forest)', fg: 'var(--on-forest)' },
    }
  ];

  const statusCounts = (['PENDING', 'REVISIONS', 'COMPLETED', 'PUBLISHED'] as const).map(
    (status) => ({
      status,
      count: projects.filter((p) => p.status === status).length,
    })
  );

  const now = new Date();
  const monthlyViewCounts: number[] = [];
  const monthLabels: string[] = [];

  const monthMap = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
    monthLabels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    monthMap.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }

  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  for (const event of events) {
    if (event.eventType !== 'VIEW') continue;
    const d = new Date(event.$createdAt);
    if (d < twelveMonthsAgo) continue;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    }
  }

  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (11 - i));
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    monthlyViewCounts[i] = monthMap.get(key) || 0;
  }

  const totalMonthlyViews = monthlyViewCounts.reduce((sum, n) => sum + n, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="label-mono text-[var(--color-text-muted)] mb-1">Brand overview</p>
          <h2 className="page-title text-[var(--color-text-primary)]">Welcome back.</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Here is what&apos;s happening with your 3D assets today.</p>
        </div>
        <LinkButton href="/tasks" variant="primary" size="sm" rightIcon={<ArrowUpRight className="w-3 h-3" />}>
          Deploy New Model
        </LinkButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric, i) => {
          const Icon = metric.icon;
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
                    style={{ backgroundColor: metric.well.bg, color: metric.well.fg }}
                  >
                    <Icon className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
                  </div>
                  {metric.change !== '--' && (
                    <div className={`flex items-center gap-1 label-mono px-2 py-0.5 rounded-full tabular-nums ${metric.trend === 'up' ? 'bg-[var(--accent-pale)] text-[var(--positive-deep)]' : 'bg-[var(--canvas-soft)] text-[var(--negative-deep)]'}`}>
                      {metric.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {metric.change}
                    </div>
                  )}
                </div>
                <div className="label-mono text-[var(--color-text-muted)] mb-1">{metric.label}</div>
                <div className="font-display text-3xl font-bold tracking-tight tabular-nums text-[var(--color-text-primary)]">{metric.value}</div>
              </CardBody>
            </Card>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCounts.map(({ status, count }) => {
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-[24px]">
            <CardBody className="pt-6">
              <div className="flex items-center justify-between gap-4 mb-6">
                <h3 className="label-mono text-[var(--color-text-primary)]">Interaction Trends</h3>
                <span className="pill bg-[var(--accent-pale)] text-[var(--positive-deep)] tabular-nums shrink-0">
                  {formatCount(totalMonthlyViews)} views · 12 mo
                </span>
              </div>
              <ChartBars
                counts={monthlyViewCounts}
                labels={monthLabels}
                noun="view"
                emptyTitle="No views recorded yet"
                emptyHint="Views are counted when shoppers open your published 3D models on your storefront."
                emptyIcon={<Eye className="w-6 h-6" aria-hidden="true" />}
              />
            </CardBody>
          </Card>

          <Card className="rounded-[24px] overflow-hidden">
            <CardHeader className="flex justify-between items-center">
              <h3 className="label-mono text-[var(--color-text-primary)]">Recent Tasks</h3>
              <LinkButton href="/tasks" variant="ghost" size="sm">
                View All
              </LinkButton>
            </CardHeader>
            <div className="divide-y divide-[var(--color-border-default)]">
              {recentProjects.length === 0 ? (
                <div className="p-6 text-sm text-[var(--color-text-muted)] text-center">No recent tasks. Get started by deploying a new model!</div>
              ) : (
                recentProjects.map((job) => {
                  const meta = PROJECT_STATUS_META[job.status];
                  const Icon = meta.icon;
                  const thumb = job.referenceUrls?.[0];
                  return (
                    <div key={job.id} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 hover:bg-[var(--color-canvas-soft)] transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        {thumb ? (
                          <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 ring-1 ring-[oklch(0_0_0/0.1)]">
                            <Image src={thumb} alt="" fill sizes="40px" unoptimized className="object-cover" />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[var(--color-canvas-soft)] border border-[var(--color-border-default)] shrink-0 flex items-center justify-center">
                            <Box className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate" title={job.name}>{job.name}</div>
                          <div className="text-[10px] font-sans tabular-nums text-[var(--color-text-muted)] mt-0.5">{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</div>
                        </div>
                      </div>
                      <span className="shrink-0">
                        <Badge tone={meta.tone} icon={<Icon className="w-3 h-3" />}>
                          {meta.label}
                        </Badge>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="inverted" className="rounded-[24px]">
            <CardBody className="relative overflow-hidden">
              <Box className="w-6 h-6 text-[var(--accent)] mb-4" aria-hidden="true" />
              <h3 className="font-display text-xl font-bold mb-2">Deploy New Model</h3>
              <p className="text-sm text-[var(--on-ink)]/70 mb-6 leading-relaxed">
                Transform standard product photography into an interactive AR experience.
              </p>
              <LinkButton href="/tasks" variant="secondary" size="sm" rightIcon={<ArrowUpRight className="w-3 h-3" />}>
                Start Generation
              </LinkButton>
            </CardBody>
          </Card>

          <Card className="rounded-[24px]">
            <CardBody>
              <h3 className="label-mono text-[var(--color-text-primary)] mb-2">Quick Links</h3>
              <div className="divide-y divide-[var(--color-border-default)]">
                <div className="py-1">
                  <LinkButton href="/integrations" variant="ghost" size="sm" className="w-full justify-between" rightIcon={<ArrowUpRight className="w-4 h-4" />}>
                    SDK Documentation
                  </LinkButton>
                </div>
                <div className="py-1">
                  <LinkButton href="/analytics" variant="ghost" size="sm" className="w-full justify-between" rightIcon={<ArrowUpRight className="w-4 h-4" />}>
                    Full Analytics Report
                  </LinkButton>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

      </div>
    </div>
  );
}
