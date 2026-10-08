# IMPLEMENTATION-T02 — Next.js e dependências vulneráveis

**Branch:** `fix/t02-next-security` (empilhada sobre `fix/t01-disable-offline-sync`)
**Commit:** `5d0038c` — `fix(deps): upgrade next to 16.4.0 and patch vulnerable transitives`

## Objetivo
Eliminar os advisories críticos/altos das dependências de produção e deixar o gate de segurança do CI (`npm audit --omit=dev --audit-level=high`) verde, sem quebrar o app.

## Problema original
`npm audit --omit=dev` em 07/10/2026: 1 crítico + 4 altos.
- `next` 16.2.12: GHSA-p293-qw3h-jr36 (RCE em servidor Windows), GHSA-2xp9-vwfh-vxw4 (RCE no Image Optimization com AVIF) e GHSA-vcvr-r3jv-pc5j (RCE em `next/og`).
- `sharp` 0.35.3: libheif e librsvg.
- `undici` 6.28.0 (via `@vercel/blob`), `brace-expansion` 5.0.9 e `source-map-js` 1.2.1: negação de serviço.

O step "Gate de segurança" do CI falhava.

## Causa raiz
Versões fixadas sem atualização desde julho e nenhum alerta automático tratado: os 12 PRs do Dependabot estão parados (RC-6/RC-7).

## Alterações realizadas
| Pacote | Antes | Depois |
|---|---|---|
| next | 16.2.12 | **16.4.0** (versão estável mais recente) |
| eslint-config-next | 16.2.10 | **16.4.0** |
| sharp (override) | ^0.35.0 → 0.35.3 | **^0.35.5** → 0.35.5 |
| undici (transitivo) | 6.28.0 | 6.29.0 |
| brace-expansion (transitivo) | 5.0.9 | 5.0.12 |
| source-map-js (transitivo) | 1.2.1 | 1.2.2 |

O lockfile mudou em 44 entradas, todas do Next, do sharp e de binários de plataforma. Nenhuma outra dependência foi alterada.

Também foi adicionado `tests/smoke.spec.ts`, um smoke E2E: cada perfil faz login e abre todas as suas telas estáticas.

## Arquivos modificados
`package.json`, `package-lock.json`, `tests/smoke.spec.ts` (novo).

## Testes criados
`tests/smoke.spec.ts`: 4 perfis, 47 telas.

## Testes executados
| Verificação | Resultado |
|---|---|
| `npm audit --omit=dev --audit-level=high` | **0 vulnerabilidades** (antes: 1 crítico + 4 altos) |
| `tsc --noEmit` | 0 erros |
| `vitest run --no-cache` | 188/188 |
| `eslint` (sem artefatos de build) | 196 erros / 102 avisos (antes: 196 / 101). O aviso novo é uma regra nova do eslint-config-next 16.4 (`no-location-assign-relative-destination` em `src/app/error.tsx`). O `window.location.href = '/'` no error boundary é intencional (recarga completa para sair de um estado quebrado); comportamento mantido. |
| `next build` | ok (90 s) |
| Smoke E2E (4 perfis, 47 telas) | **4/4** |
| E2E T-01 | **5/5** |

## Resultado
Gate de segurança verde, Next sem advisories conhecidos, app funcionando nos 4 perfis.

## Riscos
- Mudança de minor do Next (16.2 → 16.4): o smoke cobre as telas estáticas, mas não todas as interações. Vale um clique manual no preview da Vercel antes do merge.
- **Advisories que ficaram, só em ferramentas de desenvolvimento** (não vão para produção):
  - `shadcn` CLI (puxa `@modelcontextprotocol/sdk`, `hono`, `proxy-addr` crítico, `fast-glob`, `micromatch`): não dá para remover, porque o `globals.css` importa `shadcn/tailwind.css`.
  - `vitest` 4 (moderado, a correção exige o major 5).
  - `@next/eslint-plugin-next`: o npm sugere "corrigir" voltando para a versão 14, o que é um falso positivo.
  - O `npm audit fix` sem `--force` quebrou com erro interno do npm (`edgesOut`); nada foi aplicado por ele.

## Rollback
`git revert 5d0038c` (volta `package.json`/lockfile) + `npm ci`. Na Vercel: promover o deploy anterior.

## Pendências
- Revisar e fechar ou mergear os 12 branches do Dependabot (T-29).
- Advisories de dev listados acima.
