import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ArrowUpRight, ArrowDownRight, Activity, Box, Eye, Smartphone } from 'lucide-react';
import { getUserProjects } from "@/app/actions/project";
import { requirePrincipalOrRedirect } from "@/lib/auth-guards";
import { formatDistanceToNow } from 'date-fns';
import { Suspense } from 'react';
import { prisma } from "@/lib/prisma";
import { formatCount } from "@/lib/utils";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
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
  await requirePrincipalOrRedirect();
  const data = await fetchDashboardData();

  if (data.error) {
    return <DashboardError />;
  }

  const projects = data.projects;
  const recentProjects = projects.slice(0, 3);

  const projectIds = projects.map(p => p.id);
  const userId = projects[0]?.brand.id;

  let totalViews = 0;
  let arLaunches = 0;
  let totalInteractions = 0;

  if (projectIds.length > 0 && userId) {
    const events = await prisma.analyticsEvent.findMany({
      where: { brandId: userId, projectId: { in: projectIds } },
    });

    totalViews = events.filter(e => e.eventType === 'VIEW').length;
    arLaunches = events.filter(e => e.eventType === 'AR_LAUNCH').length;
    totalInteractions = events.length;
  }

  const interactionRate = totalViews > 0 ? Math.round((totalInteractions / totalViews) * 100) : 0;
  const conversionLift = totalViews > 0 ? ((totalInteractions / totalViews) * 100).toFixed(1) : '0.0';

  const METRICS = [
    {
      label: 'Total Model Views',
      value: totalViews > 0 ? formatCount(totalViews) : '0',
      change: '--',
      trend: 'up' as const,
      icon: Eye
    },
    {
      label: 'AR Launches',
      value: arLaunches > 0 ? formatCount(arLaunches) : '0',
      change: '--',
      trend: 'up' as const,
      icon: Smartphone
    },
    {
      label: 'Interaction Rate',
      value: totalViews > 0 ? `${interactionRate}%` : '--',
      change: '--',
      trend: 'down' as const,
      icon: Activity
    },
    {
      label: 'Est. Conversion Lift',
      value: totalViews > 0 ? `+${conversionLift}%` : '--',
      change: '--',
      trend: 'up' as const,
      icon: Box
    }
  ];

  const monthlyViewCounts: number[] = [];
  const monthLabels: string[] = [];

  for (let i = 0; i < 12; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    monthLabels.push(d.toLocaleDateString('en-US', { month: 'short' }));
    monthlyViewCounts.push(0);
  }

  if (projectIds.length > 0 && userId) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const recentEvents = await prisma.analyticsEvent.findMany({
      where: {
        brandId: userId,
        projectId: { in: projectIds },
        eventType: 'VIEW',
        createdAt: { gte: twelveMonthsAgo }
      },
      select: { createdAt: true }
    });

    const monthMap = new Map<string, number>();
    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthMap.set(key, 0);
    }

    for (const event of recentEvents) {
      const d = new Date(event.createdAt);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    }

    for (let i = 0; i < 12; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() - (11 - i));
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      monthlyViewCounts[i] = monthMap.get(key) || 0;
    }
  }

  const maxCount = Math.max(...monthlyViewCounts, 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      <div>
        <h2 className="text-3xl font-serif italic text-[var(--color-text-primary)] mb-2">Welcome back.</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">Here is what&apos;s happening with your 3D assets today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <Card key={i}>
              <CardBody className="flex flex-col hover:border-[var(--color-text-primary)] transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-8 h-8 rounded-full bg-[var(--color-canvas)] border border-[var(--color-border-default)] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full border ${metric.trend === 'up' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                    {metric.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {metric.change}
                  </div>
                </div>
                <div className="text-[var(--color-text-muted)] text-[10px] uppercase tracking-widest font-mono mb-1">{metric.label}</div>
                <div className="text-3xl font-serif italic text-[var(--color-text-primary)]">{metric.value}</div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardBody className="pt-6">
              <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)] mb-6">Interaction Trends</h3>
              <div className="h-64 w-full flex items-end gap-2 sm:gap-4 relative pt-10">
                <div className="absolute inset-x-0 top-10 border-t border-dashed border-[var(--color-border-default)] w-full" />
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--color-border-default)] w-full" />
                <div className="absolute inset-x-0 bottom-6 border-t border-dashed border-[var(--color-text-primary)] w-full" />

                {monthlyViewCounts.map((count, i) => (
                  <div key={i} className="flex-1 flex flex-col justify-end h-full z-10 group cursor-crosshair">
                    <div
                      className="w-full bg-[var(--color-canvas-secondary)] rounded-t-sm group-hover:bg-[var(--color-text-primary)] transition-colors relative"
                      style={{ height: `${(count / maxCount) * 100}%`, maxHeight: 'calc(100% - 24px)' }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-text-primary)] text-[var(--color-canvas)] text-[9px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        {count.toLocaleString()} Views
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

          <Card>
            <CardHeader className="flex justify-between items-center">
              <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">Recent Tasks</h3>
              <LinkButton href="/tasks" variant="ghost" size="sm">
                View All
              </LinkButton>
            </CardHeader>
            <div className="divide-y divide-[var(--color-border-default)]">
              {recentProjects.length === 0 ? (
                <div className="p-6 text-sm text-[var(--color-text-muted)] text-center italic">No recent tasks. Get started by deploying a new model!</div>
              ) : (
                recentProjects.map((job) => {
                  const meta = PROJECT_STATUS_META[job.status];
                  const Icon = meta.icon;
                  return (
                    <div key={job.id} className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 hover:bg-[var(--color-canvas)] transition-colors">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-canvas-secondary)] border border-[var(--color-border-default)] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">{job.name}</div>
                          <div className="text-[10px] font-mono text-[var(--color-text-muted)] mt-0.5">{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</div>
                        </div>
                      </div>
                      <Badge tone={meta.tone} icon={<Icon className="w-3 h-3" />}>
                        {meta.label}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card variant="inverted">
            <CardBody className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
              <Box className="w-6 h-6 text-emerald-400 mb-4" />
              <h3 className="text-xl font-serif italic mb-2">Deploy New Model</h3>
              <p className="text-xs text-[var(--color-text-muted)] mb-6 leading-relaxed">
                Transform standard product photography into an interactive AR experience.
              </p>
              <LinkButton href="/tasks" variant="secondary" size="sm" rightIcon={<ArrowUpRight className="w-3 h-3" />}>
                Start Generation
              </LinkButton>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)] mb-4">Quick Links</h3>
              <div className="space-y-2">
                <LinkButton href="/integrations" variant="secondary" size="sm" className="w-full justify-between">
                  SDK Documentation <ArrowUpRight className="w-4 h-4" />
                </LinkButton>
                <LinkButton href="/analytics" variant="secondary" size="sm" className="w-full justify-between">
                  Full Analytics Report <ArrowUpRight className="w-4 h-4" />
                </LinkButton>
              </div>
            </CardBody>
          </Card>
        </div>

      </div>
    </div>
  );
}