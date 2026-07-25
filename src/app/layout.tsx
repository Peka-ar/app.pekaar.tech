import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { TopNav } from "@/components/TopNav";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${inter.variable} ${jetbrains.variable} antialiased h-full`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.jsdelivr.net" />
        <link rel="preconnect" href="https://ajax.googleapis.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[var(--color-canvas)] text-[var(--color-text-primary)] transition-colors duration-300" suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          <TopNav />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
