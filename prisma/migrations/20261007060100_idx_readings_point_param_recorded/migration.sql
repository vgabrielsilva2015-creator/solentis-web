-- T-19 — índice criado com CONCURRENTLY (não trava gravações). Sozinho nesta migration
-- porque CONCURRENTLY não roda dentro de transação. Medido no banco de carga (docs/DB-INDEXES.md).
-- Últimas leituras de ponto e parâmetro (painel do gestor): 25 ms para 0,03 ms.

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "readings_tenant_point_param_recorded_at_idx" ON "readings"("tenant_id", "collection_point_id", "parameter_id", "recorded_at");
