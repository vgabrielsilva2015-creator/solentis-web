-- T-19 — índice criado com CONCURRENTLY (não trava gravações). Sozinho nesta migration
-- porque CONCURRENTLY não roda dentro de transação. Medido no banco de carga (docs/DB-INDEXES.md).
-- Histórico de manutenção do equipamento: era leitura da tabela inteira.

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "maintenance_logs_equipment_id_idx" ON "maintenance_logs"("equipment_id");
