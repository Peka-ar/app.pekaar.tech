"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Boxes, Building2, Camera, Code2, Layers3, RefreshCw, Store } from "lucide-react";
import { completeOnboarding } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Wordmark } from "@/components/Wordmark";

const categoryOptions = ["Furniture", "Home decor", "Fashion", "Beauty", "Electronics", "Other"];
const platformOptions = ["Shopify", "WooCommerce", "Webflow", "Custom", "Other"];
const catalogSizeOptions = ["1-10 products", "11-50 products", "51-200 products", "200+ products"];

const STEP_META: { num: string; label: string }[] = [
  { num: "01", label: "Brand" },
  { num: "02", label: "Pipeline" },
  { num: "03", label: "Category" },
  { num: "04", label: "Platform" },
  { num: "05", label: "Catalog" },
];

export default function OnboardingClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [storefrontPlatform, setStorefrontPlatform] = useState("");
  const [catalogSize, setCatalogSize] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isLastStep = step === 5;

  const handleNext = async () => {
    setError(null);

    if (step === 1 && !companyName.trim()) {
      setError("Company name is required");
      return;
    }

    if (!isLastStep) {
      setStep((current) => current + 1);
      return;
    }

    setLoading(true);
    try {
      await completeOnboarding({ companyName, productCategory, storefrontPlatform, catalogSize });
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete onboarding");
    } finally {
      setLoading(false);
    }
  };

  const selectButtonClass = (selected: boolean) =>
    `rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] ${selected ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--canvas)]" : "border-[var(--border-default)] bg-[var(--canvas)] text-[var(--text-primary)] hover:border-[var(--text-primary)]"}`;

  return (
    <main className="min-h-screen bg-[var(--canvas)] text-[var(--text-primary)] px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col overflow-hidden rounded-[24px] border border-[var(--border-default)] bg-[var(--canvas)] lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        {/* Aside — v2 ink panel, constant across themes, hairline delineates in dark */}
        <aside className="relative hidden flex-col justify-between gap-12 bg-[var(--ink)] p-8 text-[var(--on-ink)] sm:p-8 lg:flex lg:p-12 border-r border-[var(--border-default)]">
          <div>
            <p className="font-sans text-[11px] uppercase tracking-[0.2em] text-[var(--on-ink)]/60">
              <Wordmark className="font-display font-semibold tracking-[0.2em] uppercase text-[var(--on-ink)]" dotClassName="text-[var(--accent)]" /> setup
            </p>
            <h1 className="mt-6 max-w-md font-display text-[clamp(1.9rem,3vw,2.5rem)] font-bold leading-[1.1] tracking-[-0.015em] text-[var(--on-ink)]" style={{ textWrap: "balance" }}>
              Build your 3D commerce workspace.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[var(--on-ink)]/65">
              Answer a few setup questions so your upload flow, admin review, and integration guidance match how your brand sells.
            </p>
          </div>
          <div className="grid gap-3">
            {["Upload reference photography", "Review production status", "Embed published 3D viewers"].map((item) => (
              <div
                key={item}
                className="rounded-xl border border-[rgba(232,235,230,0.14)] bg-[rgba(232,235,230,0.06)] px-4 py-3 font-sans text-[11px] uppercase tracking-[0.12em] text-[var(--on-ink)]/70"
              >
                {item}
              </div>
            ))}
          </div>
        </aside>

        <section className="flex flex-1 flex-col p-6 sm:p-8 lg:p-10">
          {/* Step indicator — mono eyebrows + status dots (pipeline vocabulary) */}
          <nav aria-label="Onboarding progress" className="mb-8">
            <ol className="flex flex-wrap items-center gap-3 sm:gap-4" role="list">
              {STEP_META.map((meta, idx) => {
                const stepIdx = idx + 1;
                const isActive = stepIdx === step;
                const isComplete = stepIdx < step;
                return (
                  <li key={meta.num} className="flex items-center gap-2" aria-current={isActive ? "step" : undefined}>
                    <span
                      aria-hidden="true"
                      className={`h-2.5 w-2.5 shrink-0 rounded-full border transition-colors ${
                        isComplete
                          ? "border-[var(--positive)] bg-[var(--positive)]"
                          : isActive
                            ? "border-[var(--accent)] bg-[var(--accent)] shadow-[0_0_0_4px_var(--accent-pale)]"
                            : "border-[var(--border-default)] bg-transparent"
                      }`}
                    />
                    <span
                      className={`font-sans text-[11px] uppercase tracking-[0.12em] ${isActive ? "font-semibold text-[var(--text-primary)]" : isComplete ? "text-[var(--text-secondary)]" : "text-[var(--text-muted)]"}`}
                    >
                      {meta.num} {meta.label}
                    </span>
                    {idx < STEP_META.length - 1 && (
                      <span aria-hidden="true" className="mx-1 hidden h-px w-6 bg-[var(--border-default)] sm:block" />
                    )}
                  </li>
                );
              })}
            </ol>
            <p className="mt-3 font-sans text-[11px] uppercase tracking-[0.12em] text-[var(--text-muted)]">Step {step} of 5</p>
          </nav>

          {/* Step body — card-content per step */}
          <div className="flex flex-1 items-start">
            <div className="card w-full p-6 sm:p-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {step === 1 && (
                <div className="max-w-xl">
                  <Building2 className="mb-5 h-7 w-7 text-[var(--text-muted)]" aria-hidden="true" />
                  <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)] sm:text-3xl" style={{ textWrap: "balance" }}>
                    What should we call your brand?
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">This name appears across your dashboard and task pipeline.</p>
                  <div className="mt-8">
                    <FormField label="Company name" htmlFor="companyName" required>
                      <Input
                        id="companyName"
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        placeholder="Acme Furniture Co."
                        autoComplete="organization"
                      />
                    </FormField>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="max-w-2xl">
                  <Layers3 className="mb-5 h-7 w-7 text-[var(--text-muted)]" aria-hidden="true" />
                  <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)] sm:text-3xl" style={{ textWrap: "balance" }}>
                    From product photos to embeddable 3D.
                  </h2>
                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {[
                      { icon: Camera, title: "Upload", body: "Send multi-angle product photography and dimensions." },
                      { icon: RefreshCw, title: "Generate", body: "Peka AR prepares web-ready GLB and USDZ assets." },
                      { icon: Code2, title: "Embed", body: "Publish an iframe viewer into your storefront." },
                    ].map(({ icon: Icon, title, body }) => (
                      <div key={title} className="rounded-2xl border border-[var(--border-default)] bg-[var(--canvas-soft)] p-5">
                        <Icon className="mb-4 h-5 w-5 text-[var(--text-primary)]" aria-hidden="true" />
                        <h3 className="font-sans text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-primary)]">{title}</h3>
                        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <ChoiceStep
                  icon={<Boxes className="mb-5 h-7 w-7 text-[var(--text-muted)]" aria-hidden="true" />}
                  title="What kind of products do you sell?"
                  subtitle="Optional, but useful for admin production context."
                  options={categoryOptions}
                  value={productCategory}
                  onChange={setProductCategory}
                  buttonClass={selectButtonClass}
                />
              )}

              {step === 4 && (
                <ChoiceStep
                  icon={<Store className="mb-5 h-7 w-7 text-[var(--text-muted)]" aria-hidden="true" />}
                  title="Where will you embed your 3D viewers?"
                  subtitle="We use this to tailor integration guidance."
                  options={platformOptions}
                  value={storefrontPlatform}
                  onChange={setStorefrontPlatform}
                  buttonClass={selectButtonClass}
                />
              )}

              {step === 5 && (
                <ChoiceStep
                  icon={<Layers3 className="mb-5 h-7 w-7 text-[var(--text-muted)]" aria-hidden="true" />}
                  title="How large is your catalog?"
                  subtitle="Optional. This helps frame production volume later."
                  options={catalogSizeOptions}
                  value={catalogSize}
                  onChange={setCatalogSize}
                  buttonClass={selectButtonClass}
                />
              )}

              {error && (
                <Alert tone="error" className="mt-6">
                  {error}
                </Alert>
              )}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 border-t border-[var(--border-default)] pt-6">
            <Button
              type="button"
              variant="secondary"
              size="md"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={step === 1 || loading}
            >
              Back
            </Button>
            <div className="flex items-center gap-3">
              {step > 2 && !isLastStep && (
                <Button type="button" variant="ghost" size="md" onClick={() => setStep((current) => current + 1)}>
                  Skip
                </Button>
              )}
              <Button
                type="button"
                variant="primary"
                size="md"
                rightIcon={!isLastStep ? <ArrowRight className="h-4 w-4" /> : undefined}
                onClick={handleNext}
                disabled={loading}
                isLoading={loading}
              >
                {loading ? "Saving..." : isLastStep ? "Go to dashboard" : "Continue"}
              </Button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ChoiceStep({
  icon,
  title,
  subtitle,
  options,
  value,
  onChange,
  buttonClass,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  buttonClass: (selected: boolean) => string;
}) {
  return (
    <div className="max-w-2xl">
      {icon}
      <h2 className="font-display text-2xl font-semibold tracking-[-0.01em] text-[var(--text-primary)] sm:text-3xl" style={{ textWrap: "balance" }}>
        {title}
      </h2>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{subtitle}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onChange(value === option ? "" : option)} className={buttonClass(value === option)}>
            {option}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--text-muted)]">You can skip this and still finish setup.</p>
    </div>
  );
}
