# IMPLEMENTATION-T09 — Baseline de migrations

**Branch:** `fix/t09-migrations-baseline` (sobre `fix/t08-secrets`)
**Commit:** `c6cc903` — `fix(db): establish migration baseline`

## Objetivo
Poder recriar o banco só a partir do repositório (staging, CI, restore) e ter um caminho seguro para a produção passar a usar `migrate deploy`, sem resetar nada.

## Problema original
- Só 4 migrations para 40 tabelas. O resto do schema veio de `db push` e SQL avulso: `shift_task_templates` e 7 colunas não estavam em nenhuma migration.
- O próprio `CLAUDE.md` mandava não usar `migrate dev` porque "resetaria".
- Era impossível montar staging ou CI com o mesmo banco da produção.

## Causa raiz
RC-5: o schema era gerenciado por `db push`/SQL avulso, fora do controle de migrations.

## Alterações realizadas
- As 4 migrations antigas foram para `prisma/migrations-legacy/`. São histórico e nada foi apagado.
- **`20261007000000_baseline`:** schema inteiro gerado do `schema.prisma`, com 40 tabelas e a coluna `users.session_version` da T-06.
  - Gerado com o motor de schema WASM. O binário do Prisma 5 é bloqueado no sandbox.
  - A tabela m-n implícita foi ajustada ao formato do Prisma 5 (índice `AB_unique`, não a PK do Prisma 6+).
- **`20261007000100_partial_unique_indexes`:** os 2 índices únicos parciais de turno (nenhum turno duplicado ativo, um turno ativo por operador), que só existiam em `prisma/sql`.
- **`scripts/db/compare-schema.sh`:** compara a estrutura de dois bancos (`pg_dump --schema-only`, somente leitura) e normaliza a ordem das colunas.
- **`migrations-schema.test.ts`:** falha se:
  - alguma tabela ou coluna do schema não aparecer em nenhuma migration;
  - uma migration tiver `DROP TABLE/COLUMN` ou `TRUNCATE` sem o marcador de revisão;
  - houver `;` em comentário. O executor WASM quebrou um script por causa disso durante o trabalho.
- **`docs/MIGRATIONS.md`:**
  - baselining da produção na sequência pedida (produção → dump → staging → validar diff → `migrate resolve --applied`);
  - diferenças esperadas, critério de parada, rollback e processo daqui para frente.
- `CLAUDE.md` e `RUNBOOK` passaram a refletir o processo novo.

## Arquivos modificados
`prisma/migrations/20261007000000_baseline/migration.sql` (novo), `prisma/migrations/20261007000100_partial_unique_indexes/migration.sql` (novo), `prisma/migrations-legacy/*` (movidos), `scripts/db/compare-schema.sh` (novo), `src/lib/__tests__/migrations-schema.test.ts` (novo), `docs/MIGRATIONS.md` (novo), `CLAUDE.md`, `docs/RUNBOOK.md`.

## Testes executados
| Verificação | Resultado |
|---|---|
| Banco vazio + só as migrations | 40 tabelas; seed do projeto roda sem erro |
| O harness passou a rodar sobre esse banco | smoke E2E 4/4, E2E T-01 5/5, runtime T-05 com 0 vazamentos nos 11 vetores, runtime T-06 com as 5 revogações funcionando |
| Índice parcial | segunda instância ativa do mesmo turno e dia é recusada (`uniq_shift_instance_ativa`) |
| `compare-schema.sh` | banco contra ele mesmo dá idêntico. Contra o banco antigo do harness, feito à mão, aponta as diferenças de nome de índice e de nulidade de array, o que mostra que o script enxerga diferenças reais. |
| `migrations-schema.test.ts` | 5/5. **Contraprova:** com as migrations antigas, falha apontando `shift_task_templates`, `users.receive_nc_push`, `readings.photo_filename`, `shift_tasks.template_id` etc. |
| `vitest` | 249/249 (19 arquivos) |
| `tsc --noEmit` | 0 erros |

## Resultado
O banco agora é reproduzível a partir do repositório, e isso foi comprovado com a aplicação rodando em cima dele. A produção tem um caminho para entrar no processo de migrations sem reset e sem tocar em dados.

## Riscos
- O baseline **não foi comparado com a produção real** (sem acesso). Esse é o passo 5 do `docs/MIGRATIONS.md` e precisa ser feito antes do `resolve`.
- O baseline foi gerado pelo motor do Prisma 7. Com o Prisma 5.22 do projeto, rode o `compare-schema` antes de marcar como aplicado.
- O `migrate resolve` não foi executado aqui, porque precisa do binário do Prisma.
- Os índices `idx_*` duplicados de `add_indexes.sql` podem existir em produção. É inofensivo e fica para a T-19.

## Rollback
`git revert c6cc903`. Em produção, se o baselining já tiver sido feito: veja "Rollback do baselining" no `docs/MIGRATIONS.md`. São só metadados.

## Pendências (dependem de você)
1. Seguir o `docs/MIGRATIONS.md` §4 com staging. Antes disso, aplicar o SQL da T-06.
