"use client";

import React, { useState } from 'react';
import { PRODUCTS } from "@/lib/types";
import SignInForm from "@/components/auth/SignInForm";
import SignUpForm from "@/components/auth/SignUpForm";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";
import Image from "next/image";
import { Box, ArrowLeft } from 'lucide-react';
import { LinkButton } from "@/components/ui/LinkButton";

type AuthView = 'signin' | 'signup' | 'forgot-password';

export default function AuthClient() {
  const [view, setView] = useState<AuthView>('signin');

  const visualProduct = PRODUCTS[0];

  const handleSignUpSuccess = () => {
    setView('signin');
  };

  return (
    <div className="min-h-screen bg-[var(--color-canvas)] text-[var(--color-text-primary)] flex font-sans antialiased overflow-hidden">
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A1A1A] flex-col relative overflow-hidden">
        <Image
          src={visualProduct.thumbnail}
          alt=""
          fill
          className="object-cover opacity-50"
          sizes="50vw"
          priority
        />

        <div className="absolute inset-0 pointer-events-none z-10 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent opacity-80"></div>

        <div className="absolute top-8 left-8 z-20 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center">
            <Box className="w-4 h-4 text-white" aria-hidden="true" />
          </div>
          <span className="text-white text-lg font-light tracking-[0.25em] uppercase font-serif">STUDIO.V</span>
        </div>

        <div className="absolute bottom-12 left-12 z-20 max-w-md">
          <h2 className="text-3xl font-serif italic text-white mb-4" style={{ textWrap: 'balance' }}>
            Elevate your catalog with stereoscopic realism.
          </h2>
          <p className="text-[#A3A3A3] text-sm font-sans font-light leading-relaxed">
            Join industry leaders who are converting standard photography into interactive, web-ready 3D models. Prove ROI before writing a single line of code.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 xl:px-24 bg-[var(--color-surface)] relative">
        <LinkButton
          href="/"
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
          className="absolute top-8 left-6 sm:left-12 lg:hidden"
        >
          Back to Home
        </LinkButton>
        <LinkButton
          href="/"
          variant="ghost"
          size="sm"
          rightIcon={<ArrowLeft className="w-4 h-4 rotate-180" />}
          className="absolute top-8 right-6 sm:right-12 hidden lg:flex"
        >
          Back to Home
        </LinkButton>

        <div className="max-w-md w-full mx-auto">
          {view === 'signin' && <SignInForm onNavigate={(v) => setView(v as AuthView)} />}
          {view === 'signup' && <SignUpForm onNavigate={(v) => setView(v as AuthView)} onSuccess={handleSignUpSuccess} />}
          {view === 'forgot-password' && <ForgotPasswordForm onNavigate={(v) => setView(v as AuthView)} />}
        </div>
      </div>
    </div>
  );
}