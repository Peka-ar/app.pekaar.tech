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

export function formatCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

export function formatChange(current: number, previous: number | null): { change: string; trend: 'up' | 'down' } {
  if (previous === null) return { change: '--', trend: 'up' as const };
  if (previous === 0) {
    return { change: current === 0 ? '+0%' : '+100%', trend: 'up' as const };
  }

  const change = Math.round(((current - previous) / previous) * 100);
  return {
    change: `${change >= 0 ? '+' : ''}${change}%`,
    trend: change >= 0 ? 'up' as const : 'down' as const,
  };
}

export function subDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function startOfMonth(date: Date): Date {
  const result = new Date(date);
  result.setDate(1);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}
