# MIGRATIONS — baseline e processo (T-09)

## 1. Situação até a T-09
- `prisma/migrations` tinha 4 migrations (jun/2026) para um banco de 40 tabelas.
- O resto do schema foi aplicado por `prisma db push` e por SQL avulso (`prisma/sql/*.sql`). Faltavam nas migrations, por exemplo, a tabela `shift_task_templates` e 7 colunas.
- Consequência: era impossível recriar o banco a partir do repositório (staging, CI, restore) e `prisma migrate dev` propunha resetar tudo.

## 2. O que mudou
| Antes | Depois |
|---|---|
| `prisma/migrations/2026062*` (4) | movidas para **`prisma/migrations-legacy/`** (só histórico, nada é apagado) |
| — | **`20261007000000_baseline`**: o schema inteiro, gerado do `schema.prisma` (inclui `users.session_version` da T-06) |
| `prisma/sql/add_unique_open_shift.sql` e `add_unique_turno_por_operador.sql` | **`20261007000100_partial_unique_indexes`**: os 2 índices únicos parciais que o Prisma 5 não expressa no schema |

Os outros scripts de `prisma/sql/` continuam onde estão, como registro:
- `add_task_templates`, `add_reading_photo` e `add_user_session_version` já estão dentro do baseline.
- `add_indexes.sql` cria 5 índices `idx_*`. Quatro deles duplicam índices que o schema já tem. A limpeza fica para a T-19.
- `enable_rls.sql` foi substituído pela migration `20261007020000_rls_deny_all` (T-14).

**Validado** num banco vazio, só com as migrations: 40 tabelas criadas, seed rodou, smoke E2E dos 4 perfis passou e os testes de execução da T-05 e da T-06 passaram. O app do harness passou a rodar sobre esse banco.

## 3. Banco NOVO (staging, CI, dev, restore em projeto limpo)
```bash
DATABASE_URL="$URL_DO_BANCO_NOVO" npx prisma migrate deploy
npx tsx prisma/seed.ts          # só se for banco de desenvolvimento
```

## 4. Banco EXISTENTE (produção): baselining sem tocar nos dados
**Nunca** rodar `migrate reset`, `db push` ou `migrate dev` contra produção. Nenhum passo abaixo altera tabela de negócio.

Sequência pedida: **produção → dump → staging → baseline → validar diff → migrate deploy**.

1. **Pré-requisito da T-06:** aplicar `prisma/sql/add_user_session_version.sql` em produção. É aditivo e idempotente.
2. **Dump** da produção (somente leitura): `pg_dump "$PROD_DIRECT_URL" -Fc --no-owner --no-privileges -f pre-baseline.dump`
3. **Staging A — cópia da produção:** restaurar o dump num projeto separado: `pg_restore --no-owner --no-privileges -d "$STAGING_A_URL" pre-baseline.dump`
4. **Staging B — banco só com migrations:** projeto ou banco vazio: `DATABASE_URL="$STAGING_B_URL" npx prisma migrate deploy`
5. **Validar o diff** de estrutura entre a produção (cópia) e as migrations:
   ```bash
   scripts/db/compare-schema.sh "$STAGING_A_URL" "$STAGING_B_URL"
   ```
   Diferenças **esperadas** e aceitáveis:
   - os índices `idx_*` de `prisma/sql/add_indexes.sql`, se tiverem sido aplicados (aparecem só em A, e a T-19 trata deles);
   - nomes de índices únicos criados por versões antigas do Prisma (`*_idx` × `*_key`), se existirem. Mesma regra, outro nome. Anote e trate na T-19.

   **Qualquer outra diferença** (coluna faltando, tipo diferente, FK diferente) **interrompe o processo**. Corrija com uma migration nova, nunca editando o baseline, e repita a partir do passo 4.
6. **Marcar o baseline como aplicado na cópia (staging A)** e conferir:
   ```bash
   # o histórico antigo é renomeado, nunca apagado
   psql "$STAGING_A_URL" -c 'ALTER TABLE IF EXISTS "_prisma_migrations" RENAME TO "_prisma_migrations_legacy"'
   DATABASE_URL="$STAGING_A_URL" npx prisma migrate resolve --applied 20261007000000_baseline
   DATABASE_URL="$STAGING_A_URL" npx prisma migrate resolve --applied 20261007000100_partial_unique_indexes
   DATABASE_URL="$STAGING_A_URL" npx prisma migrate status    # "Database schema is up to date"
   DATABASE_URL="$STAGING_A_URL" npx prisma migrate deploy    # "No pending migrations to apply"
   ```
7. Abrir um preview da Vercel apontando para o staging A e testar login, leituras e estoque.
8. **Só então repetir o passo 6 em produção** (com `$PROD_DIRECT_URL`). São 3 operações de metadado: renomear a tabela de histórico e registrar 2 migrations. Nenhum dado é tocado.

**Rollback do baselining:** em produção, `DROP TABLE "_prisma_migrations"` (a nova, só com 2 linhas de metadado) e `ALTER TABLE "_prisma_migrations_legacy" RENAME TO "_prisma_migrations"`. As tabelas de negócio não mudaram em nenhum passo.

### Migrations posteriores ao baseline
Depois do passo 8, `npx prisma migrate deploy` aplica as que vieram depois do baseline. Todas são aditivas ou idempotentes:
- `20261007010000_auth_rate_events` (T-10): tabela nova.
- `20261007020000_rls_deny_all` (T-14): liga o RLS em todas as tabelas e tira os privilégios de `anon`/`authenticated`. Se o RLS já estiver ligado, só reforça.

**Tabela nova daqui para frente:** a mesma migration precisa ter `ALTER TABLE "x" ENABLE ROW LEVEL SECURITY`. O teste `migrations-schema.test.ts` cobra isso.

## 5. Processo daqui para frente
1. Alterar o `schema.prisma`.
2. Gerar a migration **sem aplicar**, contra um banco local de desenvolvimento: `npx prisma migrate dev --create-only --name descricao-curta`
3. Revisar o SQL. Coluna nova obrigatória em tabela com dados precisa de default ou de backfill. Índice grande em produção vai com `CREATE INDEX CONCURRENTLY`, numa migration só com ele.
4. `npx prisma migrate dev`, só local.
5. Produção: dump (INFRA §3.1) e depois `npx prisma migrate deploy` com a `DIRECT_URL`.
6. **Nada de `db push` nem de SQL avulso em produção.** Se for inevitável, transforme em migration no mesmo dia.

O teste `src/lib/__tests__/migrations-schema.test.ts` falha se uma tabela ou coluna do schema não for criada por nenhuma migration, se uma migration tiver `DROP TABLE/COLUMN`/`TRUNCATE` sem o marcador `-- revisado: destrutivo`, ou se houver `;` em comentário.

## 6. Limitações desta validação
- O baseline foi gerado com o motor de schema do Prisma 7 (WASM), porque o binário do Prisma 5 não baixa no ambiente da auditoria. A única diferença de formato conhecida, a tabela m-n implícita (PK × índice único `AB_unique`), foi ajustada à mão para o formato do Prisma 5. Rode o passo 5 da seção 4 com o Prisma 5.22 do projeto antes do baselining em produção.
- A comparação contra a produção real **não foi feita** (sem acesso). Ela é o passo 5.
