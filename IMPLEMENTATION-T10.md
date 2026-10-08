# IMPLEMENTATION-T10 — Limite de tentativas sem lockout destrutivo

**Branch:** `fix/t10-rate-limiting` (sobre `fix/t09-migrations-baseline`)
**Commit:** `4d2cf78` — `fix(auth): rate limit login and password reset without destructive lockout`

## Objetivo
Limitar tentativas de login por IP e por e-mail, com atraso progressivo e sem um bloqueio que um terceiro consiga provocar na conta de outra pessoa. Limitar também os pedidos de redefinição de senha por e-mail e por IP, com resposta sempre igual.

## Problema original
- 5 falhas em 15 min **para um e-mail**, vindas de qualquer lugar, bloqueavam a conta. Qualquer pessoa trancava um operador só errando a senha com o e-mail dele. Testado: o dono, de outro IP e com a senha certa, ficava bloqueado.
- E-mail inexistente não contava, então era possível varrer e-mails sem nenhum limite.
- Pedido de reset sem limite: 20 pedidos seguidos foram aceitos na Passada 1. Além disso, o tempo de resposta mudava conforme o e-mail existia ou não.

## Causa raiz
O limite usava `login_attempts`, que exige `tenant_id`. Só dava para contar depois de achar o usuário, e só por e-mail.

## Alterações realizadas
- **Tabela `auth_rate_events`**, criada pela migration aditiva `20261007010000_auth_rate_events`, já no processo da T-09. Não tem tenant, porque a checagem acontece antes de resolver a planta. Guarda IP e **hash** do e-mail, e as linhas com mais de 24 h são apagadas aos poucos.
- **`src/lib/rate-limit.ts`**: política pura (`decideLogin`, `resetAllowed`) e persistência.

| Regra | Limite | Efeito |
|---|---|---|
| IP | 30 falhas / 15 min | bloqueia aquele IP |
| e-mail + IP | 5 falhas / 15 min | bloqueia aquele par |
| e-mail (vários IPs) | a partir de 5 falhas | **só atraso**: 1 s, 2 s, 4 s, até 8 s. O dono nunca é bloqueado. |
| reset por e-mail | 3 / h | o excedente é ignorado em silêncio |
| reset por IP | 10 / h | o excedente é ignorado em silêncio |

- **Login (`authorize`)**: o limite é checado antes de qualquer consulta, do mesmo jeito para e-mail existente ou não. Toda falha conta: senha errada, e-mail inexistente, conta ou planta inativa. O `login_attempts` passou a gravar o IP. Se o banco falhar no limitador, o login segue sem limite (fail-open), a mesma decisão já documentada para o login.
- **Reset**: a resposta é sempre `{ success: true }`. A busca do usuário, a criação do token e o envio do e-mail rodam em `after()`, depois da resposta, então o tempo não denuncia se o e-mail existe. Conta desativada não recebe link.
- Saiu o código antigo sem uso (`isRateLimited`, `RATE_LIMIT_*`). O cenário 3 do `auth.test.ts` foi atualizado porque a regra de negócio mudou de verdade: o bloqueio agora é por e-mail+IP.

## Arquivos modificados
`src/lib/rate-limit.ts` (novo), `src/lib/auth.ts`, `src/lib/auth-utils.ts`, `src/app/(auth)/actions.ts`, `prisma/schema.prisma`, `prisma/migrations/20261007010000_auth_rate_events/migration.sql` (novo), `src/lib/__tests__/rate-limit.test.ts` (novo), `src/lib/__tests__/auth.test.ts`.

## Testes
`rate-limit.test.ts` (10 casos):
- bloqueio por par e por IP;
- **ausência de lockout com 500 falhas no e-mail**;
- curva do atraso;
- limites de reset;
- extração de IP (cabeçalho da Vercel, lista, ausente, valor absurdo);
- e-mail nunca em texto nos buckets.

**Runtime** (harness, mesmo roteiro antes e depois):

| Cenário | Antes (T-09) | Depois (T-10) |
|---|---|---|
| Atacante erra 6× a senha do operador; o **dono**, de outro IP, com a senha certa | **bloqueado** | **entra** (1,4 s) |
| Senha certa vinda do IP do atacante | bloqueado | bloqueado |
| IP tenta 30 e-mails inexistentes e depois faz login válido | entra (sem limite) | **bloqueado** |
| Mesmo usuário, de outro IP | entra | entra |
| Ataque distribuído (7 IPs) no e-mail do gestor; o dono entra | **bloqueado** | entra, com espera de 4,5 s |
| 6 pedidos de reset para o mesmo e-mail | 6 processados | **3** |
| 12 pedidos de reset do mesmo IP | 0 ignorados | 2 ignorados (limite 10) |
| E-mail em texto na tabela de contadores | — | 0 |

| Verificação | Resultado |
|---|---|
| `vitest` | 258/258 (20 arquivos) |
| `tsc --noEmit` | 0 erros |
| `eslint` | 196 / 101 (um aviso a menos) |
| Smoke E2E (4 perfis) | 4/4 |

## Resultado
Um terceiro não consegue mais trancar a conta de ninguém. Quem varre e-mails é barrado pelo IP, e o reset deixou de ser um canal de spam e de enumeração.

## Riscos
- **O limite por IP só é confiável atrás da Vercel**, que reescreve o `x-forwarded-for`. Fora dela o cabeçalho pode ser forjado.
- Uma planta inteira atrás de um único IP (NAT) com 30 senhas erradas em 15 min bloqueia a rede da planta por até 15 min. O limite foi escolhido alto por isso.
- Um ataque distribuído com muitos IPs contra um e-mail não é bloqueado, só atrasado. É uma troca deliberada para não existir lockout.
- O atraso de até 8 s ocupa tempo de função na Vercel.

## Rollback
`git revert 4d2cf78`. A tabela `auth_rate_events` pode ficar no banco sem efeito.

## Pendências
- Produção: aplicar a migration pelo processo da T-09 (`migrate deploy`), **depois** do baselining.
