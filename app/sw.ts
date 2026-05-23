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
const DEPRECATED_CACHES = ["r2-stickers-v1", "next-image-v1"] as const;

const dynamicPaths: RuntimeCaching = {
  matcher: ({ url, sameOrigin }) =>
    sameOrigin &&
    (url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/admin") ||
      url.pathname.startsWith("/submit") ||
      url.pathname.startsWith("/login")),
  handler: new NetworkOnly(),
};

const r2Previews: RuntimeCaching = {
  matcher: ({ url }) =>
    url.hostname === R2_HOST &&
    url.pathname.startsWith("/previews/") &&
    /\.(webp|gif)$/i.test(url.pathname),
  handler: new CacheFirst({
    cacheName: "r2-previews-v1",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 300,
        maxAgeSeconds: 60 * 60 * 24 * 14,
        purgeOnQuotaError: true,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  }),
};

const r2Originals: RuntimeCaching = {
  matcher: ({ url }) =>
    url.hostname === R2_HOST &&
    !url.pathname.startsWith("/previews/") &&
    /\.(png|webp|jpe?g|gif|avif)$/i.test(url.pathname),
  handler: new NetworkOnly(),
};

const runtimeCaching: RuntimeCaching[] = [
  dynamicPaths,
  r2Previews,
  r2Originals,
  ...defaultCache,
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all(DEPRECATED_CACHES.map((cacheName) => caches.delete(cacheName))));
});

serwist.addEventListeners();
