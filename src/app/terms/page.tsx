import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="min-h-screen" style={{ backgroundColor: 'var(--canvas)' }}>
      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
        <h1 className="font-serif text-4xl text-[var(--color-text-primary)] mb-8">Terms of Service</h1>

        <div className="space-y-6 text-[var(--color-text-secondary)] leading-relaxed">
          <p className="text-amber-600 p-4 bg-amber-50 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200 rounded-lg">
            <strong>Placeholder Notice:</strong> This is a placeholder Terms of Service. Replace with reviewed legal copy before launch.
          </p>

          <p>
            This document serves as a temporary placeholder for the Terms of Service agreement that will govern users&apos; use of the Peka AR (pekaar.tech) platform. The final version should be drafted or reviewed by a qualified legal professional.
          </p>

          <p>
            When drafting your Terms of Service, consider including provisions related to:
          </p>

          <ul className="list-disc pl-6 space-y-2">
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

        <div className="mt-12 pt-8 border-t border-[var(--color-border-default)]">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[var(--color-text-primary)] underline underline-offset-4 hover:text-[var(--color-text-secondary)] transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </main>
  );
}