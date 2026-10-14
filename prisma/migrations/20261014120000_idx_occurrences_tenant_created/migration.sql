-- M-13/M-14 — índice para a listagem de ocorrências (ORDER BY created_at, WHERE tenant_id)
-- e os alertas do painel. CONCURRENTLY (não trava gravações), sozinho na migration porque
-- CONCURRENTLY não roda dentro de transação. Mede-se em staging com EXPLAIN (docs/DB-INDEXES.md).

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "occurrences_tenant_id_created_at_idx" ON "occurrences"("tenant_id", "created_at");
