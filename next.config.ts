import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

type ServerActionsConfig = NonNullable<
  NonNullable<NextConfig["experimental"]>["serverActions"]
>;

const serverActionBodySizeLimit = (
  process.env.NEXT_SERVER_ACTION_BODY_SIZE_LIMIT ?? "100mb"
) as ServerActionsConfig["bodySizeLimit"];

const DEFAULT_R2_PUBLIC_HOST = "s3.yokina.moe";
const r2PublicHost = process.env.NEXT_PUBLIC_R2_HOST ?? DEFAULT_R2_PUBLIC_HOST;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: serverActionBodySizeLimit,
    },
    optimizePackageImports: ["@heroui/react"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: r2PublicHost,
      },
    ],
    minimumCacheTTL: 31536000,
    formats: ["image/webp"],
  },
  async headers() {
    return [
      {
        source: "/manifest.webmanifest",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
      {
        source: "/icon.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, immutable" },
        ],
      },
      {
        source: "/apple-icon.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, immutable" },
        ],
      },
      {
        source: "/miya_logo.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=2592000, immutable" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
