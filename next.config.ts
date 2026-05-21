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

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: serverActionBodySizeLimit,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_R2_HOST || "cdn.example.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
    ],
  },
};

export default withSerwist(nextConfig);
