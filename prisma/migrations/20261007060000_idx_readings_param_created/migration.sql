-- T-19 — índice criado com CONCURRENTLY (não trava gravações). Sozinho nesta migration
-- porque CONCURRENTLY não roda dentro de transação. Medido no banco de carga (docs/DB-INDEXES.md).
-- Tendência de um parâmetro no dashboard do gestor: 79 ms para 12 ms.

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "readings_tenant_id_parameter_id_created_at_idx" ON "readings"("tenant_id", "parameter_id", "created_at");
