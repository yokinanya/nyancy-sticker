/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
} from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const R2_HOST = "s3.yokina.moe";

const dynamicPaths: RuntimeCaching = {
  matcher: ({ url, sameOrigin }) =>
    sameOrigin &&
    (url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/admin") ||
      url.pathname.startsWith("/submit") ||
      url.pathname.startsWith("/login")),
  handler: new NetworkOnly(),
};

const r2Stickers: RuntimeCaching = {
  matcher: ({ url }) =>
    url.hostname === R2_HOST &&
    /\.(png|webp|jpe?g|gif|avif)$/i.test(url.pathname),
  handler: new CacheFirst({
    cacheName: "r2-stickers-v1",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 600,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
};

const nextImageCache: RuntimeCaching = {
  matcher: ({ url, sameOrigin }) =>
    sameOrigin && url.pathname.startsWith("/_next/image"),
  handler: new CacheFirst({
    cacheName: "next-image-v1",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 60 * 60 * 24 * 30,
        purgeOnQuotaError: true,
      }),
    ],
  }),
};

const runtimeCaching: RuntimeCaching[] = [
  dynamicPaths,
  r2Stickers,
  nextImageCache,
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();
