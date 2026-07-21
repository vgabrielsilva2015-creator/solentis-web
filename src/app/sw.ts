import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig, RuntimeCaching } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;

// Rotas autenticadas (páginas server-rendered com dados do operador logado) e a
// API NUNCA vão para o cache. Em tablets de ETE compartilhados entre operadores,
// isso impede que o HTML renderizado do operador A seja servido offline ao
// operador B depois do logout. Só assets estáticos são cacheados (defaultCache).
const AUTH_PATH = /^\/(operador|tecnico|gestor|admin)(\/|$)/;

const noCacheAuthenticated: RuntimeCaching[] = [
  {
    matcher: ({ url, request }) =>
      request.mode === "navigate" && AUTH_PATH.test(url.pathname),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url }) => url.pathname.startsWith("/api/"),
    handler: new NetworkOnly(),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...noCacheAuthenticated, ...defaultCache],
});

serwist.addEventListeners();
