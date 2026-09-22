import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Eye, Activity, Smartphone, Box, ArrowUpRight, ArrowDownRight, AlertTriangle } from 'lucide-react';
import { requirePrincipalOrRedirect } from '@/server/auth-guards';
import { Query } from "node-appwrite";
import { AnalyticsEventRow, DB, ProjectsRow, countRows, groupBy, listAllRows } from '@/server/db/client';
import { formatCount, formatChange, subDays, startOfDay, startOfMonth, addMonths } from '@/lib/utils';
import { Card, CardBody } from '@/components/ui/Card';
import { Table, TableHead, TableBody, TableRow, TableCell, TableEmptyState } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
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

function eventQueries(
  brandId: string | undefined,
  opts: { eventType?: (typeof EVENT_TYPES)[number]; from?: Date; to?: Date } = {},
): string[] {
  const queries: string[] = [];
  if (brandId) queries.push(Query.equal("brandId", brandId));
  if (opts.eventType) queries.push(Query.equal("eventType", opts.eventType));
  if (opts.from) queries.push(Query.greaterThanEqual("$createdAt", opts.from.toISOString()));
  if (opts.to) queries.push(Query.lessThan("$createdAt", opts.to.toISOString()));
  return queries;
}

async function getCounts(brandId: string | undefined, from?: Date, to?: Date): Promise<EventCounts> {
  const [views, interactions, arLaunches] = await Promise.all(
    EVENT_TYPES.map((eventType) => countRows(DB.analyticsEvents, eventQueries(brandId, { eventType, from, to })))
  );

  return { VIEW: views, INTERACTION: interactions, AR_LAUNCH: arLaunches };
}

