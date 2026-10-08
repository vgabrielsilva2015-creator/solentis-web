# IMPLEMENTATION-T14 — RLS deny-all

**Branch:** `fix/t14-rls` (sobre `fix/t13-stock-race`)
**Commit:** `4c2a99d` — `fix(db): enable deny-all row level security on every table`

## Objetivo
Criar uma segunda barreira no banco: a API automática do Supabase (PostgREST, papéis `anon` e `authenticated`) não pode ler nem gravar nenhuma tabela, e o app precisa continuar funcionando normalmente.

## Problema original
- O isolamento era 100% feito na aplicação.
- O RLS existia só como SQL avulso (`prisma/sql/enable_rls.sql`), sem garantia de ter sido aplicado.
- Nada obrigava as tabelas novas a nascerem com RLS.

Uma sessão anterior relatou que a produção já tem RLS ligado. Isso não foi confirmado.

## Causa raiz
RC-2 e RC-5: o isolamento dependia de convenção, e o schema era gerenciado fora das migrations.

## Alterações realizadas
- **Migration `20261007020000_rls_deny_all`** (idempotente):
  - `ENABLE ROW LEVEL SECURITY` em todas as tabelas de `public`, **sem policies** (deny-all) e **sem FORCE**. O dono das tabelas, que é como o Prisma conecta, continua com acesso.
  - Revoga os privilégios atuais e padrão de `anon` e `authenticated`, se esses papéis existirem.
- **Guarda para o futuro:** `migrations-schema.test.ts` falha se uma tabela criada depois dessa migration não habilitar o próprio RLS.
- `prisma/sql/enable_rls.sql` ficou marcado como superado. `MIGRATIONS.md`, `CLAUDE.md` e o checklist foram atualizados.

## Arquivos modificados
`prisma/migrations/20261007020000_rls_deny_all/migration.sql` (novo), `src/lib/__tests__/migrations-schema.test.ts`, `prisma/sql/enable_rls.sql`, `docs/MIGRATIONS.md`, `CLAUDE.md`, `PRODUCTION-CHECKLIST.md`.

## Testes: staging que imita o Supabase
Montei o banco `rls_stage` só com as migrations, com dono **não superusuário** (`app_owner`, como o `postgres` do Supabase) e papéis `anon`/`authenticated` com os grants padrão da API.

| Verificação | Antes da migration | Depois |
|---|---|---|
| `anon` lê `users` | **4 linhas** | `permission denied` |
| `anon` com o GRANT devolvido (só o RLS segurando) | — | **0 linhas** |
| Dono (`app_owner`) lê `users` | 4 | 4 |
| Tabelas com RLS | 0/41 | 41/41 |
| Migration aplicada 2× | — | sem erro |

**O app inteiro rodando como `app_owner` sobre esse banco:**
- smoke E2E dos 4 perfis, E2E da T-11 e da T-12: 7/7;
- T-05: 11 vetores cross-tenant bloqueados e controles gravando;
- T-13: concorrência com `FOR UPDATE` funcionando (3 aceitas, saldo 1).

**Contraprova do guardião:** uma migration temporária criando a tabela `x_tmp` sem RLS faz o teste falhar.

| Verificação | Resultado |
|---|---|
| `vitest` | 277/277 |
| `tsc --noEmit` | 0 erros |

O harness passou a usar esse banco (`rls_stage`) daqui em diante, por ser o mais parecido com a produção.

## Resultado
Mesmo que a chave `anon` do Supabase vaze, nenhuma tabela é exposta pela API automática. O app não muda, e as tabelas novas são obrigadas a nascer com RLS.

## Riscos
- Se algum dia o app usar o `supabase-js` com a chave `anon`, vai precisar de policies explícitas. Hoje ele não usa.
- O RLS não protege contra bug dentro do app, porque o dono ignora o RLS. Essa proteção continua sendo da T-05 e do guardião.

## Rollback
Desligar o RLS: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` em um loop igual ao da migration. Em produção não é recomendado. Para o código: `git revert 4c2a99d`.

## Pendências
Em produção a migration é aplicada por `migrate deploy` depois do baselining (T-09).
