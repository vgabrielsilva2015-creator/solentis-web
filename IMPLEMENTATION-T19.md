# IMPLEMENTATION-T19 — Índices e constraints

**Branch:** `fix/t19-indexes-constraints` (sobre `fix/t18-flow-bugs`)
**Commits:**
- `0f7d1ee` — `perf(db): add measured indexes for dashboard, comments and maintenance history`
- `c90ed41` — `feat(db): domain CHECK constraints added NOT VALID with separate validation`

## Objetivo
Executar a seção 12 da Passada 2, na parte de índices e constraints. O critério de sucesso é que o `EXPLAIN` das consultas principais use os índices e que as constraints existam.

## Problema original
- **Colunas de domínio eram texto livre.** O banco aceitava qualquer valor em papel do usuário, status, severidade, prioridade, origem, frequência etc. Contraprova (`t19.sql`, cada gravação dentro de uma transação desfeita), **todas aceitas antes**:

| Gravação | Antes | Depois |
|---|---|---|
| ocorrência `status='FECHADA'` | aceita | **recusada** |
| usuário `role='ADMIN'` | aceita | **recusada** |
| passagem `status='X'` | aceita | **recusada** |
| cronograma `frequency='YEARLY'` | aceita | **recusada** |
| corretiva `status='HACK'` | aceita | **recusada** |
| saída de estoque `-5` | aceita | **recusada** |
| entrada de estoque `0` | aceita | **recusada** |
| contagem `-1` | aceita | **recusada** |
| controle: ocorrência com tipo vazio | aceita | aceita |
| controle: ocorrência `WAITING` (kanban) | aceita | aceita |

- **Consultas sem índice adequado:**
  - a tendência de parâmetro levava 79 ms;
  - "últimas leituras de ponto + parâmetro" ordenava 50 mil linhas;
  - comentários e histórico de manutenção liam a tabela inteira.

## Causa raiz
O schema veio do SQLite (sem enum e sem CHECK), e os índices foram criados conforme as telas surgiam, sem medição.

## Alterações realizadas
**Índices** (6 migrations, uma por índice, com `CREATE INDEX CONCURRENTLY IF NOT EXISTS`, todos declarados no `schema.prisma`):

| Índice | Consulta | Antes | Depois |
|---|---|---|---|
| `readings (tenant_id, parameter_id, created_at)` | tendência do parâmetro | 79 ms | 12 ms |
| `readings (tenant_id, collection_point_id, parameter_id, recorded_at)` | últimas leituras do ponto | 25,6 ms | 0,03 ms |
| `analyses (tenant_id, collection_point_id, collected_at)` | análises do ponto | 4,5 ms | 0,5 ms |
| `occurrence_comments (occurrence_id)` | comentários | 4,8 ms (tabela toda) | 0,02 ms |
| `maintenance_logs (equipment_id)` | histórico do equipamento | 4,6 ms (tabela toda) | 0,6 ms |
| `occurrences (collection_point_id)` | ocorrências do ponto | 3,9 ms | 2,6 ms |

Medição: banco `perf_stage`, criado só pelas migrations, com 1 M leituras, 200 k análises, 100 k ocorrências e 20 plantas. Tempos de banco com cache quente. Detalhes em `docs/DB-INDEXES.md`.

**Medido e deixado de fora:** `occurrences (tenant_id, status, created_at DESC)`, que estava no plano. Foi de 1,49 para 1,38 ms, e não compensa o custo a mais em cada gravação.

**Constraints**
- `20261007070000_domain_checks`: 21 regras de valores permitidos e 3 de quantidade de estoque, todas `NOT VALID`. Valem para toda linha nova ou alterada e não conferem as antigas, então a migration não falha por dado antigo.
- `20261007070100_domain_checks_validate`: `VALIDATE` das 24. A trava é leve, e leituras e gravações continuam.
- `scripts/ops/t19-preflight.sql`: só leitura. Lista cada valor fora das regras com a contagem. Precisa voltar vazio antes da migration de validação.
- As listas foram tiradas do código (tipos, Zod, telas). O caso mais importante: o kanban grava `WAITING` em ocorrências, mas o tipo `OccurrenceStatus` não tinha esse valor. Ele foi incluído no tipo e na regra.

**Documentação**
- `docs/MIGRATIONS.md`:
  - ordem e risco das migrations novas;
  - o que fazer se o `VALIDATE` falhar;
  - lista dos objetos que o Prisma não modela, para apagar `DROP` indevido do SQL gerado;
  - como acrescentar um valor novo numa coluna de domínio.
- `docs/DB-INDEXES.md`: medições e custo.
- `PRODUCTION-CHECKLIST.md`: itens 1.15 (preflight) e 1.16 (passagens `TIMED_OUT`, da T-18).

