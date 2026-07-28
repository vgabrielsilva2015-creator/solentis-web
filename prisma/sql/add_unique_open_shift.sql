-- Impede DOIS turnos ativos para o mesmo (tenant, turno, dia) de forma ATÔMICA
-- no banco — não dependendo do nível de isolamento da transação da aplicação.
--
-- Contexto: abrirTurno/assumirPosto/confirmarPassagem faziam "verifica-se-existe →
-- cria" dentro de uma $transaction, confiando na serialização de escritas do SQLite.
-- Com Postgres (READ COMMITTED) isso NÃO serializa, e dois cliques concorrentes
-- podiam criar duas instâncias OPEN. Este índice único parcial fecha a corrida.
--
-- Aplicar UMA vez em produção (Supabase SQL Editor ou):
--   npx prisma db execute --file prisma/sql/add_unique_open_shift.sql --schema prisma/schema.prisma
--
-- Idempotente: usa IF NOT EXISTS.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_shift_instance_ativa
  ON shift_instances (tenant_id, shift_id, date)
  WHERE status IN ('OPEN', 'HANDOVER_PENDING', 'SCHEDULED');
