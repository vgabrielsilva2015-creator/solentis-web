# IMPLEMENTATION-T03 — Erros internos no login

**Branch:** `fix/t03-login-errors` (sobre `fix/t02-next-security`)
**Commit:** `f438919` — `fix(auth): never expose internal errors on login`

## Objetivo
Garantir que nenhuma falha de login mostre Prisma, host, porta, stack ou qualquer detalhe interno, e criar o ponto central de tratamento de mensagens de erro.

## Problema original
P-13 (Passada 1): com o banco fora do ar, a tela de login exibia `Invalid prisma.user.findUnique() invocation: connect ECONNREFUSED 127.0.0.1:5433`. Em produção, isso apareceria com o host e a porta do pooler do Supabase. `loginAction` devolvia `err.cause?.err?.message` cru para qualquer `CallbackRouteError`.

## Causa raiz
RC-9: não existia política de erro. Cada action decidia o que mostrar, e o padrão era repassar `e.message`.

## Alterações realizadas
- **`src/lib/user-errors.ts` (novo)** — política única:
  - `UserFacingError`: o único tipo de erro cuja mensagem pode ir para a tela.
  - `toUserMessage(err, fallback)`: mensagem segura para qualquer erro.
  - `LOGIN_MESSAGES` e `loginErrorMessage(type, causeCode)`: só "credenciais inválidas" e "rate limit" têm mensagem própria; todo o resto vira "Não foi possível entrar agora. Tente novamente em instantes."
- **`login/actions.ts`**: usa `loginErrorMessage`. Falhas inesperadas vão para o log com `requestId`. O `NEXT_REDIRECT` de sucesso continua sendo propagado.
- **`auth.ts` (authorize)**: a busca do usuário fica dentro de `try/catch`; o erro do banco é logado e convertido no código neutro `AUTH_UNAVAILABLE`. O código `RATE_LIMITED` passou a vir da constante central.

A aplicação de `toUserMessage` nas outras actions (uploads, `editarUsuario`, etc.) fica para a **T-21**, que cobre mensagens técnicas no restante do sistema. Esta tarefa ficou restrita ao login, como pede o roadmap.

## Arquivos modificados
`src/lib/user-errors.ts` (novo), `src/app/(auth)/login/actions.ts`, `src/lib/auth.ts`, `src/lib/__tests__/login-errors.test.ts` (novo).

## Testes criados
`login-errors.test.ts` (11 casos):
- Funções puras: credenciais, rate limit, causas desconhecidas e `toUserMessage`.
- **`loginAction` real** com `signIn` simulado: banco fora (mensagem do Prisma com host e porta do Supabase) → genérica, conferindo 6 padrões de vazamento; erro de configuração do Auth.js; senha errada; rate limit; entrada inválida; e propagação do redirect de sucesso.

Contraprova: rodando os mesmos testes no código anterior, **2 falham** (banco fora e erro de configuração).

## Testes executados
| Verificação | Resultado |
|---|---|
| `vitest` | 199/199 (15 arquivos) |
| `tsc --noEmit` | 0 erros |
| `eslint` (projeto) | 196 erros / 102 avisos (sem mudança; nos arquivos alterados, 0 erros) |
| Build (harness) | ok |
| **Runtime, banco parado** | tela: "Não foi possível entrar agora. Tente novamente em instantes."; nenhum vestígio de prisma, porta ou ECONNREFUSED na resposta; detalhe registrado no log do servidor (`Falha ao consultar usuário no login`) |
| Smoke E2E (4 perfis) | 4/4 |

## Resultado
O usuário nunca mais vê detalhe interno no login, e o suporte continua tendo o detalhe no log, correlacionado por `requestId`.

## Riscos
Baixo. A única mudança de comportamento visível é que erros inesperados agora mostram uma mensagem genérica em vez do texto cru.

## Rollback
`git revert f438919`.

## Pendências
Aplicar `toUserMessage` nas demais actions (T-21).
