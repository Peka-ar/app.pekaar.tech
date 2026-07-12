import Script from "next/script";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EmbedViewer from "@/components/EmbedViewer";
import type { AssetUrls, SdkConfig } from "@/lib/utils";

function isAssetUrls(value: unknown): value is AssetUrls {
  return Boolean(value && typeof value === "object" && "glb" in value && typeof (value as { glb?: unknown }).glb === "string");
}

function parseSdkConfig(value: unknown): SdkConfig {
  if (!value || typeof value !== "object") return {};

  const config = value as Record<string, unknown>;
  return {
    scale: Array.isArray(config.scale) && config.scale.length === 3 && config.scale.every((item) => typeof item === "number")
      ? config.scale as [number, number, number]
      : undefined,
    autoRotate: typeof config.autoRotate === "boolean" ? config.autoRotate : undefined,
    shadow: typeof config.shadow === "number" ? config.shadow : undefined,
    backgroundColor: typeof config.backgroundColor === "string" ? config.backgroundColor : undefined,
    cameraOrbit: typeof config.cameraOrbit === "string" ? config.cameraOrbit : undefined,
  };
}

export default async function EmbedPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      assetUrls: true,
      sdkConfig: true,
      status: true,
      name: true,
    },
  });

  if (!project) notFound();

  if (project.status !== "PUBLISHED") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F9F8F6] p-6 text-[#1A1A1A]">
        <div className="max-w-sm rounded-3xl border border-[#E5E2DD] bg-white p-6 text-center shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#7A7670]">STUDIO.V</p>
          <h1 className="mt-3 text-xl font-semibold">Embed unavailable</h1>
          <p className="mt-2 text-sm text-[#7A7670]">This 3D model has not been published yet.</p>
        </div>
      </main>
    );
  }

  if (!isAssetUrls(project.assetUrls)) notFound();

  const sdkConfig = parseSdkConfig(project.sdkConfig);
  const backgroundColor = sdkConfig.backgroundColor ?? "#F9F8F6";

  return (
    <main className="relative min-h-screen overflow-hidden" style={{ backgroundColor }}>
      <Script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js" />
      <div className="h-screen min-h-[360px] w-full">
        <EmbedViewer projectId={projectId} name={project.name} assetUrls={project.assetUrls} sdkConfig={sdkConfig} />
      </div>
      <a
        href="https://studiov.io"
        target="_blank"
        rel="noreferrer"
        className="absolute bottom-3 right-3 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-[#1A1A1A] shadow-sm backdrop-blur"
      >
        STUDIO.V
      </a>
    </main>
  );
}
