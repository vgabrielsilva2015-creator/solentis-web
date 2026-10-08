-- T-19 — índice criado com CONCURRENTLY (não trava gravações). Sozinho nesta migration
-- porque CONCURRENTLY não roda dentro de transação. Medido no banco de carga (docs/DB-INDEXES.md).
-- Filtro de ponto das ocorrências no dashboard e chave estrangeira sem índice.

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "occurrences_collection_point_id_idx" ON "occurrences"("collection_point_id");
