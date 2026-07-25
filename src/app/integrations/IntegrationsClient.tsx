"use client";

import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Copy } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface IntegrationProject {
  id: string;
  name: string;
  embedCode: string;
}

type IntegrationsClientProps = {
  projects: IntegrationProject[];
  storefrontPlatform: string | null;
};

type PlatformKey = "shopify" | "woocommerce" | "webflow" | "custom" | "other";

type LogoProps = { className?: string };

type PlatformDef = {
  key: PlatformKey;
  name: string;
  tagline: string;
  steps: string;
  Logo: (props: LogoProps) => ReactElement;
};

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function ShopifyLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M5 8h11l-1 11a1 1 0 0 1-1 .9H6.1a1 1 0 0 1-1-.9L5 8Z" />
      <path d="M8 8V6a3 3 0 0 1 6 0v2" />
    </svg>
  );
}

function WooCommerceLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H10l-4 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M8 12V9.5l1.6 2.5L11 9.5V12" />
      <path d="M14 12V9.5l1.6 2.5L17 9.5V12" />
    </svg>
  );
}

function WebflowLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M3 7l3 10 3-7 3 7 3-10" />
      <path d="M15 7l3 10 3-10" />
    </svg>
  );
}

function CustomLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <path d="M9 7l-4 5 4 5" />
      <path d="M15 7l4 5-4 5" />
      <path d="M14 5l-4 14" />
    </svg>
  );
}

function OtherLogo({ className }: LogoProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" {...stroke}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 3 2.5 15 0 18" />
      <path d="M12 3c-2.5 3-2.5 15 0 18" />
    </svg>
  );
}

const PLATFORMS: PlatformDef[] = [
  {
    key: "shopify",
    name: "Shopify",
    tagline: "Custom liquid block / product template",
    steps: "For Shopify, paste this iframe into a custom liquid block or product template section. It loads the published STUDIO.V viewer automatically.",
    Logo: ShopifyLogo,
  },
  {
    key: "woocommerce",
    name: "WooCommerce",
    tagline: "Product tab or shortcode",
    steps: "For WooCommerce, add a custom product tab via the woocommerce_product_tabs hook or paste the iframe into the long-description field with HTML enabled.",
    Logo: WooCommerceLogo,
  },
  {
    key: "webflow",
    name: "Webflow",
    tagline: "Custom embed component",
    steps: "For Webflow, drop the iframe into a custom embed component on your product page. Webflow renders it in-place with no extra setup.",
    Logo: WebflowLogo,
  },
  {
    key: "custom",
    name: "Custom",
    tagline: "Paste into your product detail page",
    steps: "For a custom storefront, paste this iframe into your product detail page where the 3D viewer should appear. Works with any HTML-rendering stack.",
    Logo: CustomLogo,
  },
  {
    key: "other",
    name: "Other",
    tagline: "Anywhere HTML is allowed",
    steps: "For any other storefront, paste the iframe wherever custom HTML is supported. If your storefront enforces a content security policy, allow frame-src against your STUDIO.V origin.",
    Logo: OtherLogo,
  },
];

const PLATFORM_BY_KEY: Record<PlatformKey, PlatformDef> = PLATFORMS.reduce(
  (acc, p) => {
    acc[p.key] = p;
    return acc;
  },
  {} as Record<PlatformKey, PlatformDef>,
);

function isPlatformKey(value: string): value is PlatformKey {
  return value in PLATFORM_BY_KEY;
}

