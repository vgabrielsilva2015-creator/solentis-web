-- T-09 — Índices únicos PARCIAIS que o schema.prisma não consegue expressar
-- (Prisma 5 não suporta WHERE em @@unique). Eram aplicados por SQL avulso:
--   prisma/sql/add_unique_open_shift.sql
--   prisma/sql/add_unique_turno_por_operador.sql
-- São regras de negócio, não otimização:
--   1) no máximo uma instância ativa por turno/dia/planta (corrida ao abrir turno),
--   2) no máximo um turno ativo por operador.
--
-- Banco EXISTENTE (produção): já devem existir, marcar como aplicado após validar
-- (docs/MIGRATIONS.md). Banco NOVO: criados aqui.
--
-- Observação para quem rodar `prisma migrate diff`: estes dois índices aparecem
-- como "a remover", porque não estão no schema. É esperado, não remova.

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_shift_instance_ativa"
  ON "shift_instances" ("tenant_id", "shift_id", "date")
  WHERE "status" IN ('OPEN', 'HANDOVER_PENDING', 'SCHEDULED');

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_turno_ativo_por_operador"
  ON "shift_instances" ("opened_by")
  WHERE "status" IN ('OPEN', 'HANDOVER_PENDING');
