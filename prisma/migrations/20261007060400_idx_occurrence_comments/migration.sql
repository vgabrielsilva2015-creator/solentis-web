-- T-19 — índice criado com CONCURRENTLY (não trava gravações). Sozinho nesta migration
-- porque CONCURRENTLY não roda dentro de transação. Medido no banco de carga (docs/DB-INDEXES.md).
-- Comentários de uma ocorrência: era leitura da tabela inteira.

-- CreateIndex
CREATE INDEX CONCURRENTLY IF NOT EXISTS "occurrence_comments_occurrence_id_idx" ON "occurrence_comments"("occurrence_id");
