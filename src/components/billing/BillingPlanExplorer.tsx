"use client";

import React, { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PLANS } from "@/lib/plans";
import { SubscriptionRequestModal } from "./SubscriptionRequestModal";

interface BillingPlanExplorerProps {
  currentTier: string;
  email: string;
  companyName: string | null;
}

export default function BillingPlanExplorer({ currentTier, email, companyName }: BillingPlanExplorerProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  return (
    <>
      {/* Plan comparison */}
      <div>
        <h3 className="font-display text-lg font-bold text-[var(--text-primary)] mb-4">
          All plans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-[24px] p-5 flex flex-col ${
                plan.id === currentTier
                  ? "bg-[var(--primary)] text-[var(--on-primary)] ring-2 ring-[var(--primary)]"
                  : "bg-white border border-[var(--border-default)]"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <h4 className={`font-display text-base font-bold ${plan.id === currentTier ? "text-[var(--on-primary)]" : "text-[var(--text-primary)]"}`}>
                  {plan.name}
                </h4>
                {plan.id === currentTier && (
                  <span className="text-[9px] uppercase tracking-widest font-sans font-semibold bg-[var(--accent)] text-[var(--on-accent)] px-2 py-0.5 rounded-full">
                    Current
                  </span>
                )}
              </div>
              <p className={`font-display text-2xl font-bold tracking-tight ${plan.id === currentTier ? "text-[var(--on-primary)]" : "text-[var(--text-primary)]"}`}>
                {plan.priceLabel}
                {plan.period && <span className={`text-xs font-normal ${plan.id === currentTier ? "text-[var(--on-primary)]/60" : "text-[var(--text-muted)]"}`}>{plan.period}</span>}
              </p>
              <p className={`text-xs font-semibold mt-1 ${plan.id === currentTier ? "text-[var(--accent)]" : "text-[var(--primary)]"}`}>
                {plan.creditLabel}
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${plan.id === currentTier ? "text-[var(--accent)]" : "text-[var(--primary)]"}`} aria-hidden="true" />
                    <span className={`text-xs ${plan.id === currentTier ? "text-[var(--on-primary)]/80" : "text-[var(--text-secondary)]"}`}>{f}</span>
                  </li>
                ))}
              </ul>
              {plan.id !== currentTier && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="mt-4 w-full"
                  onClick={() => setSelectedTier(plan.id)}
                >
                  Contact us
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>

      <SubscriptionRequestModal
        isOpen={selectedTier !== null}
        onClose={() => setSelectedTier(null)}
        defaultTier={selectedTier ?? "PREMIUM"}
        email={email}
        companyName={companyName}
      />
    </>
  );
}
