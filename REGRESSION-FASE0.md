# Regressão — Fase 0 (T-01 a T-08)

Rodada em 07/10/2026 sobre `fix/t08-secrets` (`843c858`), que contém T-01 a T-08 empilhadas.

| Verificação | Resultado |
|---|---|
| `vitest` | 244/244 (18 arquivos). Antes da Fase 0 eram 162. |
| `tsc --noEmit` | 0 erros |
| `eslint` | 196 erros / 102 avisos, iguais ao baseline depois da T-02. Nenhum erro novo em linha alterada. |
| `npm audit --omit=dev` | 0 vulnerabilidades (desde a T-02) |
| Build (harness, Next 16.4.0) | ok |
| Smoke E2E: 4 perfis × 47 telas | 4/4 |
| E2E T-01 (leitura sem conexão) | 5/5 |
| Runtime T-05 (11 vetores cross-tenant) | 0 vazamentos; controles com ids da própria planta gravam normalmente |
| Runtime T-06 (revogação de sessão) | 5 de 5 mudanças de acesso derrubam a sessão em até 62 s; a sessão onde a senha foi trocada continua; inatividade e idade máxima funcionam |

## O que a Fase 0 **não** resolveu (depende de acesso que eu não tenho)
- Estado real da produção: os 33 itens do `PRODUCTION-CHECKLIST.md` estão ❓.
- Rotação dos segredos (`docs/SECRETS.md` §3).
- Planos Vercel/Supabase, PITR e teste de restore real (`docs/INFRA.md`).
- **Ordem de deploy:** rodar `prisma/sql/add_user_session_version.sql` **antes** de publicar o código da T-06.

## Testes E2E antigos
`a2`, `a4` e `rbac` continuam falhando da mesma forma que antes da Fase 0: eles esperam, por exemplo, `/operador/dashboard` depois do login, e hoje o destino é `/operador/turnos`. `a1` e `a3` dependem do engine nativo do Prisma, que está bloqueado no sandbox. Eles serão corrigidos na T-29 (pipeline de CI), onde o comportamento esperado de cada um será revisado.