export default function IntegrationsClient({ projects, storefrontPlatform }: IntegrationsClientProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [selectedPlatformKey, setSelectedPlatformKey] = useState<PlatformKey>("custom");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const embedCode = selectedProject?.embedCode ?? "Publish a project to generate an iframe embed code.";

  const normalizedPlatform = storefrontPlatform?.trim().toLowerCase() ?? "";
  const detectedPlatform: PlatformDef | null =
    normalizedPlatform && isPlatformKey(normalizedPlatform) ? PLATFORM_BY_KEY[normalizedPlatform] : null;
  const selectedPlatform: PlatformDef = PLATFORM_BY_KEY[selectedPlatformKey] ?? PLATFORM_BY_KEY.custom;
  const platformGuidance = selectedPlatform.steps;

  const handleCopy = (text: string, id: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <DashboardLayout title="Integration & SDK">
      <div className="space-y-8 animate-in fade-in duration-500">
        <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border-default)] shadow-sm overflow-hidden">
          <div className="px-8 py-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <span className="inline-block text-[10px] uppercase tracking-widest font-mono font-bold text-[var(--color-text-muted)] mb-3">
                Integration & SDK
              </span>
              <h1 className="text-3xl md:text-4xl font-serif italic text-[var(--color-text-primary)] leading-tight mb-3">
                Drop your 3D models anywhere.
              </h1>
              <p className="text-sm text-[var(--color-text-secondary)] max-w-md">
                {platformGuidance}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] px-4 py-5">
                <p className="text-[10px] uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">No API key</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">The iframe just works.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] px-4 py-5">
                <p className="text-[10px] uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">Zero setup</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Paste and ship.</p>
              </div>
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] px-4 py-5">
                <p className="text-[10px] uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">Any storefront</p>
                <p className="text-[11px] text-[var(--color-text-muted)] mt-1">HTML, liquid, anywhere.</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border-default)] shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--color-border-default)] flex items-center justify-between gap-4">
              <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">Where it works</h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {PLATFORMS.map((platform) => {
                  const isDetected = detectedPlatform?.key === platform.key;
                  const isSelected = selectedPlatformKey === platform.key;
                  const Logo = platform.Logo;
                  return (
                    <button
                      key={platform.key}
                      type="button"
                      onClick={() => setSelectedPlatformKey(platform.key)}
                      aria-pressed={isSelected}
                      className={
                        "relative text-left rounded-2xl px-4 py-4 transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-text-primary)] " +
                        (isSelected
                          ? isDetected
                            ? "border-2 border-[var(--color-text-primary)] bg-[var(--color-canvas)]"
                            : "border-2 border-[var(--color-text-primary)] bg-[var(--color-surface)]"
                          : "border border-[var(--color-border-default)] bg-[var(--color-surface)] hover:border-[var(--color-text-primary)] hover:bg-[var(--color-canvas)]")
                      }
                    >
                      {isDetected ? (
                        <span className="absolute top-3 right-3 text-[9px] uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">
                          Detected
                        </span>
                      ) : null}
                      <div className="flex items-center gap-3">
                        <Logo className="w-6 h-6 text-[var(--color-text-primary)]" />
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{platform.name}</p>
                      </div>
                      <p className="text-xs text-[var(--color-text-muted)] mt-2 leading-relaxed">{platform.tagline}</p>
                    </button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-[var(--color-text-muted)]">
                    How to embed
                  </span>
                  <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">
                    {selectedPlatform.name}
                  </span>
                </div>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {selectedPlatform.steps}
                </p>
                {!detectedPlatform ? (
                  <p className="text-xs text-[var(--color-text-muted)] leading-relaxed pt-1">
                    Set your storefront platform during onboarding to mark one as your actual stack.
                  </p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-canvas)] p-4">
                <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Requirements</h3>
                <p className="text-sm text-[var(--color-text-muted)]">Only published projects can be embedded. Drafts and in-review assets stay private.</p>
              </div>
            </div>
          </section>

          <section className="bg-[var(--color-surface)] rounded-3xl border border-[var(--color-border-default)] shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--color-border-default)]">
              <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-[var(--color-text-primary)]">What you&apos;ll see</h2>
            </div>
            <div className="p-6">
              {selectedProject ? (
                <div className="rounded-2xl overflow-hidden border border-[var(--color-border-default)] bg-[var(--color-canvas)]">
                  <iframe
                    src={selectedProject.embedCode.match(/src="([^"]+)"/)?.[1] ?? ""}
                    title={`${selectedProject.name} preview`}
                    className="w-full h-[420px] block"
                    style={{ border: 0 }}
                    allow="accelerometer; autoplay; encrypted-media; gyroscope; xr-spatial-tracking"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-[var(--color-border-default)] bg-[var(--color-canvas)] p-8 text-center">
                  <p className="text-sm text-[var(--color-text-muted)]">Publish a project to preview it here.</p>
                </div>
              )}
            </div>
          </section>
        </div>

        <section className="bg-[var(--color-text-primary)] text-[var(--color-canvas)] rounded-3xl p-6 md:p-8 relative shadow-md">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-3xl" />
          <div className="relative z-10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <span className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)]">Embed code</span>
                <h2 className="text-2xl md:text-3xl font-serif italic mt-2">Copy and paste.</h2>
              </div>
              <div ref={dropdownRef} className="md:min-w-[18rem] md:w-72">
                <label className="block text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)] mb-2">Select Product</label>
                <div className="relative">
                  <button
                    onClick={() => projects.length > 0 && setIsDropdownOpen(!isDropdownOpen)}
                    className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/20 text-[var(--color-canvas)] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[var(--color-canvas)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-canvas)] disabled:cursor-not-allowed disabled:opacity-60"
                    aria-haspopup="listbox"
                    aria-expanded={isDropdownOpen}
                    disabled={projects.length === 0}
                  >
                    <span>{selectedProject?.name ?? "No published projects"}</span>
                    <ChevronDown className={`w-4 h-4 text-[var(--color-text-muted)] transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#2A2A2A] border border-white/10 rounded-xl overflow-hidden z-20 shadow-xl animate-in fade-in slide-in-from-top-2">
                      {projects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => {
                            setSelectedProjectId(project.id);
                            setIsDropdownOpen(false);
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-[var(--color-canvas)] hover:bg-white/10 hover:text-[var(--color-canvas)] transition-colors"
                          role="option"
                          aria-selected={selectedProject?.id === project.id}
                        >
                          {project.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-[#111111] rounded-xl border border-white/10 p-4">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] uppercase tracking-widest font-mono text-[var(--color-text-muted)]">Generated Iframe</span>
                <button
                  onClick={() => selectedProject && handleCopy(embedCode, "snippet-gen")}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-canvas)] transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-canvas)]"
                  aria-label="Copy generated iframe"
                  disabled={!selectedProject}
                >
                  {copied === "snippet-gen" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <pre className="text-xs font-mono text-[var(--color-canvas)] overflow-x-auto whitespace-pre-wrap hide-scrollbar">{embedCode}</pre>
            </div>

            <button
              onClick={() => selectedProject && handleCopy(embedCode, "snippet-gen-btn")}
              className="w-full py-3 bg-[var(--color-surface)] text-[var(--color-text-primary)] rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-[var(--color-canvas-secondary)] active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-canvas)] flex items-center justify-center gap-2"
              disabled={!selectedProject}
            >
              {copied === "snippet-gen-btn" ? <><CheckCircle2 className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy to Clipboard</>}
            </button>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