function projectCounts(rows: AnalyticsEventRow[]): { projectId: string; _count: { _all: number } }[] {
  const groups = groupBy(rows, (row) => row.projectId);
  return Array.from(groups.entries()).map(([projectId, items]) => ({ projectId, _count: { _all: items.length } }));
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
  const brandFilter = role === 'ADMIN' ? undefined : userId;
  const { currentStart, previousStart, previousEnd } = getMetricRanges(dateRange, now);

  const periods = buildChartPeriods(dateRange, now);
  const chartStart = periods[0]?.start;

  const [currentCounts, previousCounts, chartEvents, viewEvents, arEvents] = await Promise.all([
    getCounts(brandFilter, currentStart, now),
    previousStart && previousEnd ? getCounts(brandFilter, previousStart, previousEnd) : Promise.resolve(null),
    listAllRows<AnalyticsEventRow>(DB.analyticsEvents, eventQueries(brandFilter, { from: chartStart, to: now })),
    listAllRows<AnalyticsEventRow>(DB.analyticsEvents, eventQueries(brandFilter, { eventType: "VIEW", from: currentStart, to: now })),
    listAllRows<AnalyticsEventRow>(DB.analyticsEvents, eventQueries(brandFilter, { eventType: "AR_LAUNCH", from: currentStart, to: now })),
  ]);

  const viewLeaderboard = projectCounts(viewEvents)
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 5);
  const arLeaderboard = projectCounts(arEvents);

  const projectIds = viewLeaderboard.map((item) => item.projectId);
  const projects = projectIds.length
    ? await listAllRows<ProjectsRow>(DB.projects, [
        Query.equal("$id", projectIds),
        ...(role === 'ADMIN' ? [] : [Query.equal("brandId", userId)]),
      ])
    : [];

  const liveness = await getProjectLiveness(projectIds);

  const projectNames = new Map(projects.map((project) => [project.$id, project.name]));
  const arByProject = new Map(arLeaderboard.map((item) => [item.projectId, item._count._all]));

  for (const event of chartEvents) {
    const createdAt = new Date(event.$createdAt);
    const period = periods.find((item) => createdAt >= item.start && createdAt < item.end);
    if (period) period.counts[event.eventType as keyof EventCounts] += 1;
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
              <Card key={i} className="rounded-[24px]">
                <CardBody className="flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-8 h-8 rounded-full bg-[var(--color-canvas-soft)] border border-[var(--color-border-default)] flex items-center justify-center">
                      <Icon className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                    </div>
                    {(metric.trend === 'up' || metric.trend === 'down') && (
                      <div className={`flex items-center gap-1 label-mono px-2 py-0.5 rounded-full border ${metric.trend === 'up' ? 'bg-[var(--accent-pale)] text-[var(--positive-deep)] border-transparent' : 'bg-[var(--canvas-soft)] text-[var(--negative-deep)] border-transparent'}`}>
                        {metric.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {metric.change}
                      </div>
                    )}
                  </div>
                  <div className="label-mono text-[var(--color-text-muted)] mb-1">{metric.label}</div>
                  <div className="font-display text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">{metric.value}</div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* Time-Series Chart */}
        <Card className="rounded-[24px]">
            <CardBody className="pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                  <h3 className="label-mono text-[var(--color-text-primary)] mb-1">Views vs. Interactions</h3>
                  <p className="text-xs text-[var(--color-text-muted)]">Over the selected time period.</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-sans text-[var(--color-text-muted)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-accent)]" />
                    <span>Views</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-text-secondary)]" />
                    <span>Interactions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-text-secondary)] opacity-60" />
                    <span>AR</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full flex items-end gap-2 sm:gap-4 relative pt-10">
                <div className="absolute inset-x-0 top-10 border-t border-dashed border-[var(--color-border-default)] w-full" />
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[var(--color-border-default)] w-full" />
                <div className="absolute inset-x-0 bottom-6 border-t border-dashed border-[var(--color-border-default)] w-full" />

                <div className="absolute top-8 left-0 -translate-y-1/2 text-[9px] font-sans text-[var(--color-text-muted)]">{formatCount(yAxisTop)}</div>
                <div className="absolute top-1/2 left-0 -translate-y-1/2 text-[9px] font-sans text-[var(--color-text-muted)]">{formatCount(yAxisMid)}</div>

                {periods.map((period) => {
                  const viewHeight = (period.counts.VIEW / maxChartCount) * 100;
                  const interactionHeight = (period.counts.INTERACTION / maxChartCount) * 100;
                  const arHeight = (period.counts.AR_LAUNCH / maxChartCount) * 100;
                  const barHeight = (height: number) => height === 0 ? '0' : `calc(${height}% - 24px)`;

                  return (
                    <div key={period.start.toISOString()} className="flex-1 flex flex-col justify-end h-full z-10 group cursor-crosshair relative ml-6">
                      <div
                        className="w-full bg-[var(--color-accent)] rounded-t-sm absolute bottom-6 transition-colors group-hover:bg-[var(--color-accent-active)]"
                        style={{ height: barHeight(viewHeight) }}
                      />
                      <div
                        className="w-full bg-[var(--color-text-secondary)] rounded-t-sm absolute bottom-6 transition-colors opacity-80 group-hover:opacity-100"
                        style={{ height: barHeight(interactionHeight) }}
                      />
                      <div
                        className="w-1/3 bg-[var(--color-text-secondary)] rounded-t-sm absolute bottom-6 right-1 transition-colors opacity-50 group-hover:opacity-80"
                        style={{ height: barHeight(arHeight) }}
                      />

                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[var(--color-canvas)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] text-[9px] font-sans px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 flex flex-col gap-1 shadow-[var(--shadow-1)]">
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--color-text-muted)]">Views:</span>
                          <span className="font-bold">{period.counts.VIEW.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--color-text-secondary)]">Interacts:</span>
                          <span className="font-bold">{period.counts.INTERACTION.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-[var(--color-text-muted)]">AR:</span>
                          <span className="font-bold">{period.counts.AR_LAUNCH.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-[9px] font-sans tracking-widest text-[var(--color-text-muted)] pl-6">
                {periods.map((period) => (
                  <span key={period.start.toISOString()}>{period.label}</span>
                ))}
              </div>
            </CardBody>
          </Card>

        {/* Top Performing Products Table */}
        <Card className="rounded-[24px] overflow-hidden">
          <div className="px-6 py-5 border-b border-[var(--color-border-default)]">
            <h3 className="label-mono text-[var(--color-text-primary)]">Top Performing Models</h3>
          </div>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="th-mono">Product Name</TableCell>
                <TableCell className="th-mono">Views</TableCell>
                <TableCell className="th-mono">Avg. Time Spent Interacting</TableCell>
                <TableCell className="th-mono">AR Launches</TableCell>
                <TableCell className="th-mono">Last Seen</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboard.length > 0 ? leaderboard.map((product) => {
                const badge = getLivenessBadge(product.lastEventAt);
                const badgeTone =
                  badge === 'amber' ? 'warning' as const :
                  badge === 'red' || badge === 'never' ? 'danger' as const :
                  'success' as const;
                const badgeLabel =
                  badge === 'red' ? 'No events in 30+ days' :
                  badge === 'amber' ? 'No events in 7+ days' :
                  badge === 'never' ? 'No events yet' :
                  'Live';
                return (
                  <TableRow key={product.projectId}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[var(--color-canvas-soft)] border border-[var(--color-border-default)] flex items-center justify-center">
                          <Box className="w-4 h-4 text-[var(--color-text-muted)]" />
                        </div>
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{product.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-display text-lg font-bold tracking-tight text-[var(--color-text-primary)]">{product.views.toLocaleString()}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-[12px] font-sans text-[var(--color-text-secondary)]">--</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-display text-lg font-bold tracking-tight text-[var(--color-text-primary)]">{product.arLaunches.toLocaleString()}</span>
                        <ArrowUpRight className="w-3 h-3 text-[var(--positive-deep)]" />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-sans text-[var(--color-text-secondary)]">{formatLastSeen(product.lastEventAt)}</span>
                        <Badge tone={badgeTone} icon={<AlertTriangle className="w-3 h-3" aria-hidden="true" />}>
                          {badgeLabel}
                        </Badge>
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
