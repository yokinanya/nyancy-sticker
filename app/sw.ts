/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const dynamicPaths: RuntimeCaching = {
  matcher: ({ url, sameOrigin }) =>
    sameOrigin &&
    (url.pathname.startsWith("/api/") ||
      url.pathname.startsWith("/admin") ||
      url.pathname.startsWith("/submit") ||
      url.pathname.startsWith("/login")),
  handler: new NetworkOnly(),
};

const runtimeCaching: RuntimeCaching[] = [dynamicPaths, ...defaultCache];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

serwist.addEventListeners();
