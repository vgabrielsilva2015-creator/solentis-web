# IMPLEMENTATION-T06 — Sessão revogável

**Branch:** `fix/t06-session-revalidation` (sobre `fix/t05-tenant-ownership`)
**Commit:** `3fe43d9` — `fix(auth): revoke stale sessions`

## Objetivo
Uma mudança de acesso (desativar, trocar papel, resetar ou trocar senha, desativar planta) precisa derrubar as sessões já abertas. O timeout por perfil precisa funcionar.

## Problema original
- O JWT guardava papel, planta e "precisa trocar senha" no login e nunca reconsultava o banco.
- Como a renovação é deslizante, a sessão em uso nunca expirava. Um operador desativado, ou um técnico rebaixado, continuava entrando até ficar 60 min parado.
- `token.exp = agora + 30 min` para operador não tinha efeito, porque o Auth.js reescreve `exp` a cada renovação. Na prática, todos os perfis tinham 60 min de inatividade.

## Causa raiz
RC-3: a sessão é só um token assinado, sem nenhum ponto de revogação no servidor.

## Alterações realizadas
- **`users.session_version`** (inteiro, padrão 0): SQL aditivo em `prisma/sql/add_user_session_version.sql`, seguindo o processo atual do projeto. A coluna também foi adicionada ao `schema.prisma`, e a T-09 vai absorvê-la no baseline.
- **Incremento da versão (`BUMP_SESSION_VERSION`)** em todos os pontos que mudam acesso:
  - desativar/reativar usuário (gestor e super admin);
  - trocar papel ou e-mail;
  - reset de senha pelo gestor e pelo super admin;
  - redefinição pelo link do e-mail;
  - troca da própria senha. Nesse caso as outras sessões caem e a atual é reemitida pelo `signIn` que já existia.
- **`src/lib/session-guard.ts`**, aplicado no callback `jwt` (em todo request, pelo proxy, e em todo `auth()`):
  - Inatividade por perfil: operador 30 min, demais 60 min.
  - Idade máxima de 12 h desde o login, mesmo com uso contínuo.
  - A cada 60 s, confere no banco: o usuário existe e está ativo, a planta está ativa (o SUPER_ADMIN é exceção), papel e planta iguais aos do token, e a mesma `session_version`. Se algo divergir, o callback devolve `null` e o Auth.js apaga o cookie.
  - Se o banco falhar, a sessão é mantida e a checagem é refeita na próxima requisição (fail-open). É a mesma decisão já registrada para o rate limit do login. Os limites de inatividade e de idade continuam valendo sem banco.
- **`src/lib/session-version.ts`**: consulta do estado de acesso (por id do JWT assinado, marcada `@tenant-safe`) e o fragmento `BUMP_SESSION_VERSION`.
- **Documentação:** `CLAUDE.md` e o comentário do logger diziam que o proxy roda em Edge. No Next 16 ele roda em Node, o que confirmei no build (`functions-config-manifest.json` → `runtime: nodejs`). Por isso o proxy pode consultar o banco.

## Arquivos modificados
`prisma/schema.prisma`, `prisma/sql/add_user_session_version.sql` (novo), `src/lib/auth.config.ts`, `src/lib/auth.ts`, `src/lib/session-guard.ts` (novo), `src/lib/session-version.ts` (novo), `src/lib/logger.ts` (comentário), `CLAUDE.md`, `src/app/(auth)/actions.ts`, `src/app/(auth)/trocar-senha/actions.ts`, `src/app/admin/plantas/actions.ts`, `src/app/gestor/(sistema)/usuarios/actions.ts`, `src/lib/__tests__/session-guard.test.ts` (novo).

## Testes criados
`session-guard.test.ts` (21 casos):
- Intervalo de revalidação.
- Token legado.
- Inatividade de operador e gestor, e renovação deslizante.
- Idade absoluta.
- 7 motivos de revogação.
- SUPER_ADMIN com planta inativa.
- `must_change_password` atualizado.
- Fail-open, e inatividade valendo mesmo com o banco fora.
- O callback `jwt` real: login e revogação.
- Teste estático que exige `BUMP_SESSION_VERSION` em toda escrita de `password_hash`, `is_active`, `role` ou `email` em `users`.

Contraprova: no código anterior, o teste estático aponta os 7 pontos sem incremento, e os testes do callback falham.

## Testes executados
| Verificação | Resultado |
|---|---|
| `vitest` | 240/240 (17 arquivos) |
| `tsc --noEmit` | 0 erros |
| `eslint` (projeto) | 196 / 102, sem mudança |
| Build (harness) | ok |
| Smoke E2E (4 perfis, 47 telas) | 4/4 |
| SQL aditivo | aplicado 2× no banco local, idempotente |

**Runtime** (7 sessões reais abertas; as ações foram feitas pela interface por outros usuários):

| Cenário | Antes da T-06, após 62 s | Depois da T-06, após 62 s |
|---|---|---|
| Operador desativado pelo gestor | sessão ativa | **deslogada** |
| Técnico com papel trocado | ativa | **deslogada** |
| Manutenção com senha resetada | ativa | **deslogada** |
| Gestor troca a senha na sessão 1 → sessão 2 | ativa | **deslogada** |
| … sessão 1 (onde trocou) | ativa | ativa (correto) |
| Operador da planta B após desativar a planta | ativa | **deslogada** |
| Super admin (controle) | ativa | ativa |
| Operador ocioso 31 min (token re-assinado) | ativa | **deslogada** |
| Gestor ocioso 31 min | ativa | ativa (correto) |
| Sessão com 13 h de idade | ativa | **deslogada** |
| Token sem versão (pré-T-06) | ativa | **deslogada** (pede login 1×) |

Os cenários de inatividade e de idade usam tokens re-assinados com o segredo **local** do harness. O controle "token re-assinado sem mudança" continua ativo, o que mostra que o efeito vem da regra e não da forja. Todos os dados alterados foram restaurados no banco local ao final.

## Resultado
Desativar, trocar papel, resetar ou trocar senha e desativar planta agora derrubam as sessões abertas em até 60 s. O timeout por perfil funciona. Uma sessão roubada deixa de durar para sempre.

## Riscos
- **Ordem de deploy obrigatória:** rodar `prisma/sql/add_user_session_version.sql` em produção **antes** de publicar o código. Sem a coluna, o login falha.
- No primeiro acesso depois do deploy, todos os usuários terão que entrar de novo uma vez (token legado).
- Janela de até 60 s entre a mudança e a queda da sessão.
- Uma consulta extra ao banco por sessão ativa a cada 60 s, pela PK. Com 100 usuários ativos, dá menos de 2 consultas por segundo.
- O logout continua não revogando o token copiado de outro dispositivo. Fazer isso derrubaria também as outras sessões do mesmo usuário. Fica como decisão de produto.

## Rollback
`git revert 3fe43d9`. A coluna pode ficar no banco, porque o código antigo a ignora. Para removê-la: `ALTER TABLE "users" DROP COLUMN IF EXISTS "session_version";`.

## Pendências
1. Rodar o SQL em produção antes do deploy (entra no checklist da T-09).
2. Revogação no logout: decisão de produto.
