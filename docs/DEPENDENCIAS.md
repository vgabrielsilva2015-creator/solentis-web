# Dependências — Solentis

Documento de referência das bibliotecas críticas, suas versões e as **regras de atualização**. Mantido junto com o `package.json`. Última auditoria: **2026-07-01**.

## 🔒 Pins invioláveis (NÃO atualizar sem plano de migração)

| Lib | Versão fixa | Por quê |
|---|---|---|
| `prisma` / `@prisma/client` | **5.22.0** | A v6/v7 muda a geração do client e exige migração de banco. Ver regra 3.1 do handoff. O Dependabot está configurado para **ignorar** o major. |
| `next-auth` | **5.0.0-beta.31** | Uso deliberado da linha **v5** (beta). O "latest" reportado pelo npm (4.24.x) é a linha **antiga** — não é upgrade. |

> ⚠️ Migrations: o histórico de migrations do repo é incompleto. **Nunca** rodar `prisma migrate dev` (resetaria). Schema é aplicado por SQL aditivo (`prisma db execute`) ou `db push`.

## Bibliotecas core (revisar major manualmente)

| Lib | Versão | Notas |
|---|---|---|
| `next` | 16.2.10 | App Router + RSC. Build com `--webpack`. Patches são seguros; majors, revisão manual. |
| `react` / `react-dom` | 19.2.7 | Pinados em versão exata. |
| `typescript` | ^5 | Modo estrito. v6 disponível — segurar até revisar. |
| `zod` | ^4 | API v4 (usar `error:` em vez de `required_error`). |
| `tailwindcss` | ^4 | Config no CSS (sem `tailwind.config.ts`). |
| `eslint` | ^9 | v10 disponível — segurar. |

## Infra / runtime crítico

| Lib | Papel |
|---|---|
| `@vercel/blob` | Armazenamento de uploads (fotos). Requer `BLOB_READ_WRITE_TOKEN`. |
| `resend` | E-mail transacional (reset/convite). Major v6 disponível — segurar. |
| `web-push` | Push notifications (VAPID). Licença **MPL-2.0** (copyleft fraco; ok sem modificar os fontes). |
| `pino` | Logs estruturados (observabilidade). Ver seção do logger no CLAUDE.md. |
| `@google/generative-ai` | Extração de laudos por IA (Gemini). |
| `bcryptjs` | Hash de senha (SALT=12). |

## 🟡 Dívidas conhecidas

- **`string-similarity`** (^4.0.4) — **deprecada pelo autor**, mas em uso em `gestor/laudos/importar`. Substituir por `fastest-levenshtein` (mantida) num passo futuro.
- **`postcss` (via `next`)** — 2 vulns *moderate* (XSS no stringify) internas ao Next; o único "fix" do npm rebaixaria o Next para a v9 (inaceitável). Aguardar patch do próprio Next.

## Processo de atualização

- **CI gate:** `.github/workflows/ci.yml` roda `npm audit --omit=dev --audit-level=high` — bloqueia merge se houver vuln **HIGH em produção**. Vulns de tooling de dev (vite/jsdom) não bloqueiam.
- **Dependabot:** `.github/dependabot.yml` — PRs semanais (segunda), patches/minors **agrupados**, com Prisma/next-auth/majors de framework **ignorados**.
- **Antes de aceitar update:** `npx tsc --noEmit` + `npx vitest run` verdes; o preview da Vercel valida o build.

## Licenças

Auditoria (`license-checker --production`): **526 MIT + ISC/Apache/BSD** — todas permissivas. Nenhum bloqueador. Copyleft fraco presente (`web-push` MPL-2.0, `@img/sharp` LGPL-3.0) sem obrigação para SaaS que não modifica os fontes.
