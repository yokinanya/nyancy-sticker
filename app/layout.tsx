import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";
import { SiteWarningBanner } from "@/components/site-warning-banner";
import { resolveR2PublicHost } from "@/lib/r2-public-host";
import "./globals.css";

export const metadata: Metadata = {
  title: "猫猫冲表情站",
  description: "一个轻量、可复制、可下载的中文表情包图库",
  applicationName: "猫猫冲表情站",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icons/favicon-64.png",
    apple: "/apple-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "猫猫冲表情站",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#121212" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

const R2_PUBLIC_HOST = resolveR2PublicHost(process.env.NEXT_PUBLIC_R2_HOST);

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href={`https://${R2_PUBLIC_HOST}`}
          crossOrigin=""
        />
        <link rel="dns-prefetch" href={`https://${R2_PUBLIC_HOST}`} />
      </head>
      <body>
        <div id="web_bg" aria-hidden="true" />
        <Providers>
          <div className="relative z-10 flex min-h-dvh flex-col">
            <Suspense fallback={<HeaderFallback />}>
              <SiteHeader />
            </Suspense>
            <Suspense fallback={null}>
              <SiteWarningBanner />
            </Suspense>
            <main className="app-shell flex-1">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}

function HeaderFallback() {
  return (
    <header className="liquid-header sticky top-0 z-40 border-b border-border-subtle">
      <div className="mx-auto flex h-[57px] w-full max-w-7xl items-center justify-between px-4">
        <span className="font-semibold tracking-tight">猫猫冲表情站</span>
        <span className="h-8 w-16 animate-pulse rounded-lg bg-default-100" />
      </div>
    </header>
  );
}
