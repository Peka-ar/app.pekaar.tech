export interface AssetUrls {
  glb: string;
  usdz?: string;
}

export interface SdkConfig {
  scale?: [number, number, number];
  autoRotate?: boolean;
  shadow?: number;
  backgroundColor?: string;
  cameraOrbit?: string;
}

export interface EmbedCodeResult {
  iframe: string;
}

export function generateEmbedCode(projectId: string): EmbedCodeResult {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  const embedUrl = `${appUrl.replace(/\/$/, "")}/embed/${projectId}`;
  const iframe = [
    `<iframe`,
    `  src="${embedUrl}"`,
    `  style="width: 100%; height: 500px; border: none; border-radius: 16px;"`,
    `  allow="accelerometer; autoplay; encrypted-media; gyroscope; xr-spatial-tracking"`,
    `  allowfullscreen`,
    `></iframe>`
  ].join("\n");

  return { iframe };
}
