import React from "react";
import Hero from "@/components/Hero";
import BentoFeatures from "@/components/BentoFeatures";
import LandingPageClient from "@/components/LandingPageClient";
import CategoryStrip from "@/components/landing/CategoryStrip";
import HowItWorks from "@/components/landing/HowItWorks";
import ArtistFinishBand from "@/components/landing/ArtistFinishBand";
import CTABand from "@/components/landing/CTABand";
import LandingFooter from "@/components/landing/LandingFooter";
import ProblemSolution from "@/components/landing/ProblemSolution";
import TaglineReveal from "@/components/landing/TaglineReveal";
import ProductProofRail from "@/components/landing/ProductProofRail";
import Benefits from "@/components/landing/Benefits";
import PilotOfferBand from "@/components/landing/PilotOfferBand";
import FAQ from "@/components/landing/FAQ";

const FAQ_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How fast will my model really be live?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Hours, not weeks. Send photos and dimensions, and your artist-finished model is typically embedded and live the same day.",
      },
    },
    {
      "@type": "Question",
      name: "What photos do you need from me?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Standard product photography plus width, height and depth. Phone photos work — no studio rig, no 3D files, and no 3D staff on your side.",
      },
    },
    {
      "@type": "Question",
      name: "Will it work on my storefront?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes if your storefront accepts an iframe — that covers Shopify, WooCommerce, Webflow and custom stacks.",
      },
    },
    {
      "@type": "Question",
      name: "How does the AR view-in-room work?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Every model ships as GLB plus USDZ. On iOS shoppers launch Quick Look; on Android they use WebXR or Scene Viewer — true 1:1 scale, no app to install.",
      },
    },
    {
      "@type": "Question",
      name: "What if I don't like the model?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You request revisions with a note, and our artists rework it until you approve. Nothing goes live until you publish it.",
      },
    },
    {
      "@type": "Question",
      name: "Who owns the finished 3D model?",
      acceptedAnswer: { "@type": "Answer", text: "You do. Once your project is published, the GLB and USDZ are yours to keep." },
    },
    {
      "@type": "Question",
      name: "What does the free pilot include?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Your first product modeled free: artist-finished GLB plus USDZ, a live 3D embed for your storefront, and AR view-in-room.",
      },
    },
  ],
};

export default function LandingPage() {
  return (
    <div
      className="min-h-screen flex flex-col font-sans antialiased"
      style={{ backgroundColor: "var(--canvas)", color: "var(--text-primary)" }}
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_SCHEMA) }} />
      <Hero />
      <CategoryStrip />
      <ProblemSolution />
      <ProductProofRail />
      <TaglineReveal />
      <Benefits />
      <HowItWorks />
      <LandingPageClient />
      <PilotOfferBand />
      <ArtistFinishBand />
      <BentoFeatures />
      <FAQ />
      <CTABand />
      <LandingFooter />
    </div>
  );
}
