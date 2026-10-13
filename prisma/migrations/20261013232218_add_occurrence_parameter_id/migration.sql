-- AlterTable
ALTER TABLE "occurrences" ADD COLUMN     "parameter_id" TEXT;

-- CreateIndex
CREATE INDEX "occurrences_tenant_id_parameter_id_idx" ON "occurrences"("tenant_id", "parameter_id");

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- M-07: no máximo UMA ocorrência automática NÃO resolvida por (tenant, ponto, parâmetro).
-- Guarda atômica anti-corrida (duas NCs simultâneas: só a 1ª cria, a 2ª vira comentário).
-- O Prisma 5 não modela índice parcial — ver db-constraints.test.ts (MANUAIS)
-- e docs/MIGRATIONS.md (objetos não modelados: não dropar em migrate dev).
-- Cobre 0 linhas no momento da migration (parameter_id é novo/NULL em tudo), então o build é
-- instantâneo. Em produção, se a tabela "occurrences" for grande, o dono pode criar este
-- índice com CREATE UNIQUE INDEX CONCURRENTLY (fora de transação) em vez desta linha.
CREATE UNIQUE INDEX "uniq_ocorrencia_aberta_ponto_param"
  ON "occurrences" ("tenant_id", "collection_point_id", "parameter_id")
  WHERE "parameter_id" IS NOT NULL AND "status" <> 'RESOLVED';
