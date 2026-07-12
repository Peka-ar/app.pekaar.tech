import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ArrowUpRight, ArrowDownRight, Activity, Box, Eye, Smartphone } from 'lucide-react';
import Link from "next/link";
import { getUserProjects } from "@/app/actions/project";
import { formatDistanceToNow } from 'date-fns';
import { Suspense } from 'react';
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export default async function DashboardPage() {
  return (
    <DashboardLayout title="Overview">
      <Suspense fallback={<p>Loading overview...</p>}>
        <DashboardContent />
      </Suspense>
    </DashboardLayout>
  );
}

async function DashboardContent() {
  const session = await auth();
  const projects = await getUserProjects().catch(() => []);
  const recentProjects = projects.slice(0, 3);

  const projectIds = projects.map(p => p.id);

  let totalViews = 0;
  let arLaunches = 0;
  let totalInteractions = 0;

  if (projectIds.length > 0 && session?.user?.id) {
    const events = await prisma.analyticsEvent.findMany({
      where: { brandId: session.user.id, projectId: { in: projectIds } },
    });

    totalViews = events.filter(e => e.eventType === 'VIEW').length;
    arLaunches = events.filter(e => e.eventType === 'AR_LAUNCH').length;
    totalInteractions = events.length;
  }

  const interactionRate = totalViews > 0 ? Math.round((totalInteractions / totalViews) * 100) : 0;
  const conversionLift = totalViews > 0 ? ((totalInteractions / totalViews) * 100).toFixed(1) : '0.0';

  const formatCount = (count: number): string => {
    if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
    if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
    return count.toLocaleString();
  };

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

  // Monthly aggregation for bar chart (last 12 months)
  let monthlyViewCounts = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (projectIds.length > 0 && session?.user?.id) {
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const recentEvents = await prisma.analyticsEvent.findMany({
      where: {
        brandId: session.user.id,
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

    monthlyViewCounts = Array.from(monthMap.values());
  }

  const maxCount = Math.max(...monthlyViewCounts, 1);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* Welcome Section */}
      <div>
        <h2 className="text-3xl font-serif italic text-[#1A1A1A] mb-2">Welcome back.</h2>
        <p className="text-sm text-[#4A4742]">Here is what&apos;s happening with your 3D assets today.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric, i) => {
          const Icon = metric.icon;
          return (
            <div key={i} className="bg-white p-5 rounded-3xl border border-[#E5E2DD] shadow-sm flex flex-col hover:border-[#1A1A1A] transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className="w-8 h-8 rounded-full bg-[#F9F8F6] border border-[#E5E2DD] flex items-center justify-center">
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

      {/* Two Column Layout for Activity and Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Activity Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl border border-[#E5E2DD] shadow-sm p-6 overflow-hidden relative">
            <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-6">Interaction Trends</h3>
            <div className="h-64 w-full flex items-end gap-2 sm:gap-4 relative pt-10">
              {/* Y-Axis lines mocked */}
              <div className="absolute inset-x-0 top-10 border-t border-dashed border-[#E5E2DD] w-full" />
              <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#E5E2DD] w-full" />
              <div className="absolute inset-x-0 bottom-6 border-t border-dashed border-[#1A1A1A] w-full" />
              
              {/* CSS Bar Chart from real data */}
              {monthlyViewCounts.map((count, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end h-full z-10 group cursor-crosshair">
                  <div 
                    className="w-full bg-[#EFEDEA] rounded-t-sm group-hover:bg-[#1A1A1A] transition-colors relative"
                    style={{ height: `${(count / maxCount) * 100}%`, maxHeight: 'calc(100% - 24px)' }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white text-[9px] font-mono px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {count.toLocaleString()} Views
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[9px] font-mono tracking-widest text-[#A3A3A3]">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
            </div>
          </div>
          
          <div className="bg-white rounded-3xl border border-[#E5E2DD] shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E5E2DD] flex justify-between items-center">
              <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A]">Recent Tasks</h3>
              <Link href="/tasks" className="text-[10px] uppercase tracking-widest font-mono text-[#7A7670] hover:text-[#1A1A1A] underline underline-offset-4">View All</Link>
            </div>
            <div className="divide-y divide-[#E5E2DD]">
              {recentProjects.length === 0 ? (
                <div className="p-6 text-sm text-[#7A7670] text-center italic">No recent tasks. Get started by deploying a new model!</div>
              ) : (
                recentProjects.map((job) => {
                  const active = job.status === 'PUBLISHED';
                  return (
                    <div key={job.id} className="px-6 py-4 flex items-center justify-between hover:bg-[#F9F8F6] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-[#EFEDEA] border border-[#E5E2DD]" />
                        <div>
                          <div className="text-sm font-medium text-[#1A1A1A]">{job.name}</div>
                          <div className="text-[10px] font-mono text-[#7A7670] mt-0.5">{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[9px] font-mono tracking-widest uppercase border ${active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-[#EFEDEA] text-[#7A7670] border-[#E5E2DD]'}`}>
                        {job.status}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar / Shortcuts Area */}
        <div className="space-y-6">
          <div className="bg-[#1A1A1A] text-white rounded-3xl p-6 relative overflow-hidden shadow-md group cursor-pointer">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
            <Box className="w-6 h-6 text-emerald-400 mb-4" />
            <h3 className="text-xl font-serif italic mb-2">Deploy New Model</h3>
            <p className="text-xs text-[#A3A3A3] mb-6 leading-relaxed">
              Transform standard product photography into an interactive AR experience.
            </p>
            <Link href="/tasks" className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#1A1A1A] rounded-full text-[10px] uppercase tracking-widest font-bold hover:bg-emerald-400 transition-colors">
              Start Generation <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-[#EFEDEA] border border-[#E5E2DD] rounded-3xl p-6">
            <h3 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-4">Quick Links</h3>
            <div className="space-y-2">
              <Link href="/integrations" className="block w-full p-3 bg-white rounded-xl border border-[#E5E2DD] hover:border-[#1A1A1A] text-sm font-medium text-[#1A1A1A] transition-colors flex justify-between items-center">
                SDK Documentation <ArrowUpRight className="w-4 h-4 text-[#7A7670]" />
              </Link>
              <Link href="/analytics" className="block w-full p-3 bg-white rounded-xl border border-[#E5E2DD] hover:border-[#1A1A1A] text-sm font-medium text-[#1A1A1A] transition-colors flex justify-between items-center">
                Full Analytics Report <ArrowUpRight className="w-4 h-4 text-[#7A7670]" />
              </Link>
              <Link href="/billing" className="block w-full p-3 bg-white rounded-xl border border-[#E5E2DD] hover:border-[#1A1A1A] text-sm font-medium text-[#1A1A1A] transition-colors flex justify-between items-center">
                Manage Subscription <ArrowUpRight className="w-4 h-4 text-[#7A7670]" />
              </Link>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
