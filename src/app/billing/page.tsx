import React from "react";
import Link from "next/link";
import { requirePrincipalOrRedirect } from "@/server/auth-guards";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import BillingPlanExplorer from "@/components/billing/BillingPlanExplorer";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getPlanByTier } from "@/lib/plans";
import { getSubscriptionOverview } from "@/app/actions/subscription";
import { ArrowUpRight } from "lucide-react";

const tierTone = (tier: string) => {
  switch (tier) {
    case "PREMIUM": return "success" as const;
    case "BUSINESS": return "info" as const;
    case "ENTERPRISE": return "inverted" as const;
    default: return "neutral" as const;
  }
};

export default async function BillingPage() {
  const principal = await requirePrincipalOrRedirect();
  const overview = await getSubscriptionOverview();
  const currentPlan = getPlanByTier(overview.tier);

  return (
    <DashboardLayout title="Billing & Plan">
      <div className="space-y-8 animate-in fade-in duration-500">
        {/* Header */}
        <div>
          <p className="label-mono text-[var(--text-muted)] mb-1">Account</p>
          <h2 className="page-title text-[var(--text-primary)]">Billing & Plan</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manage your subscription and view credit usage.
          </p>
        </div>

        {/* Current plan card */}
        <Card className="rounded-[24px]">
          <CardBody className="space-y-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">
                    {overview.tierName} Plan
                  </h3>
                  <Badge tone={tierTone(overview.tier)}>{overview.tier}</Badge>
                </div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {currentPlan?.price === 0 ? "Free forever" : currentPlan?.price != null ? `$${currentPlan.price}/month` : "Custom pricing"}
                </p>
              </div>
              <Link href="/pricing">
                <Button variant="tertiary" size="sm" rightIcon={<ArrowUpRight className="w-3 h-3" />}>
                  View plans
                </Button>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[var(--canvas-soft)] rounded-2xl p-4">
                <p className="label-mono text-[var(--text-muted)] text-[10px] mb-1">Credits remaining</p>
                <p className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  {overview.creditsRemaining}
                </p>
              </div>
              <div className="bg-[var(--canvas-soft)] rounded-2xl p-4">
                <p className="label-mono text-[var(--text-muted)] text-[10px] mb-1">Monthly grant</p>
                <p className="font-display text-3xl font-bold tracking-tight text-[var(--text-primary)]">
                  {overview.monthlyCredits}
                </p>
              </div>
              <div className="bg-[var(--canvas-soft)] rounded-2xl p-4">
                <p className="label-mono text-[var(--text-muted)] text-[10px] mb-1">Next renewal</p>
                <p className="font-display text-lg font-bold tracking-tight text-[var(--text-primary)]">
                  {overview.renewalDate
                    ? new Date(new Date(overview.renewalDate).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "—"}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">30-day cycle</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <BillingPlanExplorer
          currentTier={overview.tier}
          email={principal.email}
          companyName={principal.companyName}
        />
      </div>
    </DashboardLayout>
  );
}
