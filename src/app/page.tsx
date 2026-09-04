import React from "react";
import Hero from "@/components/Hero";
import BentoFeatures from "@/components/BentoFeatures";
import LandingPageClient from "@/components/LandingPageClient";
import CategoryStrip from "@/components/landing/CategoryStrip";
import HowItWorks from "@/components/landing/HowItWorks";
import ArtistFinishBand from "@/components/landing/ArtistFinishBand";
import CTABand from "@/components/landing/CTABand";
import LandingFooter from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col font-sans antialiased"
      style={{ backgroundColor: "var(--canvas)", color: "var(--text-primary)" }}
    >
      <Hero />
      <CategoryStrip />
      <HowItWorks />
      <LandingPageClient />
      <ArtistFinishBand />
      <BentoFeatures />
      <CTABand />
      <LandingFooter />
    </div>
  );
}
