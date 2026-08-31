import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { TopNav } from "@/components/TopNav";
import { createNextServerHelpers } from "@appwrite.io/react/server/next";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "@/lib/appwrite-config";
const cormorant = localFont({
  src: [
    { path: "../assets/fonts/cormorant-300.woff2", weight: "300", style: "normal" },
    { path: "../assets/fonts/cormorant-400.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/cormorant-500.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/cormorant-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-serif-loaded",
  display: "swap",
  preload: true,
});

const inter = localFont({
  src: [
    { path: "../assets/fonts/inter-300.woff2", weight: "300", style: "normal" },
    { path: "../assets/fonts/inter-400.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/inter-500.woff2", weight: "500", style: "normal" },
    { path: "../assets/fonts/inter-600.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-sans-loaded",
  display: "swap",
  preload: true,
});

const jetbrains = localFont({
  src: [
    { path: "../assets/fonts/jetbrains-300.woff2", weight: "300", style: "normal" },
    { path: "../assets/fonts/jetbrains-400.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/jetbrains-500.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-mono-loaded",
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "STUDIO.V | Image-to-3D Pipeline",
  description: "Premium micro-SaaS for D2C brands. Convert standard product photography into interactive 3D assets.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const helpers = createNextServerHelpers({ endpoint: APPWRITE_ENDPOINT, projectId: APPWRITE_PROJECT_ID });
  const session = await helpers.readSessionCookie();

  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} ${jetbrains.variable} antialiased h-full`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://ajax.googleapis.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--color-canvas)] text-[var(--color-text-primary)] transition-colors duration-300" suppressHydrationWarning>
        <Providers session={session}>
          <TopNav />
          {children}
        </Providers>
      </body>
    </html>
  );
}
