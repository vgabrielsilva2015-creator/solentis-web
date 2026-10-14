# PERF-BASELINE — orçamento de queries por página (M-12)

Gerado por `scripts/perf/measure-queries.mjs` contra um banco sintético
(`prisma/seed.ts` + `prisma/seed-demo.ts`). Mede o **primary data fetch replicado** de
cada página (nº de queries ao Prisma + tempo), não o render RSC real.

- Data: 2026-10-14
- Volume do banco: **434** leituras · **102** análises · **54** ocorrências · **0** equipamentos
- ⚠️ Volume pequeno (seed-demo ~6 meses). Para números de **escala real**, rodar `scripts/load/` (k6) num staging com 12+ meses. Use esta tabela como **ordem de grandeza** e **contagem de queries** (o sinal mais estável aqui).

## Baseline (ordenado por nº de queries)

| Página | Queries | Tempo (ms) |
|---|---:|---:|
| `gestor/dashboard` | 7 | 39.2 |
| `operador/dashboard` | 6 | 19.1 |
| `gestor/leituras` | 5 | 17.8 |
| `tecnico/dashboard` | 5 | 14.5 |
| `tecnico/analises` | 5 | 5.3 |
| `gestor/produtos-quimicos` | 4 | 12.7 |
| `gestor/ocorrencias` | 3 | 3.7 |
| `operador/leituras` | 3 | 3 |
| `gestor/auditoria` | 2 | 8.2 |
| `tecnico/equipamentos` | 2 | 2.6 |

## Leitura / próximos passos (M-13/M-14)
- **Dashboards** concentram o nº de queries (vários `count`/`groupBy`/`aggregate` por render). Alvos do **M-13**: agregar no banco, cache por tenant, índices compostos comprovados por `EXPLAIN`.
- **Listagens** (leituras, análises, ocorrências, auditoria, equipamentos) são enxutas em nº de queries (findMany + count), mas o custo cresce com o volume/includes. Alvo do **M-14**: paginação por cursor, `take` obrigatório, export em streaming.
- "Só otimizar o que medir": reexecutar este script após cada otimização e comparar.
