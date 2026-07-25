"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Boxes, Building2, Camera, Code2, Layers3, RefreshCw, Store } from "lucide-react";
import { completeOnboarding } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

const categoryOptions = ["Furniture", "Home decor", "Fashion", "Beauty", "Electronics", "Other"];
const platformOptions = ["Shopify", "WooCommerce", "Webflow", "Custom", "Other"];
const catalogSizeOptions = ["1-10 products", "11-50 products", "51-200 products", "200+ products"];

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
    `rounded-2xl border px-4 py-3 text-left text-sm transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] ${selected ? "border-[var(--color-text-primary)] bg-[var(--color-text-primary)] text-[var(--color-canvas)]" : "border-[var(--color-border-default)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:border-[var(--color-text-primary)]"}`;

  return (
    <main className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)] px-4 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-6xl flex-col rounded-[2rem] border border-[var(--color-border-default)] bg-[var(--color-surface)] shadow-sm overflow-hidden lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="relative bg-[#1A1A1A] p-8 text-white lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_36%)]" />
          <div className="relative flex h-full flex-col justify-between gap-12">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-white/60">STUDIO.V setup</p>
              <h1 className="mt-6 max-w-md text-4xl font-serif leading-tight sm:text-5xl">Build your 3D commerce workspace.</h1>
              <p className="mt-5 max-w-sm text-sm leading-6 text-white/65">Answer a few setup questions so your upload flow, admin review, and integration guidance match how your brand sells.</p>
            </div>
            <div className="grid gap-3 text-xs text-white/70">
              {[
                "Upload reference photography",
                "Review production status",
                "Embed published 3D viewers",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-mono uppercase tracking-widest">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="flex flex-1 flex-col p-6 sm:p-10 lg:p-12">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="flex gap-2" aria-label="Onboarding progress">
              {[1, 2, 3, 4, 5].map((idx) => (
                <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === step ? "w-10 bg-[var(--color-text-primary)]" : idx < step ? "w-6 bg-[var(--color-text-muted)]" : "w-6 bg-[var(--color-border-default)]"}`} />
              ))}
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-muted)]">Step {step} of 5</span>
          </div>

          <div className="flex flex-1 items-center">
            <div className="w-full animate-in fade-in slide-in-from-bottom-3 duration-300">
              {step === 1 && (
                <div className="max-w-xl">
                  <Building2 className="mb-6 h-8 w-8 text-[var(--color-text-muted)]" />
                  <h2 className="text-4xl font-serif">What should we call your brand?</h2>
                  <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">This name appears across your dashboard and task pipeline.</p>
                  <label htmlFor="companyName" className="mt-8 block text-[11px] font-mono font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Company name</label>
                  <input id="companyName" value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-2 block w-full rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] px-4 py-3 text-sm outline-none transition-colors hover:bg-[var(--color-canvas-secondary)] focus:border-[var(--color-text-primary)] focus:ring-1 focus:ring-[var(--color-text-primary)]" placeholder="Acme Furniture Co." />
                </div>
              )}

              {step === 2 && (
                <div className="max-w-2xl">
                  <Layers3 className="mb-6 h-8 w-8 text-[var(--color-text-muted)]" />
                  <h2 className="text-4xl font-serif">From product photos to embeddable 3D.</h2>
                  <div className="mt-8 grid gap-4 sm:grid-cols-3">
                    {[{ icon: Camera, title: "Upload", body: "Send multi-angle product photography and dimensions." }, { icon: RefreshCw, title: "Generate", body: "STUDIO.V prepares web-ready GLB and USDZ assets." }, { icon: Code2, title: "Embed", body: "Publish an iframe viewer into your storefront." }].map(({ icon: Icon, title, body }) => (
                      <div key={title} className="rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] p-5">
                        <Icon className="mb-4 h-5 w-5 text-[var(--color-text-primary)]" />
                        <h3 className="font-mono text-[11px] font-bold uppercase tracking-widest">{title}</h3>
                        <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{body}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <ChoiceStep icon={<Boxes className="mb-6 h-8 w-8 text-[var(--color-text-muted)]" />} title="What kind of products do you sell?" subtitle="Optional, but useful for admin production context." options={categoryOptions} value={productCategory} onChange={setProductCategory} buttonClass={selectButtonClass} />
              )}

              {step === 4 && (
                <ChoiceStep icon={<Store className="mb-6 h-8 w-8 text-[var(--color-text-muted)]" />} title="Where will you embed your 3D viewers?" subtitle="We use this to tailor integration guidance." options={platformOptions} value={storefrontPlatform} onChange={setStorefrontPlatform} buttonClass={selectButtonClass} />
              )}

              {step === 5 && (
                <ChoiceStep icon={<Layers3 className="mb-6 h-8 w-8 text-[var(--color-text-muted)]" />} title="How large is your catalog?" subtitle="Optional. This helps frame production volume later." options={catalogSizeOptions} value={catalogSize} onChange={setCatalogSize} buttonClass={selectButtonClass} />
              )}
            </div>
          </div>

          {error && <Alert tone="error" className="mt-6">{error}</Alert>}

          <div className="mt-10 flex items-center justify-between gap-4 border-t border-[var(--color-border-default)] pt-6">
            <Button
              type="button"
              variant="ghost"
              size="md"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              onClick={() => setStep((current) => Math.max(1, current - 1))}
              disabled={step === 1 || loading}
            >
              Back
            </Button>
            <div className="flex items-center gap-3">
              {step > 2 && !isLastStep && (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setStep((current) => current + 1)}
                >
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

function ChoiceStep({ icon, title, subtitle, options, value, onChange, buttonClass }: { icon: React.ReactNode; title: string; subtitle: string; options: string[]; value: string; onChange: (value: string) => void; buttonClass: (selected: boolean) => string }) {
  return (
    <div className="max-w-2xl">
      {icon}
      <h2 className="text-4xl font-serif">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--color-text-secondary)]">{subtitle}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {options.map((option) => (
          <button key={option} type="button" onClick={() => onChange(value === option ? "" : option)} className={buttonClass(value === option)}>
            {option}
          </button>
        ))}
      </div>
      <p className="mt-4 text-xs text-[var(--color-text-muted)]">You can skip this and still finish setup.</p>
    </div>
  );
}