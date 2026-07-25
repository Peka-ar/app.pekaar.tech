import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen canvas-background">
      <div className="max-w-3xl mx-auto px-6 py-16 lg:py-24">
        <h1 className="font-serif text-4xl text-[#1A1A1A] mb-8">Privacy Policy</h1>
        
        <div className="space-y-6 text-[#4A4742] leading-relaxed">
          <p className="text-amber-600 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <strong>Placeholder Notice:</strong> This is a placeholder Privacy Policy. Replace with reviewed legal copy before launch.
          </p>
          
          <p>
            This document serves as a temporary placeholder for the Privacy Policy that will govern how STUDIO.V collects, uses, discloses, and manages user data. The final version should be drafted or reviewed by a qualified legal professional.
          </p>
          
          <p>
            When drafting your Privacy Policy, consider including information about:
          </p>
          
          <ul className="list-disc pl-6 space-y-2">
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
        
        <div className="mt-12 pt-8 border-t border-[#E5E2DD]">
          <Link 
            href="/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-[#1A1A1A] underline underline-offset-4 hover:text-[#4A4742] transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    </main>
  );
}