# IMPLEMENTATION-T12 — Service worker sem cache de conteúdo autenticado

**Branch:** `fix/t12-sw-cache` (sobre `fix/t11-password-change`)
**Commit:** `86099e8` — `fix(pwa): never cache authenticated content and clear device data on logout`

## Objetivo
O service worker não pode guardar nenhuma tela autenticada nem dado de usuário. O logout limpa o aparelho.

## Problema original
- O `defaultCache` do Serwist guardava o **payload RSC** das telas autenticadas nos caches `pages-rsc` e `pages-rsc-prefetch` (prefetch) e o resto em `others`.
- O filtro existente só pegava navegação (`mode: navigate`), não as requisições RSC da navegação client-side, e esquecia `/manutencao`.
- Num tablet compartilhado, o operador seguinte (ou qualquer um, offline) recebia dados do anterior.
- O logout não limpava cache nem rascunhos de formulário.

## Causa raiz
Uso do cache padrão do Serwist, que foi pensado para sites públicos, num app autenticado.

## Alterações realizadas
- **`src/lib/sw-cache-policy.ts` (novo, puro):** a regra é uma lista do que pode ser guardado.
  - **Podem ir para o cache:** arquivos de build (`/_next/static`) e estáticos do `/public` da própria origem.
  - **Vão sempre para a rede:** páginas, RSC (navegação e prefetch), `/api`, `/_next/image`, qualquer URL com query string e qualquer outra origem (Blob incluído).
- **`src/app/sw.ts`:**
  - estratégia própria: build com `CacheFirst`, estáticos com `StaleWhileRevalidate` e expiração, todo o resto `NetworkOnly`;
  - na ativação, **apaga os caches das versões antigas** que podiam ter dados de usuário. Isso limpa os aparelhos que já estão em campo.
- **Logout:** o `SignOutButton` agora limpa o Cache Storage e os 5 rascunhos de formulário **antes** de encerrar a sessão. A fila offline antiga (T-01/T-15) e a preferência de tema são mantidas.

## Arquivos modificados
`src/lib/sw-cache-policy.ts` (novo), `src/lib/client-cleanup.ts` (novo), `src/app/sw.ts`, `src/components/sign-out-button.tsx`, `src/components/sign-out-action.ts` (import sem uso), `src/lib/__tests__/sw-cache-policy.test.ts` (novo), `tests/t12-sw-cache.spec.ts` (novo).

## Testes
- **Unitários (8):**
  - as telas de todos os perfis não são guardadas em nenhuma das formas (navegação, RSC, prefetch);
  - API, fotos e `_next/image` vão para a rede;
  - outra origem não é guardada;
  - build e `/public` são guardados;
  - query string não é guardada;
  - a lista de caches antigos está completa;
  - o logout apaga caches e rascunhos e mantém a fila e o tema;
  - o logout não quebra se o navegador negar acesso ao armazenamento.
- **E2E com o service worker real:** operador entra, navega por 4 telas pelo menu (gera RSC e prefetch), o teste lista o Cache Storage, depois clica em "Sair" e confere o aparelho.
  - **Antes (código da T-11):** falha com 15 ou mais entradas `pages-rsc*` com telas do operador (`/operador/estoque/.../saida`, `/operador/turnos`, `/operador/dashboard`…).
  - **Depois:** 0 entradas com dado de usuário, o cache de build funciona, e após o "Sair" os caches dinâmicos e o rascunho somem e a fila antiga continua.

| Verificação | Resultado |
|---|---|
| `vitest` | 274/274 (22 arquivos) |
| `tsc --noEmit` | 0 erros |
| `eslint` | 196 / 100 |
| E2E: smoke + T-01 + T-11 + T-12 | 10/10 |

**Correção de processo:** o primeiro commit desta tarefa foi feito com 1 teste vermelho. O guardião da T-01 acusou o nome da fila antiga escrito no código novo, que só a citava para dizer que não seria apagada. Tirei o nome do código do app, sem enfraquecer o guardião, e refiz o commit (`--amend`, nada tinha sido publicado). Daqui para frente o commit só roda se os testes passarem.

## Resultado
Nenhuma tela ou dado de usuário fica guardado no aparelho pelo PWA. Os aparelhos que já estão em campo são limpos na próxima atualização do SW, e o "Sair" deixa o tablet limpo para o próximo operador.

## Riscos
- Offline, as telas não abrem a partir do cache (já não deviam, pela regra). A fila offline segura volta na T-15.
- Uma página de "sem conexão" própria (offline fallback) não foi criada. Isso fica para a T-15/T-31.

## Rollback
`git revert 86099e8`.

## Pendências
Nenhuma específica.
