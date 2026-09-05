import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { TopNav } from "@/components/TopNav";
import { createNextServerHelpers } from "@appwrite.io/react/server/next";
import { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID } from "@/lib/appwrite-config";

const figtree = localFont({
  src: [
    { path: "../assets/fonts/figtree-400.woff2", weight: "400", style: "normal" },
    { path: "../assets/fonts/figtree-900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-display-loaded",
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

const instrumentSerif = localFont({
  src: [{ path: "../assets/fonts/instrument-serif-400-italic.woff2", weight: "400", style: "italic" }],
  variable: "--font-quote-loaded",
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://pekaar.tech"),
  title: "Peka AR — Product photos to interactive 3D",
  description:
    "Peka AR turns product photography into artist-finished, web-optimized 3D assets — live on your storefront in hours, with one-line embed and AR view-in-room.",
  openGraph: {
    title: "Peka AR — Product photos to interactive 3D",
    description:
      "Peka AR turns product photography into artist-finished, web-optimized 3D assets — live on your storefront in hours, with one-line embed and AR view-in-room.",
  },
  twitter: {
    card: "summary",
    title: "Peka AR — Product photos to interactive 3D",
    description:
      "Peka AR turns product photography into artist-finished, web-optimized 3D assets — live on your storefront in hours, with one-line embed and AR view-in-room.",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const helpers = createNextServerHelpers({ endpoint: APPWRITE_ENDPOINT, projectId: APPWRITE_PROJECT_ID });
  const session = await helpers.readSessionCookie();

  return (
    <html lang="en" className={`${figtree.variable} ${inter.variable} ${instrumentSerif.variable} antialiased h-full`} suppressHydrationWarning>
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
