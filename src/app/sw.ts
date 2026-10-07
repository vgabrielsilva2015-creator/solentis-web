import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";
import { cacheStrategyFor, LEGACY_USER_DATA_CACHES } from "@/lib/sw-cache-policy";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

// O tsconfig não carrega a lib "webworker"; tipagem mínima do evento usado aqui.
type ActivateEvent = Event & { waitUntil(p: Promise<unknown>): void };
declare const self: WorkerGlobalScope & {
  addEventListener(type: "activate", listener: (event: ActivateEvent) => void): void;
};

// T-12: cache só do que é igual para todos (build e /public). Páginas, RSC, API,
// fotos e qualquer outra origem vão sempre para a rede — ver sw-cache-policy.ts.
const runtimeCaching: RuntimeCaching[] = [
  {
    matcher: ({ url, sameOrigin, request }) =>
      cacheStrategyFor({ url, sameOrigin, mode: request.mode, headers: request.headers }) === "immutable",
    handler: new CacheFirst({
      cacheName: "solentis-build",
      plugins: [new ExpirationPlugin({ maxEntries: 400, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
  {
    matcher: ({ url, sameOrigin, request }) =>
      cacheStrategyFor({ url, sameOrigin, mode: request.mode, headers: request.headers }) === "static",
    handler: new StaleWhileRevalidate({
      cacheName: "solentis-static",
      plugins: [new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 })],
    }),
  },
  { matcher: () => true, handler: new NetworkOnly() },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
});

// Apaga os caches das versões anteriores que podiam guardar dados de usuário.
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => LEGACY_USER_DATA_CACHES.includes(n)).map((n) => caches.delete(n))),
    ),
  );
});

serwist.addEventListeners();
