# Índices do banco (T-19)

## Como foi medido
Banco de carga `perf_stage`, criado **só pelas migrations** e preenchido com dados sintéticos (`perf/setup.sh` da auditoria, fora do repositório):
- 20 plantas;
- 1.000.000 leituras e 200.000 análises num ano;
- 100.000 ocorrências e 100.000 comentários;
- 50.000 registros de manutenção.

Postgres 16 local, cache quente, `EXPLAIN (ANALYZE, BUFFERS)`. São tempos de consulta no banco, sem rede nem aplicação. A proporção importa mais que o número absoluto.

| Consulta | Onde aparece | Antes | Depois | Índice |
|---|---|---|---|---|
| Tendência de um parâmetro (30 dias) | dashboard do gestor | 79 ms | 12 ms | `readings (tenant_id, parameter_id, created_at)` |
| Últimas leituras de ponto + parâmetro | painel do gestor | 25,6 ms | 0,03 ms | `readings (tenant_id, collection_point_id, parameter_id, recorded_at)` |
| Análises de um ponto (30 dias) | dashboard / histórico | 4,5 ms | 0,5 ms | `analyses (tenant_id, collection_point_id, collected_at)` |
| Comentários de uma ocorrência | detalhe da ocorrência | 4,8 ms (lê a tabela toda) | 0,02 ms | `occurrence_comments (occurrence_id)` |
| Histórico de manutenção do equipamento | detalhe do equipamento | 4,6 ms (lê a tabela toda) | 0,6 ms | `maintenance_logs (equipment_id)` |
| Ocorrências abertas de um ponto | dashboard filtrado | 3,9 ms | 2,6 ms | `occurrences (collection_point_id)` (também é chave estrangeira sem índice) |

As duas consultas "lê a tabela toda" crescem junto com a tabela. As demais crescem com o volume da planta.

## O que foi testado e ficou de fora
- `occurrences (tenant_id, status, created_at DESC)`, sugerido na auditoria: 1,49 ms → 1,38 ms. O ganho não paga o custo extra em cada gravação. Reavaliar quando uma planta passar de ~100 mil ocorrências.
- Leituras do dia do operador (0,2 ms) e contagens do dashboard (5 ms): os índices que já existem bastam.
- Trigrama para a busca: o DDL está pronto em `docs/SEARCH.md` e fica para a T-32.

## Custo
Cada índice novo deixa um pouco mais lenta a gravação na tabela. A tabela `readings` ganhou 2 índices (agora são 9). Há índices simples antigos (`readings_parameter_id_idx`, `readings_collection_point_id_idx`) que podem ficar redundantes. **Não foram removidos**: remover índice em produção pede medição com o tráfego real (`pg_stat_user_indexes.idx_scan`) e fica para a T-32.

## Em produção
- Os 6 índices são criados com `CREATE INDEX CONCURRENTLY`, que não trava leituras nem gravações. Se a criação for interrompida, o Postgres deixa um índice `INVALID`. Nesse caso, apague o índice (`DROP INDEX CONCURRENTLY nome`) e rode o `migrate deploy` de novo.
- **NÃO VERIFICADO** em produção: volume real, uso real dos índices e tempo de criação. No Supabase Free, a criação de cada índice deve levar segundos com o volume atual de uma planta.
