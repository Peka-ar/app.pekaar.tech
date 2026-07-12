import React from 'react';
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { CreditCard, Check, Download, AlertCircle, ArrowUpRight } from 'lucide-react';
import { createCheckoutSession, createBillingPortalSession } from './actions';
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

const TIERS = [
  {
    name: 'Starter',
    description: 'Perfect for boutique brands.',
    price: '$99',
    period: '/mo',
    features: ['10 Models Generated', '10k SDK Views', 'Standard Quality', 'Community Support'],
    highlighted: false,
    cta: 'Downgrade'
  },
  {
    name: 'Growth',
    description: 'For scaling D2C brands.',
    price: '$299',
    period: '/mo',
    features: ['50 Models Generated', '100k SDK Views', 'High-Res Assets', 'Priority Support', 'Custom Environment'],
    highlighted: true,
    cta: 'Current Plan'
  },
  {
    name: 'Enterprise',
    description: 'Custom limits and dedicated servers.',
    price: 'Custom',
    period: '',
    features: ['Unlimited Models', 'Unlimited Views', 'White-label SDK', 'Dedicated Account Manager', 'SLA Guarantee'],
    highlighted: false,
    cta: 'Contact Sales'
  }
];

const INVOICES = [
  { id: 'INV-2026-006', date: 'Jun 01, 2026', amount: '$299.00', status: 'Paid' },
  { id: 'INV-2026-005', date: 'May 01, 2026', amount: '$299.00', status: 'Paid' },
  { id: 'INV-2026-004', date: 'Apr 01, 2026', amount: '$299.00', status: 'Paid' },
];

export default async function BillingPage() {
  let currentModels = 0;
  let currentViews = 0;
  let modelLimit = 10;
  let viewLimit = 100000;

  try {
    const session = await auth();
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { usageLimits: true },
      });
      modelLimit = user?.usageLimits ?? modelLimit;

      const projects = await prisma.project.findMany({
        where: { brandId: session.user.id },
        select: { id: true },
      });
      currentModels = projects.length;

      const projectIds = projects.map(p => p.id);
      if (projectIds.length > 0) {
        currentViews = await prisma.analyticsEvent.count({
          where: {
            brandId: session.user.id,
            projectId: { in: projectIds },
          },
        });
      }
    }
  } catch (error) {
    console.error("Failed to fetch billing data:", error);
  }

  const usageStats = {
    models: { current: currentModels, max: modelLimit },
    views: { current: currentViews, max: viewLimit }
  };

  const getProgressColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 100) return 'bg-[#1A1A1A]';
    if (percentage >= 90) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  return (
    <DashboardLayout title="Billing & Subscription">
      <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
        
        {/* Current Usage Panel */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A]">Current Usage</h2>
            <div className="px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[9px] font-mono tracking-widest uppercase">
              Billing Cycle: Jun 1 - Jun 30
            </div>
          </div>
          <div className="bg-white rounded-3xl border border-[#E5E2DD] shadow-sm p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Models Usage */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-[#1A1A1A]">3D Generations</span>
                <span className="text-[10px] font-mono text-[#7A7670]">{usageStats.models.current} / {usageStats.models.max} Models</span>
              </div>
              <div className="h-2 w-full bg-[#EFEDEA] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(usageStats.models.current, usageStats.models.max)} transition-all duration-500`}
                  style={{ width: `${(usageStats.models.current / usageStats.models.max) * 100}%` }}
                />
              </div>
            </div>

            {/* Views Usage */}
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm font-medium text-[#1A1A1A]">SDK Bandwidth / Views</span>
                <span className="text-[10px] font-mono text-[#7A7670]">{usageStats.views.current.toLocaleString()} / {usageStats.views.max.toLocaleString()} Views</span>
              </div>
              <div className="h-2 w-full bg-[#EFEDEA] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(usageStats.views.current, usageStats.views.max)} transition-all duration-500`}
                  style={{ width: `${(usageStats.views.current / usageStats.views.max) * 100}%` }}
                />
              </div>
            </div>
            
          </div>
        </section>

        {/* Pricing Tiers */}
        <section>
          <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-4">Subscription Plan</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TIERS.map((tier, i) => (
              <div 
                key={i} 
                className={`bg-white rounded-3xl p-6 flex flex-col relative transition-transform hover:-translate-y-1 ${
                  tier.highlighted 
                    ? 'border-2 border-[#1A1A1A] shadow-md' 
                    : 'border border-[#E5E2DD] shadow-sm'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1A1A1A] text-white px-3 py-1 rounded-full text-[9px] uppercase tracking-widest font-mono font-bold">
                    Recommended
                  </div>
                )}
                
                <h3 className="text-xl font-medium text-[#1A1A1A] mb-1">{tier.name}</h3>
                <p className="text-xs text-[#7A7670] mb-6 min-h-[32px]">{tier.description}</p>
                
                <div className="mb-6 flex items-end gap-1">
                  <span className="text-4xl font-serif italic text-[#1A1A1A]">{tier.price}</span>
                  <span className="text-xs text-[#7A7670] font-mono mb-1">{tier.period}</span>
                </div>
                
                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-[#4A4742]">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <form action={createCheckoutSession.bind(null, tier.name)}>
                  <button 
                    type="submit"
                    className={`w-full py-3 rounded-full text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] ${
                      tier.highlighted 
                        ? 'bg-[#1A1A1A] text-white hover:bg-black' 
                        : 'bg-[#F9F8F6] text-[#1A1A1A] border border-[#E5E2DD] hover:border-[#1A1A1A]'
                    }`}
                  >
                    {tier.cta}
                  </button>
                </form>
              </div>
            ))}
          </div>
        </section>

        {/* Payment & Invoices */}
        <section>
          <div className="bg-white rounded-3xl border border-[#E5E2DD] shadow-sm overflow-hidden">
            <div className="p-6 border-b border-[#E5E2DD] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A] mb-1">Payment & Invoices</h2>
                <p className="text-xs text-[#7A7670]">Manage your billing details and download previous invoices.</p>
              </div>
              <form action={createBillingPortalSession}>
                <button type="submit" className="flex items-center gap-2 px-4 py-2 bg-[#F9F8F6] border border-[#E5E2DD] text-[#1A1A1A] rounded-full text-[10px] uppercase tracking-widest font-bold hover:border-[#1A1A1A] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]">
                  <CreditCard className="w-3 h-3" />
                  Manage Billing via Stripe
                  <ArrowUpRight className="w-3 h-3 text-[#7A7670]" />
                </button>
              </form>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E2DD] bg-[#F9F8F6]">
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-normal">Invoice</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-normal">Date</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-normal">Status</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-normal text-right">Amount</th>
                    <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-mono text-[#7A7670] font-normal text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E2DD]">
                  {INVOICES.map((inv, idx) => (
                    <tr key={idx} className="hover:bg-[#EFEDEA] transition-colors group">
                      <td className="px-6 py-4 text-sm font-medium text-[#1A1A1A]">{inv.id}</td>
                      <td className="px-6 py-4 text-[12px] font-mono text-[#4A4742]">{inv.date}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-[9px] font-mono tracking-widest uppercase">
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-serif italic text-[#1A1A1A] text-right">{inv.amount}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          className="p-2 text-[#7A7670] hover:text-[#1A1A1A] hover:bg-white rounded-lg transition-colors border border-transparent hover:border-[#E5E2DD] inline-flex items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
                          aria-label={`Download invoice ${inv.id}`}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
    </DashboardLayout>
  );
}