## Arquivos modificados
- `prisma/schema.prisma`, `src/types/index.ts`;
- 8 migrations novas (`20261007060000` a `060500`, `070000`, `070100`);
- `scripts/ops/t19-preflight.sql`;
- `docs/DB-INDEXES.md`, `docs/MIGRATIONS.md`, `PRODUCTION-CHECKLIST.md`;
- `src/lib/__tests__/db-constraints.test.ts`.

## Testes criados
`db-constraints.test.ts` (31 casos):
- **toda regra aceita todos os valores que o código grava.** As listas são lidas do código, e são 24 comparações;
- toda regra entra `NOT VALID`, tem `VALIDATE` e aparece no preflight, e o preflight só lê;
- todo índice criado a partir da T-19 está no `schema.prisma`, com exceção dos parciais listados, e tem nome de até 63 caracteres;
- migration com `CONCURRENTLY` tem um único comando.

**Contraprova dos testes**, com mutações feitas à mão:
- tirar `WAITING` da regra → 2 testes falham;
- tirar um `@@index` do schema → o teste de índice aponta a migration.

## Testes executados
| Verificação | Resultado |
|---|---|
| `vitest` | 408/408 |
| `tsc --noEmit` | 0 erros |
| `eslint` | 194 / 100 (sem mudança) |
| Migrations no `rls_stage` (como dono não superusuário) | 8/8 aplicadas, 24/24 regras validadas |
| Falha de `VALIDATE` simulada (`perf_stage` com `status='CLOSED'` antigo) | `NOT VALID` aplicou, o preflight mostrou o valor e o `VALIDATE` falhou com mensagem clara. Depois de corrigir o dado, passou. |
| Schema × migrations (`compare-schema.sh` entre banco criado pelo schema e banco criado pelas migrations) | os 6 índices batem. Diferenças só nos objetos manuais esperados (regras `chk_*`, `f_unaccent`, 2 índices parciais) e na tabela m-n já documentada na T-09 |
| E2E (smoke, T-11, T-12, T-15, T-16, T-18, logout, fluxo completo do operador) | 20/20 |
| Runtime T-05, T-13, T-16, T-17, T-18 | iguais à Fase 2. Nenhum erro de constraint no log do servidor |

## Resultado
O banco passa a recusar valor inválido em 24 colunas, e as consultas mais pesadas do dashboard e dos detalhes ficaram de 7 a 800 vezes mais rápidas no volume testado.

## Riscos
- **Produção: NÃO VERIFICADO.** Não sei se a produção tem valores fora da lista (por exemplo, status gravados por versões antigas ou pela branch WIP). Por isso o desenho é `NOT VALID` + preflight + `VALIDATE` separado. Mesmo sem validar, uma linha antiga com valor fora da regra **não pode ser alterada** até ser corrigida: o Postgres confere a regra em todo `UPDATE`. O preflight mostra essas linhas.
- `atualizarStatusCorretiva` ainda aceita o status vindo do cliente (pendência da T-16, vai para a T-21). Agora o banco barra valor inválido, mas a resposta seria erro 500, e não uma mensagem.
- **Não verifiquei com o Prisma CLI nativo:**
  - se `migrate deploy` roda as migrations com `CONCURRENTLY` (o motor nativo não baixa neste ambiente). O padrão é o mesmo da T-15 (um comando por arquivo, conforme a documentação do Prisma);
  - se `migrate dev` tenta remover CHECKs. A documentação diz que o Prisma não gerencia CHECKs, e o processo exige revisar o SQL gerado.
- Cada índice novo deixa a gravação um pouco mais lenta. `readings` passou de 7 para 9 índices. Possíveis redundâncias antigas não foram removidas (exigem estatística de uso real).

## Rollback
- **Código:** `git revert c90ed41 0f7d1ee`.
- **Banco:** uma migration nova com:
  - `ALTER TABLE ... DROP CONSTRAINT chk_*` (24 linhas);
  - `DROP INDEX CONCURRENTLY` dos 6 índices, um por migration.

  Nenhum dado é alterado.

## Pendências
- **FK composta `(tenant_id, x_id)`** (item da seção 12): **NÃO FEITA**. Era "PRECISA INVESTIGAÇÃO" na Passada 2: o `migrate dev` provavelmente gera `DROP` de chave estrangeira que não está no schema, e não consegui confirmar sem o motor nativo. O isolamento continua garantido por `assertOwned` (T-05) e RLS (T-14). Fica para depois da T-28, com CI e Prisma nativo.
- **Decisões que são suas** (seção 12): unicidade global de e-mail no banco, remover a tabela `sessions` (sem uso com JWT) e unificar `deleted_at`/`is_active`.
- Índices de trigrama (T-32) e revisão de índices redundantes com `pg_stat_user_indexes` em produção.
- Achado lateral: as contagens de "ocorrências abertas" no dashboard do gestor e no sino usam `OPEN` e `IN_PROGRESS`, mas não `WAITING`, enquanto as listas incluem `WAITING`. Os números divergem quando existe ocorrência "Aguardando". Vai para a T-23 (dashboard agregado), que compara os números.
