-- T-15 — unicidade (tenant_id, client_id): o reenvio da mesma leitura não duplica.
-- CONCURRENTLY para não travar gravações em readings durante a criação.
-- Fica sozinho nesta migration porque CONCURRENTLY não roda dentro de transação.
-- Linhas antigas têm client_id NULL, e NULLs não colidem no índice único.

-- CreateIndex
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS "readings_tenant_id_client_id_key" ON "readings"("tenant_id", "client_id");
