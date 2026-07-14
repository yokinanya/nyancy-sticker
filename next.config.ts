import type { NextConfig } from "next";
import withSerwistInit, { type PluginOptions } from "@serwist/next";
import { resolveR2PublicHost } from "./lib/r2-public-host";

const emptyPrecacheManifest: NonNullable<
  PluginOptions["manifestTransforms"]
>[number] = () => ({ manifest: [], warnings: [] });

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [],
  manifestTransforms: [emptyPrecacheManifest],
});

type ServerActionsConfig = NonNullable<
  NonNullable<NextConfig["experimental"]>["serverActions"]
>;

const serverActionBodySizeLimit = (
  process.env.NEXT_SERVER_ACTION_BODY_SIZE_LIMIT ?? "100mb"
) as ServerActionsConfig["bodySizeLimit"];

const r2PublicHost = resolveR2PublicHost(process.env.NEXT_PUBLIC_R2_HOST);

const nextConfig: NextConfig = {
  cacheComponents: true,
  reactStrictMode: true,
  compress: true,
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_R2_HOST: r2PublicHost,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: serverActionBodySizeLimit,
    },
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
        source: "/icons/favicon-64.png",
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
    ];
  },
};

export default withSerwist(nextConfig);
