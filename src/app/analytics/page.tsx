import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Prisma } from '@prisma/client';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Eye, Activity, Smartphone, Box, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type DateRange = '7D' | '30D' | 'ALL';
type EventCounts = Record<'VIEW' | 'INTERACTION' | 'AR_LAUNCH', number>;

const EVENT_TYPES = ['VIEW', 'INTERACTION', 'AR_LAUNCH'] as const;

function parseDateRange(range?: string): DateRange {
  return range === '7D' || range === 'ALL' ? range : '30D';
}

function subDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function startOfMonth(date: Date) {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

function formatCount(count: number) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

function formatChange(current: number, previous: number | null) {
  if (previous === null) return { change: '--', trend: 'up' as const };
  if (previous === 0) {
    return { change: current === 0 ? '+0%' : '+100%', trend: 'up' as const };
  }

  const change = Math.round(((current - previous) / previous) * 100);
  return {
    change: `${change >= 0 ? '+' : ''}${change}%`,
    trend: change >= 0 ? 'up' as const : 'down' as const,
  };
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
  const session = await auth();
  if (!session?.user?.id) redirect('/auth');

  const { range } = await searchParams;
  const dateRange = parseDateRange(range);
  const now = new Date();
  const role = (session.user as { role?: string }).role;
  const baseWhere: Prisma.AnalyticsEventWhereInput = role === 'ADMIN' ? {} : { brandId: session.user.id };
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
        where: { id: { in: projectIds }, ...(role === 'ADMIN' ? {} : { brandId: session.user.id }) },
        select: { id: true, name: true },
      })
    : [];

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
  }));

  return (
    <DashboardLayout
      title="Analytics & Insights"
      action={
        <div className="flex items-center gap-2 bg-white border border-[#E5E2DD] p-1 rounded-xl shadow-sm">
          {(['7D', '30D', 'ALL'] as const).map((rangeOption) => (
            <Link
              key={rangeOption}
              href={`/analytics?range=${rangeOption}`}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-widest font-mono rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] ${
                dateRange === rangeOption
                  ? 'bg-[#1A1A1A] text-white font-bold'
                  : 'text-[#7A7670] hover:bg-[#EFEDEA] hover:text-[#1A1A1A]'
              }`}
            >
              {rangeOption === 'ALL' ? 'All Time' : rangeOption}
            </Link>
          ))}
          <div className="w-px h-4 bg-[#E5E2DD] mx-1" />
          <button className="p-1.5 text-[#7A7670] hover:text-[#1A1A1A] hover:bg-[#EFEDEA] rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]" aria-label="Custom Date Range">
            <Calendar className="w-4 h-4" />
          </button>
        </div>
      }
    >
      <div className="space-y-8 animate-in fade-in duration-500">

        {/* Top-Level Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, i) => {
            const Icon = metric.icon;
            return (
              <div key={i} className="bg-white p-5 rounded-3xl border border-[#E5E2DD] shadow-sm flex flex-col hover:border-[#1A1A1A] transition-colors group">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#F9F8F6] border border-[#E5E2DD] flex items-center justify-center group-hover:bg-[#EFEDEA] transition-colors">
                    <Icon className="w-4 h-4 text-[#7A7670]" aria-hidden="true" />
                  </div>
                  <div className={`flex items-center gap-1 text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full border ${metric.trend === 'up' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
                    {metric.trend === 'up' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {metric.change}
                  </div>
                </div>
                <div className="text-[#7A7670] text-[10px] uppercase tracking-widest font-mono mb-1">{metric.label}</div>
                <div className="text-3xl font-serif italic text-[#1A1A1A]">{metric.value}</div>
              </div>
            );
          })}
        </div>

        {/* Time-Series Chart */}
        <div className="bg-white rounded-3xl border border-[#E5E2DD] shadow-sm p-6 lg:p-8 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-1">Views vs. Interactions</h3>
              <p className="text-xs text-[#7A7670]">Over the selected time period.</p>
            </div>
            <div className="flex items-center gap-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Interactions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-400" />
                <span>AR</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#E5E2DD]" />
                <span>Views</span>
              </div>
            </div>
          </div>

          <div className="h-72 w-full flex items-end gap-2 sm:gap-4 relative pt-10">
            {/* Y-Axis lines mocked */}
            <div className="absolute inset-x-0 top-10 border-t border-dashed border-[#E5E2DD] w-full" />
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#E5E2DD] w-full" />
            <div className="absolute inset-x-0 bottom-6 border-t border-dashed border-[#1A1A1A] w-full" />

            {/* Y-Axis Labels */}
            <div className="absolute top-8 left-0 -translate-y-1/2 text-[9px] font-mono text-[#A3A3A3]">{formatCount(yAxisTop)}</div>
            <div className="absolute top-1/2 left-0 -translate-y-1/2 text-[9px] font-mono text-[#A3A3A3]">{formatCount(yAxisMid)}</div>

            {/* CSS Bar Chart with one grouped column per period */}
            {periods.map((period) => {
              const viewHeight = (period.counts.VIEW / maxChartCount) * 100;
              const interactionHeight = (period.counts.INTERACTION / maxChartCount) * 100;
              const arHeight = (period.counts.AR_LAUNCH / maxChartCount) * 100;
              const barHeight = (height: number) => height === 0 ? '0' : `calc(${height}% - 24px)`;

              return (
                <div key={period.start.toISOString()} className="flex-1 flex flex-col justify-end h-full z-10 group cursor-crosshair relative ml-6">
                  {/* Views Bar (Background) */}
                  <div
                    className="w-full bg-[#E5E2DD] rounded-t-sm absolute bottom-6 transition-colors"
                    style={{ height: barHeight(viewHeight) }}
                  />
                  {/* Interactions Bar (Foreground) */}
                  <div
                    className="w-full bg-emerald-500 rounded-t-sm absolute bottom-6 group-hover:bg-emerald-600 transition-colors"
                    style={{ height: barHeight(interactionHeight) }}
                  />
                  {/* AR Launches Bar */}
                  <div
                    className="w-1/3 bg-orange-400 rounded-t-sm absolute bottom-6 right-1 group-hover:bg-orange-500 transition-colors"
                    style={{ height: barHeight(arHeight) }}
                  />

                  {/* Tooltip */}
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white text-[9px] font-mono px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 flex flex-col gap-1 shadow-lg">
                    <div className="flex justify-between gap-4">
                      <span className="text-[#A3A3A3]">Views:</span>
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
          <div className="flex justify-between mt-2 text-[9px] font-mono tracking-widest text-[#A3A3A3] pl-6">
            {periods.map((period) => (
              <span key={period.start.toISOString()}>{period.label}</span>
            ))}
          </div>
        </div>

        {/* Top Performing Products Table */}
        <div className="bg-white rounded-3xl border border-[#E5E2DD] shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E5E2DD]">
            <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A]">Top Performing Models</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E2DD] bg-[#F9F8F6]">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-normal">Product Name</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-normal">Views</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-normal">Avg. Time Spent Interacting</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-normal">AR Launches</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E2DD]">
                {leaderboard.length > 0 ? leaderboard.map((product) => (
                  <tr key={product.projectId} className="hover:bg-[#EFEDEA] transition-colors group cursor-default">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#F9F8F6] border border-[#E5E2DD] flex items-center justify-center">
                          <Box className="w-4 h-4 text-[#7A7670]" />
                        </div>
                        <span className="text-sm font-medium text-[#1A1A1A]">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-lg font-serif italic text-[#1A1A1A]">{product.views.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[12px] font-mono text-[#4A4742]">--</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-serif italic text-[#1A1A1A]">{product.arLaunches.toLocaleString()}</span>
                        <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="px-6 py-8 text-sm text-[#7A7670]" colSpan={4}>No analytics events found for this date range.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
