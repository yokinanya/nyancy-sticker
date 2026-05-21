import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Providers } from "./providers";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "nyancy 表情包图库",
  description: "一个轻量、可复制、可下载的中文表情包图库",
  applicationName: "nyancy sticker",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "nyancy",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const acceptLanguage = (await headers()).get("accept-language");
  const lang = acceptLanguage?.split(/[,;]/)[0] || "zh-CN";

  return (
    <html lang={lang} suppressHydrationWarning>
      <body>
        <Providers lang={lang}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
