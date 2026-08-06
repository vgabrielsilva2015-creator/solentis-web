import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
});

// Headers de segurança aplicados a todas as respostas (defesa em profundidade).
// A CSP começa em Report-Only para não quebrar o Recharts / styles inline / o
// ThemeScript (todos exigem 'unsafe-inline' em style-src) — depois de observar
// os relatórios sem violações reais, promover para `Content-Security-Policy`.
const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(), microphone=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  {
    key: 'Content-Security-Policy-Report-Only',
    value: [
      "default-src 'self'",
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; '),
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '6mb',
    },
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  async redirects() {
    return [
      {
        source: '/:role/ocorrencias/nova',
        destination: '/:role/ocorrencias/novo',
        permanent: true,
      },
      {
        source: '/gestor/manutencao/preventivas/nova',
        destination: '/gestor/manutencao/preventivas/novo',
        permanent: true,
      },
      {
        source: '/gestor/manutencao/corretivas/nova',
        destination: '/gestor/manutencao/corretivas/novo',
        permanent: true,
      },
      {
        source: '/admin/plantas/nova',
        destination: '/admin/plantas/novo',
        permanent: true,
      },
      {
        source: '/operador/leituras/nova',
        destination: '/operador/leituras/novo',
        permanent: true,
      },
      {
        source: '/tecnico/analises/nova',
        destination: '/tecnico/analises/novo',
        permanent: true,
      },
      {
        source: '/gestor/turnos/templates/:id',
        destination: '/gestor/turnos/:id/tarefas-padrao',
        permanent: true,
      },
    ];
  },
};

export default withSerwist(nextConfig);
