import React from "react";
import LandingFooter from "@/components/landing/LandingFooter";
import { CopyEmailButton } from "@/components/contact/CopyEmailButton";

export const metadata = {
  title: "Contact us — Peka AR",
  description: "Questions about pricing, plans, or anything else? Reach the Peka AR team at kaizen3242@gmail.com.",
};

const EMAIL = "kaizen3242@gmail.com";

export default function ContactPage() {
  return (
    <main className="min-h-screen font-sans" style={{ backgroundColor: "var(--canvas)", color: "var(--text-primary)" }}>
      {/* Hero */}
      <section className="pt-16 pb-12 sm:pt-24 sm:pb-16 text-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="label-mono text-[var(--text-muted)] mb-4">Contact</p>
          <h1 className="font-display text-[clamp(2.125rem,4.5vw,3rem)] font-bold tracking-tight text-[var(--text-primary)]">
            Get in touch
          </h1>
          <p className="mt-3 text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            Questions about pricing, your account, or anything else — drop us a line.
          </p>
        </div>
      </section>

      {/* Email card */}
      <section className="pb-16 sm:pb-24">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-[24px] p-6 sm:p-8 border border-[var(--border-default)] text-center">
            <p className="label-mono text-[var(--text-muted)] mb-3">Email us</p>
            <a
              href={`mailto:${EMAIL}`}
              className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[var(--primary)] break-all hover:text-[var(--primary-hover)] transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--text-primary)] rounded"
            >
              {EMAIL}
            </a>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={`mailto:${EMAIL}`}
                className="btn-primary inline-flex items-center justify-center"
              >
                Email us
              </a>
              <CopyEmailButton email={EMAIL} />
            </div>
            <p className="mt-6 text-sm text-[var(--text-secondary)]">
              Prefer a guided walkthrough? Sign up first — logged-in users can request any plan
              from the billing page, and our team will contact you soon.
            </p>
            <a
              href="/auth?view=signup"
              className="btn-tertiary inline-flex items-center justify-center mt-4"
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
