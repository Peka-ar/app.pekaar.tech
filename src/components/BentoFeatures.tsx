import React from 'react';
import { Smartphone, Code, ShieldCheck, Zap, Maximize } from '@/components/icons';

export default function BentoFeatures() {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-[10px] font-mono tracking-[0.25em] uppercase text-[#7A7670] font-bold mb-3">Enterprise Grade Infrastructure</h2>
          <h3 className="text-3xl sm:text-5xl font-light font-serif text-[#1A1A1A] mb-6" style={{ textWrap: 'balance' }}>
            Built for Scale, Designed for <span className="italic">Impact</span>
          </h3>
          <p className="text-[#4A4742] text-sm sm:text-base leading-relaxed" style={{ textWrap: 'balance' }}>
            We've engineered a seamless pipeline from raw 3D assets directly into your customers' physical spaces.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Large Feature 1 */}
          <div className="md:col-span-2 bg-[#F9F8F6] rounded-[2rem] p-8 sm:p-12 border border-[#E5E2DD] relative overflow-hidden group">
            <div className="relative z-10 max-w-sm">
              <div className="w-12 h-12 bg-white rounded-full border border-[#E5E2DD] flex items-center justify-center mb-6 shadow-sm">
                <Smartphone className="w-6 h-6 text-[#1A1A1A]" aria-hidden="true" />
              </div>
              <h4 className="text-xl sm:text-2xl font-serif text-[#1A1A1A] mb-3">Zero-Friction Visualization</h4>
              <p className="text-sm text-[#4A4742] leading-relaxed">
                Leveraging mobile iOS Quick-Look and Android WebXR natively. Your clients can visualize physical items in high quality without downloading bulky custom software.
              </p>
            </div>
            {/* Decorative background element */}
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gradient-to-tl from-[#E5E2DD]/50 to-transparent rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 ease-in-out" />
          </div>

          {/* Feature 2 */}
          <div className="bg-[#1A1A1A] rounded-[2rem] p-8 sm:p-12 border border-[#2A2825] relative overflow-hidden text-white group">
            <div className="relative z-10">
              <div className="w-12 h-12 bg-[#2A2825] rounded-full border border-white/10 flex items-center justify-center mb-6">
                <Maximize className="w-6 h-6 text-emerald-400" aria-hidden="true" />
              </div>
              <h4 className="text-xl sm:text-2xl font-serif mb-3">Calibrated Scale</h4>
              <p className="text-sm text-[#A19D98] leading-relaxed">
                Standardized USDZ and GLB assets map physical volumes precisely onto reality backgrounds at a true 1:1 scale.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-[2rem] p-8 sm:p-12 border border-[#E5E2DD] shadow-sm hover:shadow-md transition-shadow duration-300">
            <div className="w-12 h-12 bg-[#F9F8F6] rounded-full border border-[#E5E2DD] flex items-center justify-center mb-6">
              <Code className="w-6 h-6 text-[#1A1A1A]" aria-hidden="true" />
            </div>
            <h4 className="text-xl sm:text-2xl font-serif text-[#1A1A1A] mb-3">Adaptive Embeds</h4>
            <p className="text-sm text-[#4A4742] leading-relaxed">
              Compile clean, standard-compliant HTML payloads with integrated sandboxed iframe wrappers to look organic in any modern editorial shop design.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="md:col-span-2 bg-gradient-to-br from-[#EFEDEA] to-[#E5E2DD] rounded-[2rem] p-8 sm:p-12 border border-[#E5E2DD]/50 relative overflow-hidden group">
            <div className="relative z-10 max-w-sm">
              <div className="w-12 h-12 bg-white rounded-full border border-[#E5E2DD] flex items-center justify-center mb-6 shadow-sm">
                <Zap className="w-6 h-6 text-amber-500" aria-hidden="true" />
              </div>
              <h4 className="text-xl sm:text-2xl font-serif text-[#1A1A1A] mb-3">Global Edge CDN</h4>
              <p className="text-sm text-[#4A4742] leading-relaxed">
                3D models are heavy. We serve optimized GLB assets via a global edge network, ensuring sub-second load times worldwide for instant interactivity.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
