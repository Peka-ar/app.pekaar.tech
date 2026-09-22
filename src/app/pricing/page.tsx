import React from "react";
import { Check, Clock, Code, Smartphone, Zap, Paintbrush, RefreshCw } from "lucide-react";
import { PLANS } from "@/lib/plans";
import LandingFooter from "@/components/landing/LandingFooter";

export const metadata = {
  title: "Pricing — Peka AR",
  description:
    "Simple, transparent pricing for 3D product assets. Start free with 6 credits a month, upgrade for artist-finished models. First model free.",
};

const HBR_URL = "https://hbr.org/2022/03/how-augmented-reality-can-and-cant-help-your-brand";
const ALTER_URL = "https://alteragents.com/the-future-of-shopping-has-arrived-and-its-augmented-reality/";

const BENEFITS = [
  {
    icon: Smartphone,
    well: "bg-[var(--accent-pale)]",
    glyph: "text-[var(--ink-deep)]",
    title: "Shoppers buy with confidence",
    desc: "Let customers view the product in their own room before they buy.",
    proof: (
      <>
        AR shoppers felt{" "}
        <a href={ALTER_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors">
          80% more confident buying
        </a>{" "}
        — Alter Agents, Snap and Publicis Media, 2022.
      </>
    ),
  },
  {
    icon: Clock,
    well: "bg-[var(--surface-butter)]",
    glyph: "text-[var(--surface-butter-deep)]",
    title: "Live in hours, not weeks",
    desc: "Send standard product photos and get an embeddable 3D model back on your storefront the same day.",
    proof: null as React.ReactNode,
  },
  {
    icon: Code,
    well: "bg-[var(--surface-sky)]",
    glyph: "text-[var(--surface-sky-deep)]",
    title: "One line, any storefront",
    desc: "A single iframe line drops into Shopify, WooCommerce, Webflow, or a custom stack.",
    proof: null as React.ReactNode,
  },
] as const;

const CREDIT_STEPS = [
  {
    icon: Zap,
    well: "bg-[var(--accent-pale)]",
    glyph: "text-[var(--ink-deep)]",
    title: "AI Draft",
    cost: "2 credits per model · 1 to regenerate",
    desc: "Upload photos and get a first 3D draft in about 5 to 10 minutes. Good enough to preview, priced to try.",
  },
  {
    icon: Paintbrush,
    well: "bg-[var(--surface-butter)]",
    glyph: "text-[var(--surface-butter-deep)]",
    title: "Premium production",
    cost: "10 credits per model",
    desc: "A 3D artist finishes the model by hand, with revisions until it matches your product.",
  },
  {
    icon: RefreshCw,
    well: "bg-[var(--surface-sky)]",
    glyph: "text-[var(--surface-sky-deep)]",
    title: "Monthly refresh",
    cost: "Resets every 30 days",
    desc: "Your credits return to your plan amount every 30 days. Unused credits reset with the cycle.",
  },
] as const;

const INCLUDED = [
  { title: "3D model hosting", desc: "Your models hosted and ready to embed on any storefront." },
  { title: "AR view-in-room", desc: "Let shoppers see products in their space before buying." },
  { title: "GLB + USDZ formats", desc: "Universal compatibility with WebXR and Apple Quick Look." },
  { title: "One-line iframe embed", desc: "Drop a single line of code into Shopify, WooCommerce, or any platform." },
  { title: "AI Draft generation", desc: "Turn photos into a first 3D draft in minutes, on every plan including Free." },
  { title: "Revisions included", desc: "Request changes with a note until the model matches your product." },
  { title: "You keep the files", desc: "Download your GLB and USDZ any time. No lock-in." },
  { title: "Engagement analytics", desc: "Track views and AR launches per project from your dashboard." },
];

const FAQS = [
  {
    q: "What is a credit?",
    a: "A credit is one unit of production. AI Draft costs 2 credits per model and regenerating a draft costs 1. Premium production costs 10 credits per model.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "Request a plan upgrade from your Billing page and our team will contact you soon. Your credits also refresh every 30 days on your plan's cycle.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Pick any plan from your Billing page and our team will contact you soon to move you across.",
  },
  {
    q: "Do I own my 3D files?",
    a: "Yes. Download your GLB and USDZ whenever you like, on every plan including Free.",
  },
  {
    q: "What does the free first model include?",
    a: "Your first product modeled free: artist-finished GLB plus USDZ, a live 3D embed for your storefront, and AR view-in-room.",
  },
  {
    q: "What is the difference between Free and Premium?",
    a: "Free includes AI Draft generation, hosting, and embeds. Premium adds artist-finished production, more monthly credits, and priority support.",
  },
  {
    q: "Does it work with my storefront?",
    a: "Yes. The embed is one iframe line and works on Shopify, WooCommerce, Webflow, and custom platforms.",
  },
  {
    q: "How do I get started?",
    a: "Sign up, upload a few product photos, and your first model is on us.",
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen font-sans" style={{ backgroundColor: "var(--canvas)", color: "var(--text-primary)" }}>
      {/* Hero */}
      <section className="pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="label-mono text-[var(--text-muted)] mb-4">Pricing</p>
          <h1 className="font-display text-[clamp(2.125rem,4.5vw,3rem)] font-bold tracking-tight text-[var(--text-primary)]">
            Simple, transparent pricing
          </h1>
          <p className="mt-3 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Start free. Upgrade when you&apos;re ready. No hidden fees.
          </p>
          <p className="mt-5 text-sm text-[var(--text-muted)] max-w-2xl mx-auto">
            Academic research in{" "}
            <a href={HBR_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-[var(--text-primary)] transition-colors">
              Harvard Business Review
            </a>{" "}
            found shoppers who used AR were 19.8% more likely to purchase.
          </p>
        </div>
      </section>

      {/* Plan cards */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-[24px] p-6 flex flex-col ${
                  plan.highlighted
                    ? "bg-[var(--primary)] text-[var(--on-primary)] ring-2 ring-[var(--primary)]"
                    : "bg-white border border-[var(--border-default)]"
                }`}
              >
                {plan.highlighted && (
                  <span className="self-start text-[10px] uppercase tracking-widest font-sans font-semibold bg-[var(--accent)] text-[var(--on-accent)] px-3 py-1 rounded-full mb-3">
                    Most popular
                  </span>
                )}
                <h3 className={`font-display text-xl font-bold ${plan.highlighted ? "text-[var(--on-primary)]" : "text-[var(--text-primary)]"}`}>
                  {plan.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className={`font-display text-4xl font-bold tracking-tight ${plan.highlighted ? "text-[var(--on-primary)]" : "text-[var(--text-primary)]"}`}>
                    {plan.priceLabel}
                  </span>
                  {plan.period && (
                    <span className={`text-sm ${plan.highlighted ? "text-[var(--on-primary)]/70" : "text-[var(--text-muted)]"}`}>
                      {plan.period}
                    </span>
                  )}
                </div>
                <p className={`mt-2 text-sm font-semibold ${plan.highlighted ? "text-[var(--accent)]" : "text-[var(--primary)]"}`}>
                  {plan.creditLabel}
                </p>
                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className={`w-4 h-4 mt-0.5 shrink-0 ${plan.highlighted ? "text-[var(--accent)]" : "text-[var(--primary)]"}`} aria-hidden="true" />
                      <span className={`text-sm ${plan.highlighted ? "text-[var(--on-primary)]/90" : "text-[var(--text-secondary)]"}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                {plan.id === "FREE" ? (
                  <a
                    href="/auth?view=signup"
                    className={`mt-6 inline-flex items-center justify-center h-12 px-6 text-sm font-semibold rounded-[24px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      plan.highlighted
                        ? "bg-[var(--accent)] text-[var(--on-accent)] hover:bg-[var(--accent-active)]"
                        : "bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
                    }`}
                  >
                    Get started
                  </a>
                ) : (
                  <a
                    href="/billing"
                    className={`mt-6 inline-flex items-center justify-center h-12 px-6 text-sm font-semibold rounded-[24px] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 ${
                      plan.highlighted
                        ? "bg-[var(--accent)] text-[var(--on-accent)] hover:bg-[var(--accent-active)]"
                        : "bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)]"
                    }`}
                  >
                    Contact us
                  </a>
                )}
              </div>
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-[var(--text-muted)]">
            Your first model is free. Paid plans add artist-finished production and more monthly credits.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: "var(--canvas-soft)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-center text-[var(--text-primary)] mb-4">
            Why brands put their products in 3D
          </h2>
          <p className="text-center text-sm text-[var(--text-secondary)] max-w-xl mx-auto mb-12">
            The outcomes that make storefronts add AR, with the research behind each claim.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {BENEFITS.map((item) => (
              <div key={item.title} className="bg-white rounded-[24px] p-6 flex flex-col">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${item.well}`}>
                  <item.icon className={`w-5 h-5 ${item.glyph}`} aria-hidden="true" />
                </span>
                <h3 className="font-display text-base font-bold text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed flex-1">{item.desc}</p>
                {item.proof && (
                  <p className="mt-4 pt-4 text-xs text-[var(--text-muted)] leading-relaxed" style={{ borderTop: "1px solid var(--border-default)" }}>
                    {item.proof}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How credits work */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-center text-[var(--text-primary)] mb-4">
            How credits work
          </h2>
          <p className="text-center text-sm text-[var(--text-secondary)] max-w-xl mx-auto mb-12">
            Credits power every project. Pick how you produce, and your plan refills them every 30 days.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CREDIT_STEPS.map((step) => (
              <div key={step.title} className="bg-white rounded-[24px] p-6">
                <span className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${step.well}`}>
                  <step.icon className={`w-5 h-5 ${step.glyph}`} aria-hidden="true" />
                </span>
                <h3 className="font-display text-base font-bold text-[var(--text-primary)]">{step.title}</h3>
                <p className="mt-1 text-sm font-semibold text-[var(--primary)]">{step.cost}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-16 sm:py-24" style={{ backgroundColor: "var(--canvas-soft)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-center text-[var(--text-primary)] mb-12">
            What&apos;s included in every plan
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {INCLUDED.map((item) => (
              <div key={item.title} className="bg-white rounded-[24px] p-6">
                <h3 className="font-display text-base font-bold text-[var(--text-primary)]">{item.title}</h3>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold tracking-tight text-center text-[var(--text-primary)] mb-4">
            Common questions
          </h2>
          <p className="text-center text-sm text-[var(--text-secondary)] max-w-xl mx-auto mb-12">
            Everything about credits, plans, and ownership before you start.
          </p>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FAQS.map((item) => (
              <div key={item.q} className="bg-white rounded-[24px] p-6">
                <dt className="font-display text-base font-bold text-[var(--text-primary)]">{item.q}</dt>
                <dd className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{item.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-[24px] p-8 sm:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6"
            style={{ background: "var(--forest)" }}
          >
            <div>
              <h2
                className="font-display font-bold"
                style={{
                  fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                  lineHeight: 1.05,
                  letterSpacing: "-0.02em",
                  textWrap: "balance",
                  color: "var(--on-forest)",
                }}
              >
                Your first model is <span style={{ color: "var(--accent)" }}>free.</span>
              </h2>
              <p className="font-sans text-[15px] leading-[1.6] text-[var(--on-forest)]/70 mt-2 max-w-xl" style={{ textWrap: "pretty" }}>
                Start on the Free plan with 6 credits a month. Upgrade any time.
              </p>
            </div>
            <a
              href="/auth?view=signup"
              className="inline-flex items-center justify-center h-12 px-7 rounded-[24px] bg-[var(--accent)] text-[var(--on-accent)] text-[14px] font-semibold hover:bg-[var(--accent-active)] active:bg-[var(--accent-neutral)] active:scale-[0.98] transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--on-forest)]"
            >
              Sign up
            </a>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}
