# Regressão — Fase 1 (T-09 a T-14): segurança, auth e banco

Rodada em 07/10/2026 sobre `fix/t14-rls` (`4c2a99d`), com T-01 a T-14 empilhadas.

**Ambiente:** banco `rls_stage`, criado **só pelas migrations**, com RLS ligado e o app conectando como dono **não superusuário** (`app_owner`), como acontece no Supabase.

| Verificação | Resultado |
|---|---|
| `vitest` | 277/277 (24 arquivos). Antes da Fase 1 eram 244. |
| `tsc --noEmit` | 0 erros |
| `eslint` | 196 erros / 100 avisos (no início eram 196/102) |
| Build (Next 16.4.0) | ok |
| E2E: smoke 4 perfis, T-01, T-11, T-12 | todos passando |
| T-05: 11 vetores cross-tenant | 0 vazamentos |
| T-06: revogação de sessão | 5/5 mudanças de acesso derrubam a sessão em até 62 s; inatividade, idade máxima e token legado ok |
| T-10: limite de tentativas | o dono não é trancado pelo atacante; IP varredor bloqueado; atraso progressivo; reset limitado |
| T-13: concorrência no estoque | 10 saídas simultâneas → 3 aceitas, saldo 1 (3 rodadas) |
| T-14: RLS | `anon` sem acesso; dono com acesso normal |

## Ajuste em script de teste
O roteiro de execução da T-06 chamava a troca de senha **sem** a senha atual. A T-11 tornou a senha atual obrigatória (mudança legítima de comportamento), então o roteiro foi atualizado para enviá-la. Na primeira rodada ele quebrou no meio e deixou usuários alterados no banco de staging. Restaurei o banco e rodei de novo, e ficou tudo verde. Nenhum teste foi enfraquecido.

## Ordem de aplicação em produção (resumo)
1. `prisma/sql/add_user_session_version.sql` (T-06), **antes** de publicar o código.
2. Baselining (`docs/MIGRATIONS.md` §4): dump → staging → `compare-schema` → `migrate resolve --applied` das 2 migrations do baseline.
3. `npx prisma migrate deploy`: aplica `auth_rate_events` (T-10) e `rls_deny_all` (T-14).
4. Publicar o código.
