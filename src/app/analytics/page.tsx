import React from 'react';
import type { Prisma } from '@/generated/prisma/client';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Eye, Activity, Smartphone, Box, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { requirePrincipalOrRedirect } from '@/lib/auth-guards';
import { prisma } from '@/lib/prisma';
import { formatCount, formatChange, subDays, startOfDay, startOfMonth, addMonths } from '@/lib/utils';
import { Card, CardBody } from '@/components/ui/Card';
import { Table, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from '@/components/ui/Table';
import { DateRangePicker } from './DateRangePicker';
import { getProjectLiveness } from '@/app/actions/analytics';
import { getLivenessBadge, formatLastSeen } from '@/lib/embed-liveness';

type DateRange = '7D' | '30D' | 'ALL';
type EventCounts = Record<'VIEW' | 'INTERACTION' | 'AR_LAUNCH', number>;

const EVENT_TYPES = ['VIEW', 'INTERACTION', 'AR_LAUNCH'] as const;

function parseDateRange(range?: string): DateRange {
  return range === '7D' || range === 'ALL' ? range : '30D';
}

function getMetricRanges(range: DateRange, now: Date) {
  if (range === 'ALL') {
    return { currentStart: undefined, previousStart: undefined, previousEnd: undefined };
  }

  const days = range === '7D' ? 7 : 30;
  const currentStart = subDays(now, days);
  const previousStart = subDays(currentStart, days);

  return { currentStart, previousStart, previousEnd: currentStart };
}

function buildChartPeriods(range: DateRange, now: Date) {
  if (range === 'ALL') {
    const firstMonth = startOfMonth(addMonths(now, -11));
    return Array.from({ length: 12 }, (_, index) => {
      const start = addMonths(firstMonth, index);
      return {
        start,
        end: addMonths(start, 1),
        label: start.toLocaleDateString('en-US', { month: 'short' }),
        counts: { VIEW: 0, INTERACTION: 0, AR_LAUNCH: 0 } as EventCounts,
      };
    });
  }

  if (range === '7D') {
    const firstDay = startOfDay(subDays(now, 6));
    return Array.from({ length: 7 }, (_, index) => {
      const start = subDays(firstDay, -index);
      return {
        start,
        end: subDays(start, -1),
        label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        counts: { VIEW: 0, INTERACTION: 0, AR_LAUNCH: 0 } as EventCounts,
      };
    });
  }

  const firstPeriod = startOfDay(subDays(now, 29));
  return Array.from({ length: 5 }, (_, index) => {
    const start = subDays(firstPeriod, -index * 7);
    const end = index === 4 ? now : subDays(start, -7);
    return {
      start,
      end,
      label: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      counts: { VIEW: 0, INTERACTION: 0, AR_LAUNCH: 0 } as EventCounts,
    };
  });
}

function whereForRange(baseWhere: Prisma.AnalyticsEventWhereInput, start?: Date, end?: Date): Prisma.AnalyticsEventWhereInput {
  return {
    ...baseWhere,
    ...(start || end ? { createdAt: { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) } } : {}),
  };
}

