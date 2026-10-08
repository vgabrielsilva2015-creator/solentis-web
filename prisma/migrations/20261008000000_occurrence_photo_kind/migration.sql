-- T-20 — foto de ocorrência passa a dizer se é do registro (REPORT) ou evidência da resolução (RESOLUTION).
-- Coluna com valor padrão constante: no Postgres 11+ não reescreve a tabela. As fotos existentes ficam REPORT.

-- AlterTable
ALTER TABLE "occurrence_photos" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'REPORT';

ALTER TABLE "occurrence_photos" ADD CONSTRAINT "chk_occurrence_photos_kind" CHECK ("kind" IN ('REPORT', 'RESOLUTION'));
