-- T-19 — índice criado com CONCURRENTLY (não trava gravações). Sozinho nesta migration
-- porque CONCURRENTLY não roda dentro de transação. Medido no banco de carga (docs/DB-INDEXES.md).
-- Análises de um ponto no período: 4,5 ms para 0,5 ms.

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "analyses_tenant_id_collection_point_id_collected_at_idx" ON "analyses"("tenant_id", "collection_point_id", "collected_at");
