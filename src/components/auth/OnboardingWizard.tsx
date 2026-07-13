"use client";
import { useRouter } from "next/navigation";
import React, { useState } from 'react';
import { Camera, RefreshCw, Code2, ArrowRight, Building2 } from 'lucide-react';
import { completeOnboarding } from "@/app/actions/auth";


interface OnboardingWizardProps {
  onClose: () => void;
}

export default function OnboardingWizard({ onClose }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useRouter();

  const handleNext = async () => {
    setError(null);

    if (step === 1 && !companyName.trim()) {
      setError("Company name is required");
      return;
    }

    if (step < 3) {
      setStep(step + 1);
    } else {
      setLoading(true);
      try {
        await completeOnboarding({ companyName });
        onClose();
        navigate.push('/tasks');
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to complete onboarding");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-[#1A1A1A]/60 backdrop-blur-sm animate-in fade-in duration-300"
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        className="relative bg-white rounded-[2rem] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col animate-in zoom-in-95 fade-in duration-300"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wizard-title"
      >
        
        <div className="flex-1 p-8 sm:p-12 min-h-[400px] flex flex-col justify-center relative">
          
          {/* Progress Indicators */}
          <div className="absolute top-8 left-0 right-0 flex justify-center gap-2">
            {[1, 2, 3].map((idx) => (
              <div 
                key={idx}
                className={`h-1 rounded-full transition-all duration-300 ${
                  idx === step ? 'w-8 bg-[#1A1A1A]' : 'w-4 bg-[#E5E2DD]'
                }`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="animate-in slide-in-from-right-8 fade-in duration-500">
              <h2 id="wizard-title" className="text-4xl font-serif text-[#1A1A1A] mb-4" style={{ textWrap: 'balance' }}>
                Welcome to STUDIO.V.
              </h2>
              <p className="text-[#4A4742] text-base leading-relaxed max-w-sm mb-8">
                Let&apos;s digitize your catalog. Our platform converts standard product photography into interactive, web-ready 3D models.
              </p>
              <label htmlFor="companyName" className="block text-[11px] font-mono tracking-widest uppercase text-[#7A7670] font-bold mb-2">Company Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Building2 className="h-4 w-4 text-[#7A7670]" aria-hidden="true" />
                </div>
                <input
                  type="text"
                  id="companyName"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-[#E5E2DD] rounded-xl text-sm placeholder-[#A3A3A3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] bg-[#F9F8F6] hover:bg-[#EFEDEA] transition-colors"
                  placeholder="Acme Furniture Co."
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in slide-in-from-right-8 fade-in duration-500">
              <h2 id="wizard-title" className="text-3xl font-serif text-[#1A1A1A] mb-8 text-center">
                How It Works
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#F9F8F6] border border-[#E5E2DD] flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5 text-[#1A1A1A]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest font-mono mb-1">1. Snap Photos</h3>
                    <p className="text-sm text-[#4A4742]">Upload standard JPGs of your physical products from multiple angles.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#F9F8F6] border border-[#E5E2DD] flex items-center justify-center shrink-0">
                    <RefreshCw className="w-5 h-5 text-[#1A1A1A]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest font-mono mb-1">2. We Generate 3D</h3>
                    <p className="text-sm text-[#4A4742]">Our backend calibrates lighting, textures, and geometry into a GLB/USDZ asset.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#F9F8F6] border border-[#E5E2DD] flex items-center justify-center shrink-0">
                    <Code2 className="w-5 h-5 text-[#1A1A1A]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#1A1A1A] uppercase tracking-widest font-mono mb-1">3. Embed via SDK</h3>
                    <p className="text-sm text-[#4A4742]">Drop the generated snippet directly into your Shopify or custom storefront.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="text-center animate-in slide-in-from-right-8 fade-in duration-500">
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <div className="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
                  <ArrowRight className="w-5 h-5 text-white" />
                </div>
              </div>
              <h2 id="wizard-title" className="text-4xl font-serif text-[#1A1A1A] mb-4" style={{ textWrap: 'balance' }}>
                Ready when you are.
              </h2>
              <p className="text-[#4A4742] text-base leading-relaxed max-w-sm mx-auto">
                Start your first product generation to see the magic happen.
              </p>
            </div>
          )}

        </div>

        {error && (
          <div className="mx-6 mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-6 bg-[#F9F8F6] border-t border-[#E5E2DD] flex justify-between items-center">
          {step > 1 ? (
            <button 
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-[11px] font-mono tracking-widest uppercase font-bold text-[#7A7670] hover:text-[#1A1A1A] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A] rounded"
            >
              Previous
            </button>
          ) : (
            <div></div> // Spacer
          )}
          
          <button 
            onClick={handleNext}
            disabled={loading}
            className="px-6 py-3 bg-[#1A1A1A] hover:bg-[#2A2825] text-white rounded-full text-[11px] font-mono tracking-widest uppercase font-bold shadow-sm active:scale-95 transition-transform duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
          >
            {loading ? 'Saving...' : step === 3 ? 'Upload First Product' : 'Continue'}
          </button>
        </div>

      </div>
    </div>
  );
}
