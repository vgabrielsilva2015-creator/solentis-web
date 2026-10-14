-- M-13/M-14 — índice para a listagem de análises (ORDER BY collected_at, WHERE tenant_id).
-- Os índices existentes lideram com parameter_id/collection_point_id antes de collected_at,
-- então não servem bem para a listagem simples por tenant. CONCURRENTLY, sozinho na migration.

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "analyses_tenant_id_collected_at_idx" ON "analyses"("tenant_id", "collected_at");
