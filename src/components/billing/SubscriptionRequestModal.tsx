"use client";

import React, { useState, useTransition } from "react";
import { CheckCircle, AlertCircle, Send } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { PLANS } from "@/lib/plans";
import { submitPlanRequest } from "@/app/actions/subscription";

export interface SubscriptionRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTier: string;
  email: string;
  companyName: string | null;
}

function tierLabel(tierId: string): string {
  const plan = PLANS.find((p) => p.id === tierId);
  if (!plan) return tierId;
  if (plan.price === null) return `${plan.name} (Custom)`;
  if (plan.price === 0) return plan.name;
  return `${plan.name} ($${plan.price}/mo)`;
}

export function SubscriptionRequestModal({
  isOpen,
  onClose,
  defaultTier,
  email,
  companyName,
}: SubscriptionRequestModalProps) {
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState<{ name: string; email: string; tier: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSuccess(null);
      setError(null);
      onClose();
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const form = e.currentTarget;
    const formData = new FormData(form);
    const submittedName = (formData.get("name") as string)?.trim() ?? "";
    const submittedEmail = (formData.get("email") as string)?.trim() ?? "";
    const submittedTier = (formData.get("interestedTier") as string) ?? "";

    startTransition(async () => {
      const result = await submitPlanRequest(formData);
      if (result.ok) {
        setSuccess({ name: submittedName, email: submittedEmail, tier: submittedTier });
        form.reset();
      } else {
        setError(result.message);
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={() => handleOpenChange(false)} title="Request a plan" size="md">
      {success ? (
        <div className="flex flex-col items-center text-center gap-4 py-6">
          <span className="w-14 h-14 rounded-full flex items-center justify-center bg-[var(--positive)]/10">
            <CheckCircle className="w-7 h-7 text-[var(--positive-deep)]" aria-hidden="true" />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold text-[var(--text-primary)]">
              Thank you{success.name ? `, ${success.name}` : ""}!
            </h3>
            <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">
              Your interest in the <strong>{tierLabel(success.tier)}</strong> plan is noted.
              <br />
              Our team will contact you soon at{" "}
              <strong className="text-[var(--text-primary)]">{success.email}</strong>.
            </p>
          </div>
          <Button variant="primary" onClick={() => handleOpenChange(false)}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-tier" className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] mb-1 block">
                Interested in
              </label>
              <Select id="plan-tier" name="interestedTier" defaultValue={defaultTier}>
                {PLANS.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {tierLabel(plan.id)}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="plan-name" className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] mb-1 block">
                Name
              </label>
              <Input id="plan-name" name="name" type="text" required maxLength={120} placeholder="Your name" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="plan-email" className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] mb-1 block">
                Email to contact
              </label>
              <Input id="plan-email" name="email" type="email" required maxLength={320} defaultValue={email} placeholder="you@company.com" />
            </div>
            <div>
              <label htmlFor="plan-company" className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] mb-1 block">
                Company
              </label>
              <Input
                id="plan-company"
                name="company"
                type="text"
                readOnly
                aria-readonly="true"
                value={companyName ?? ""}
                placeholder="Not set on your profile"
                className="bg-[var(--canvas-soft)] text-[var(--text-secondary)] cursor-default"
              />
              <p className="text-[11px] text-[var(--text-muted)] mt-1">Attached automatically from your profile.</p>
            </div>
          </div>
          <div>
            <label htmlFor="plan-message" className="text-[10px] uppercase tracking-widest font-sans text-[var(--text-muted)] mb-1 block">
              Additional details
            </label>
            <Textarea
              id="plan-message"
              name="message"
              required
              maxLength={2000}
              rows={4}
              placeholder="Catalog size, timeline, questions — anything we should know…"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm text-[var(--negative-deep)]" role="alert">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              {error}
            </div>
          )}
          <Button type="submit" variant="primary" size="lg" isLoading={isPending} leftIcon={<Send className="w-4 h-4" />}>
            Send request
          </Button>
        </form>
      )}
    </Modal>
  );
}
