import React from 'react';
import { Smartphone, Code, Zap, Maximize2 } from 'lucide-react';

export default function BentoFeatures() {
  return (
    <section className="py-24 bg-[var(--color-canvas)] border-b border-[var(--color-border-default)]" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-[10px] font-mono tracking-[0.25em] uppercase text-[var(--color-text-muted)] font-bold mb-3">Enterprise Grade Infrastructure</h2>
          <h3 className="text-3xl sm:text-5xl font-light font-serif text-[var(--color-text-primary)] mb-6" style={{ textWrap: 'balance' }}>
            Built for Scale, Designed for <span className="italic">Impact</span>
          </h3>
          <p className="text-[var(--color-text-secondary)] text-sm sm:text-base leading-relaxed" style={{ textWrap: 'balance' }}>
            We&apos;ve engineered a seamless pipeline from raw 3D assets directly into your customers&apos; physical spaces.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
           {/* Large Feature 1 */}
           <div className="md:col-span-2 bg-[var(--color-canvas-secondary)] rounded-[2rem] p-8 sm:p-12 border border-[var(--color-border-default)] relative overflow-hidden group">
             <div className="relative z-10 max-w-sm">
               <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] rounded-full flex items-center justify-center mb-6 shadow-sm">
                 <Smartphone className="w-6 h-6 text-white" aria-hidden="true" />
               </div>
               <h4 className="text-xl sm:text-2xl font-serif text-[var(--color-text-primary)] mb-3">Zero-Friction Visualization</h4>
               <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                 Leveraging mobile iOS Quick-Look and Android WebXR natively. Your clients can visualize physical items in high quality without downloading bulky custom software.
               </p>
             </div>
             {/* Decorative background element */}
             <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-gradient-to-tl from-[var(--accent-3)]/30 to-transparent opacity-60 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 ease-in-out" />
           </div>

           {/* Feature 2 */}
           <div className="bg-[#181715] rounded-[2rem] p-8 sm:p-12 border border-[#252320] relative overflow-hidden text-[#faf9f5] group">
             <div className="relative z-10">
               <div className="w-12 h-12 bg-[#252320] rounded-full border border-white/10 flex items-center justify-center mb-6">
                 <Maximize2 className="w-6 h-6 text-emerald-400" aria-hidden="true" />
               </div>
               <h4 className="text-xl sm:text-2xl font-serif mb-3">Calibrated Scale</h4>
               <p className="text-sm text-[#a09d96] leading-relaxed">
                 Standardized USDZ and GLB assets map physical volumes precisely onto reality backgrounds at a true 1:1 scale.
               </p>
             </div>
           </div>

           {/* Feature 3 */}
           <div className="bg-[var(--color-surface)] rounded-[2rem] p-8 sm:p-12 border border-[var(--color-border-default)] shadow-sm hover:shadow-md transition-shadow duration-300">
             <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent-2)] to-[var(--accent-3)] rounded-full flex items-center justify-center mb-6">
               <Code className="w-6 h-6 text-white" aria-hidden="true" />
             </div>
             <h4 className="text-xl sm:text-2xl font-serif text-[var(--color-text-primary)] mb-3">Adaptive Embeds</h4>
             <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
               Compile clean, standard-compliant HTML payloads with integrated sandboxed iframe wrappers to look organic in any modern editorial shop design.
             </p>
           </div>

           {/* Feature 4 */}
           <div className="md:col-span-2 bg-[var(--color-canvas-secondary)] rounded-[2rem] p-8 sm:p-12 border border-[var(--color-border-default)] relative overflow-hidden group">
             <div className="relative z-10 max-w-sm">
               <div className="w-12 h-12 bg-gradient-to-br from-[var(--accent-3)] to-[var(--accent-1)] rounded-full flex items-center justify-center mb-6 shadow-sm">
                 <Zap className="w-6 h-6 text-white" aria-hidden="true" />
               </div>
               <h4 className="text-xl sm:text-2xl font-serif text-[var(--color-text-primary)] mb-3">Global Edge CDN</h4>
               <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                 3D models are heavy. We serve optimized GLB assets via a global edge network, ensuring sub-second load times worldwide for instant interactivity.
               </p>
             </div>
           </div>

        </div>
      </div>
    </section>
  );
}
