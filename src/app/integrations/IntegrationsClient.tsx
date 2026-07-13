"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronDown, Copy, Key } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

interface IntegrationProject {
  id: string;
  name: string;
  embedCode: string;
}

type IntegrationsClientProps = {
  apiKey: string;
  projects: IntegrationProject[];
  storefrontPlatform: string | null;
};

export default function IntegrationsClient({ apiKey, projects, storefrontPlatform }: IntegrationsClientProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const embedCode = selectedProject?.embedCode ?? "Publish a project to generate an iframe embed code.";
  const normalizedPlatform = storefrontPlatform?.trim().toLowerCase();
  const platformGuidance =
    normalizedPlatform === "shopify"
      ? "For Shopify, paste this iframe into a custom liquid block or product template section. It loads the published STUDIO.V viewer automatically."
      : normalizedPlatform === "custom"
        ? "For a custom storefront, paste this iframe into your product detail page where the 3D viewer should appear."
        : storefrontPlatform
          ? `For ${storefrontPlatform}, paste this iframe into the product page area that supports custom HTML or embeds.`
          : "Paste this iframe into your product page. If your storefront supports custom HTML, no additional SDK setup is required.";

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
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-8">
            <section className="bg-white rounded-3xl border border-[#E5E2DD] shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#E5E2DD]">
                <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A]">Iframe Embed</h2>
              </div>
              <div className="p-6 space-y-4">
                <p className="text-sm text-[#4A4742]">
                  {platformGuidance}
                </p>
                <div className="rounded-2xl border border-[#E5E2DD] bg-[#F9F8F6] p-4">
                  <h3 className="text-sm font-medium text-[#1A1A1A] mb-2">Requirements</h3>
                  <p className="text-sm text-[#7A7670]">Only published projects can be embedded. Drafts and in-review assets stay private.</p>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl border border-[#E5E2DD] shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#E5E2DD]">
                <h2 className="text-sm uppercase tracking-widest font-mono font-bold text-[#1A1A1A]">API Security</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Key className="w-4 h-4 text-[#7A7670]" />
                  <h3 className="text-sm font-medium text-[#1A1A1A]">Public API Key</h3>
                </div>
                <p className="text-xs text-[#7A7670] mb-4">Retained for account reference. Iframe embeds do not require manual API key setup.</p>
                <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#E5E2DD] bg-[#F9F8F6]">
                  <span className="text-xs font-mono text-[#1A1A1A]">{apiKey}</span>
                  <button
                    onClick={() => handleCopy(apiKey, "key")}
                    className="text-[#7A7670] hover:text-[#1A1A1A] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A1A1A]"
                    aria-label="Copy API Key"
                  >
                    {copied === "key" ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className="xl:col-span-1">
            <div className="bg-[#1A1A1A] text-white rounded-3xl p-6 relative shadow-md sticky top-24">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-3xl" />
              <h2 className="text-xl font-serif italic mb-6">Embed Code</h2>
              <div className="space-y-6 relative z-10">
                <div ref={dropdownRef}>
                  <label className="block text-[10px] uppercase tracking-widest font-mono text-[#A3A3A3] mb-2">Select Product</label>
                  <div className="relative">
                    <button
                      onClick={() => projects.length > 0 && setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-60"
                      aria-haspopup="listbox"
                      aria-expanded={isDropdownOpen}
                      disabled={projects.length === 0}
                    >
                      <span>{selectedProject?.name ?? "No published projects"}</span>
                      <ChevronDown className={`w-4 h-4 text-[#A3A3A3] transition-transform duration-300 ${isDropdownOpen ? "rotate-180" : ""}`} />
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
                            className="w-full text-left px-4 py-3 text-sm text-[#E5E2DD] hover:bg-white/10 hover:text-white transition-colors"
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

                <div className="bg-[#111111] rounded-xl border border-white/10 p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-[#A3A3A3]">Generated Iframe</span>
                    <button
                      onClick={() => selectedProject && handleCopy(embedCode, "snippet-gen")}
                      className="text-[#A3A3A3] hover:text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                      aria-label="Copy generated iframe"
                      disabled={!selectedProject}
                    >
                      {copied === "snippet-gen" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <pre className="text-xs font-mono text-[#E5E2DD] overflow-x-auto whitespace-pre-wrap hide-scrollbar">{embedCode}</pre>
                </div>

                <button
                  onClick={() => selectedProject && handleCopy(embedCode, "snippet-gen-btn")}
                  className="w-full py-3 bg-white text-[#1A1A1A] rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-[#EFEDEA] active:scale-95 transition-all disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white flex items-center justify-center gap-2"
                  disabled={!selectedProject}
                >
                  {copied === "snippet-gen-btn" ? <><CheckCircle2 className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy to Clipboard</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
