-- T-15 — id gerado no aparelho para cada leitura (fila offline idempotente).
-- Coluna nova, anulável e sem default: instantânea mesmo em tabela grande.

-- AlterTable
ALTER TABLE "readings" ADD COLUMN "client_id" TEXT;