async function getCounts(where: Prisma.AnalyticsEventWhereInput): Promise<EventCounts> {
  const [views, interactions, arLaunches] = await Promise.all(
    EVENT_TYPES.map((eventType) => prisma.analyticsEvent.count({ where: { ...where, eventType } }))
  );

  return { VIEW: views, INTERACTION: interactions, AR_LAUNCH: arLaunches };
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const principal = await requirePrincipalOrRedirect();
  const userId = principal.userId;
  const role = principal.role;

  const { range } = await searchParams;
  const dateRange = parseDateRange(range);
  const now = new Date();
  const baseWhere: Prisma.AnalyticsEventWhereInput = role === 'ADMIN' ? {} : { brandId: userId };
  const { currentStart, previousStart, previousEnd } = getMetricRanges(dateRange, now);
  const currentWhere = whereForRange(baseWhere, currentStart, now);
  const previousWhere = previousStart && previousEnd ? whereForRange(baseWhere, previousStart, previousEnd) : null;

  const periods = buildChartPeriods(dateRange, now);
  const chartStart = periods[0]?.start;

  const [currentCounts, previousCounts, chartEvents, viewLeaderboard, arLeaderboard] = await Promise.all([
    getCounts(currentWhere),
    previousWhere ? getCounts(previousWhere) : Promise.resolve(null),
    prisma.analyticsEvent.findMany({
      where: whereForRange(baseWhere, chartStart, now),
      select: { eventType: true, createdAt: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ['projectId'],
      where: { ...currentWhere, eventType: 'VIEW' },
      _count: { _all: true },
      orderBy: { _count: { projectId: 'desc' } },
      take: 5,
    }),
    prisma.analyticsEvent.groupBy({
      by: ['projectId'],
      where: { ...currentWhere, eventType: 'AR_LAUNCH' },
      _count: { _all: true },
    }),
  ]);

  const projectIds = viewLeaderboard.map((item) => item.projectId);
  const projects = projectIds.length
    ? await prisma.project.findMany({
        where: { id: { in: projectIds }, ...(role === 'ADMIN' ? {} : { brandId: userId }) },
        select: { id: true, name: true },
      })
    : [];

  const liveness = await getProjectLiveness(projectIds);

  const projectNames = new Map(projects.map((project) => [project.id, project.name]));
  const arByProject = new Map(arLeaderboard.map((item) => [item.projectId, item._count._all]));

  for (const event of chartEvents) {
    const period = periods.find((item) => event.createdAt >= item.start && event.createdAt < item.end);
    if (period) period.counts[event.eventType] += 1;
  }

  const interactionRate = currentCounts.VIEW > 0 ? (currentCounts.INTERACTION / currentCounts.VIEW) * 100 : 0;
  const previousInteractionRate = previousCounts && previousCounts.VIEW > 0
    ? (previousCounts.INTERACTION / previousCounts.VIEW) * 100
    : previousCounts ? 0 : null;
  const maxChartCount = Math.max(1, ...periods.flatMap((period) => Object.values(period.counts)));
  const yAxisTop = Math.ceil(maxChartCount / 10) * 10;
  const yAxisMid = Math.ceil(yAxisTop / 2);

  const metrics = [
    {
      label: 'Total Model Views',
      value: formatCount(currentCounts.VIEW),
      ...formatChange(currentCounts.VIEW, previousCounts?.VIEW ?? null),
      icon: Eye,
    },
    {
      label: 'Interaction Rate',
      value: `${Math.round(interactionRate)}%`,
      ...formatChange(interactionRate, previousInteractionRate),
      icon: Activity,
    },
    {
      label: 'AR Launches',
      value: formatCount(currentCounts.AR_LAUNCH),
      ...formatChange(currentCounts.AR_LAUNCH, previousCounts?.AR_LAUNCH ?? null),
      icon: Smartphone,
    },
    {
      label: 'Tracked Events',
      value: formatCount(currentCounts.VIEW + currentCounts.INTERACTION + currentCounts.AR_LAUNCH),
      ...formatChange(
        currentCounts.VIEW + currentCounts.INTERACTION + currentCounts.AR_LAUNCH,
        previousCounts ? previousCounts.VIEW + previousCounts.INTERACTION + previousCounts.AR_LAUNCH : null
      ),
      icon: Box,
    },
  ];

  const leaderboard = viewLeaderboard.map((item) => ({
    projectId: item.projectId,
    name: projectNames.get(item.projectId) ?? 'Untitled Project',
    views: item._count._all,
    arLaunches: arByProject.get(item.projectId) ?? 0,
    lastEventAt: liveness[item.projectId]?.lastEventAt ?? null,
  }));

  return (
    <DashboardLayout
      title="Analytics & Insights"
      action={<DateRangePicker currentRange={dateRange} />}
    >
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Top-Level Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <Card key={i}>
                <CardBody className="flex flex-col hover:border-[var(--color-text-primary)] transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-canvas)] border border-[var(--color-border-default)] flex items-center justify-center group-hover:bg-[var(--color-canvas-secondary)] transition-colors">
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

        {/* Time-Series Chart */}
        <Card>
            <CardBody className="pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)] mb-1">Views vs. Interactions</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">Over the selected time period.</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Interactions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400" />
                    <span>AR</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-border-default)]" />
                    <span>Views</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full flex items-end gap-2 sm:gap-4 relative pt-10">
                <div className="absolute inset-x-0 top-10 border-t border-dashed border-[var(--color-border-default)] w-full" />
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--color-border-default)] w-full" />
                <div className="absolute inset-x-0 bottom-6 border-t border-dashed border-[var(--color-text-primary)] w-full" />

                <div className="absolute top-8 left-0 -translate-y-1/2 text-[9px] font-mono text-[var(--color-text-muted)]">{formatCount(yAxisTop)}</div>
                <div className="absolute top-1/2 left-0 -translate-y-1/2 text-[9px] font-mono text-[var(--color-text-muted)]">{formatCount(yAxisMid)}</div>

                {periods.map((period) => {
                  const viewHeight = (period.counts.VIEW / maxChartCount) * 100;
                  const interactionHeight = (period.counts.INTERACTION / maxChartCount) * 100;
                  const arHeight = (period.counts.AR_LAUNCH / maxChartCount) * 100;
                  const barHeight = (height: number) => height === 0 ? '0' : `calc(${height}% - 24px)`;

                  return (
                    <div key={period.start.toISOString()} className="flex-1 flex flex-col justify-end h-full z-10 group cursor-crosshair relative ml-6">
                      <div
                        className="w-full bg-[var(--color-border-default)] rounded-t-sm absolute bottom-6 transition-colors"
                        style={{ height: barHeight(viewHeight) }}
                      />
                      <div
                        className="w-full bg-emerald-500 rounded-t-sm absolute bottom-6 group-hover:bg-emerald-600 transition-colors"
                        style={{ height: barHeight(interactionHeight) }}
                      />
                      <div
                        className="w-1/3 bg-orange-400 rounded-t-sm absolute bottom-6 right-1 group-hover:bg-orange-500 transition-colors"
                        style={{ height: barHeight(arHeight) }}
                      />

                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-text-primary)] text-[var(--color-canvas)] text-[9px] font-mono px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 flex flex-col gap-1 shadow-lg">
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--color-text-muted)]">Views:</span>
                          <span className="font-bold">{period.counts.VIEW.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-emerald-400">Interacts:</span>
                          <span className="font-bold">{period.counts.INTERACTION.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-orange-300">AR:</span>
                          <span className="font-bold">{period.counts.AR_LAUNCH.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[9px] font-mono tracking-widest text-[var(--color-text-muted)] pl-6">
                {periods.map((period) => (
                  <span key={period.start.toISOString()}>{period.label}</span>
                ))}
              </div>
            </CardBody>
          </Card>

        {/* Top Performing Products Table */}
        <Card>
          <div className="px-6 py-5 border-b border-[var(--color-border-default)]">
            <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">Top Performing Models</h3>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Product Name</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Views</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Avg. Time Spent Interacting</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">AR Launches</TableCell>
                <TableCell className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] font-normal">Last Seen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.length > 0 ? leaderboard.map((product) => {
                const badge = getLivenessBadge(product.lastEventAt);
                const badgeClasses =
                  badge === 'red' ? 'text-red-600 bg-red-50 border-red-100' :
                  badge === 'amber' ? 'text-amber-700 bg-amber-50 border-amber-100' :
                  badge === 'never' ? 'text-red-600 bg-red-50 border-red-100' :
                  'text-emerald-600 bg-emerald-50 border-emerald-100';
                const badgeLabel =
                  badge === 'red' ? 'Embed may be broken' :
                  badge === 'amber' ? 'May not be live' :
                  badge === 'never' ? 'Embed may be broken' :
                  null;
                return (
                  <TableRow key={product.projectId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--color-canvas)] border border-[var(--color-border-default)] flex items-center justify-center">
                          <Box className="w-4 h-4 text-[var(--color-text-muted)]" />
                        </div>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-lg font-serif italic text-[var(--color-text-primary)]">{product.views.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[12px] font-mono text-[var(--color-text-secondary)]">--</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-serif italic text-[var(--color-text-primary)]">{product.arLaunches.toLocaleString()}</span>
                        <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono text-[var(--color-text-secondary)]">{formatLastSeen(product.lastEventAt)}</span>
                        {badgeLabel && (
                          <span className={`flex items-center gap-1 text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full border ${badgeClasses}`}>
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                            {badgeLabel}
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableEmptyState colSpan={5} message="No analytics events found for this date range." />
              )}
            </TableBody>
          </Table>
        </Card>

      </div>
    </DashboardLayout>
  );
}
