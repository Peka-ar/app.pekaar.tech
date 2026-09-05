import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen font-sans" style={{ backgroundColor: 'var(--canvas)', color: 'var(--text-primary)' }}>
      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
        <p className="label-mono mb-4 text-[var(--text-muted)]">Legal · Last updated September 2026</p>
        <h1
          className="font-display text-[clamp(2.125rem,4.5vw,3rem)] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--text-primary)]"
          style={{ textWrap: "balance" }}
        >
          Terms of Service
        </h1>
        <div className="mt-3 h-px w-full" style={{ backgroundColor: 'var(--border-default)' }} aria-hidden="true" />

        <div className="mt-8 space-y-6 text-[16px] leading-[1.6] text-[var(--text-secondary)]">
          <p
            className="rounded-xl border p-4 text-[14px] leading-[1.5]"
            style={{ backgroundColor: 'var(--warning)', color: 'var(--warning-content)', borderColor: 'var(--warning)' }}
          >
            <strong className="font-semibold">Placeholder Notice:</strong> This is a placeholder Terms of Service. Replace with reviewed legal copy before launch.
          </p>

          <p>
            This document serves as a temporary placeholder for the Terms of Service agreement that will govern users&apos; use of the Peka AR (pekaar.tech) platform. The final version should be drafted or reviewed by a qualified legal professional.
          </p>

          <p>
            When drafting your Terms of Service, consider including provisions related to:
          </p>

          <ul className="list-disc pl-6 space-y-2 marker:text-[var(--text-muted)]">
            <li>User accounts and registration</li>
            <li>Acceptable use policies</li>
            <li>Intellectual property rights</li>
            <li>Limitation of liability</li>
            <li>Dispute resolution</li>
            <li>Termination clauses</li>
            <li>Governing law and jurisdiction</li>
          </ul>

          <p>
            For assistance with legal document preparation, consult with a legal professional familiar with your jurisdiction and industry requirements.
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
