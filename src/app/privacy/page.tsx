import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen font-sans" style={{ backgroundColor: 'var(--canvas)', color: 'var(--text-primary)' }}>
      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
        <p className="label-mono mb-4 text-[var(--text-muted)]">Legal · Last updated September 2026</p>
        <h1
          className="font-display text-[clamp(2.125rem,4.5vw,3rem)] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)]"
          style={{ textWrap: "balance" }}
        >
          Privacy Policy
        </h1>
        <div className="mt-3 h-px w-full" style={{ backgroundColor: 'var(--border-default)' }} aria-hidden="true" />

        <div className="mt-8 space-y-6 text-[16px] leading-[1.6] text-[var(--text-secondary)]">
          <p
            className="rounded-xl border p-4 text-[14px] leading-[1.5]"
            style={{ backgroundColor: 'var(--warning)', color: 'var(--warning-content)', borderColor: 'var(--warning)' }}
          >
            <strong className="font-semibold">Placeholder Notice:</strong> This is a placeholder Privacy Policy. Replace with reviewed legal copy before launch.
          </p>

          <p>
            This document serves as a temporary placeholder for the Privacy Policy that will govern how Peka AR (pekaar.tech) collects, uses, discloses, and manages user data. The final version should be drafted or reviewed by a qualified legal professional.
          </p>

          <p>
            When drafting your Privacy Policy, consider including information about:
          </p>

          <ul className="list-disc pl-6 space-y-2 marker:text-[var(--text-muted)]">
            <li>Information collection (personal, usage, device data)</li>
            <li>How information is used and shared</li>
            <li>Cookie and tracking technologies</li>
            <li>Data retention policies</li>
            <li>User rights (access, correction, deletion)</li>
            <li>Third-party integrations and transfers</li>
            <li>Children&apos;s privacy (COPPA compliance)</li>
            <li>Security measures and breach notification</li>
          </ul>

          <p>
            For assistance with privacy compliance (GDPR, CCPA, etc.), consult with a legal professional familiar with your jurisdiction and data protection requirements.
          </p>
        </div>

        <div className="mt-12 pt-8 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <Link
            href="/"
            className="text-sm font-semibold text-[var(--text-primary)] underline underline-offset-4 hover:text-[var(--ink-deep)] transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
