import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "猫猫冲表情站",
  description: "一个轻量、可复制、可下载的中文表情包图库",
  applicationName: "猫猫冲表情站",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.png",
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

const R2_PUBLIC_HOST = process.env.NEXT_PUBLIC_R2_HOST ?? "s3.yokina.moe";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const acceptLanguage = (await headers()).get("accept-language");
  const lang = acceptLanguage?.split(/[,;]/)[0] || "zh-CN";

  return (
    <html lang={lang} suppressHydrationWarning>
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
        <Providers lang={lang}>
          <div className="relative z-10 flex min-h-dvh flex-col">
            <SiteHeader />
            <main className="app-shell flex-1">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
