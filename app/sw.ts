/// <reference lib="webworker" />
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NetworkOnly,
  Serwist,
} from "serwist";
import { resolveR2PublicHost } from "@/lib/r2-public-host";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const R2_HOST = resolveR2PublicHost(process.env.NEXT_PUBLIC_R2_HOST);
const PREVIEW_CACHE_NAME = "r2-previews-v2";
const SECONDS_PER_DAY = 60 * 60 * 24;
const PREVIEW_CACHE_MAX_ENTRIES = 80;
const PREVIEW_CACHE_MAX_AGE_DAYS = 3;
const PREVIEW_CACHE_MAX_AGE_SECONDS =
  SECONDS_PER_DAY * PREVIEW_CACHE_MAX_AGE_DAYS;
const DEPRECATED_CACHES = [
  "r2-stickers-v1",
  "r2-previews-v1",
  "next-image-v1",
  "next-image",
  "static-image-assets",
  "static-js-assets",
  "static-style-assets",
  "static-font-assets",
  "static-data-assets",
  "next-static-js-assets",
  "next-data",
  "apis",
  "pages",
  "pages-rsc",
  "pages-rsc-prefetch",
  "others",
  "cross-origin",
  "google-fonts-webfonts",
  "google-fonts-stylesheets",
] as const;

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
    cacheName: PREVIEW_CACHE_NAME,
    plugins: [
      new ExpirationPlugin({
        maxEntries: PREVIEW_CACHE_MAX_ENTRIES,
        maxAgeSeconds: PREVIEW_CACHE_MAX_AGE_SECONDS,
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
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

function cleanDeprecatedCaches() {
  return Promise.all(
    DEPRECATED_CACHES.map((cacheName) => caches.delete(cacheName)),
  );
}

self.addEventListener("activate", (event) => {
  event.waitUntil(cleanDeprecatedCaches());
});

serwist.addEventListeners();
