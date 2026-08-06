-- Impede que o MESMO operador tenha DOIS turnos ativos ao mesmo tempo, de forma
-- ATÔMICA no banco — não só na aplicação.
--
-- Contexto: o índice uniq_shift_instance_ativa (add_unique_open_shift.sql) já
-- impede dois turnos ativos no mesmo (tenant, turno, dia), mas NÃO impede que um
-- operador abra Tarde e Noite ao mesmo tempo (períodos diferentes passam). No
-- teste do piloto foi possível abrir Tarde + Noite às 15:38 pelo mesmo usuário.
-- Este índice fecha essa brecha: no máximo 1 instância OPEN/HANDOVER_PENDING por
-- opened_by.
--
-- SCHEDULED fica de fora de propósito: o cron pré-cria instâncias SCHEDULED com um
-- opened_by de fallback (escala→gestor), e elas não devem contar como "turno ativo".
--
-- Aplicar UMA vez em produção (Supabase SQL Editor ou):
--   npx prisma db execute --file prisma/sql/add_unique_turno_por_operador.sql --schema prisma/schema.prisma
--
-- Idempotente: usa IF NOT EXISTS.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_turno_ativo_por_operador
  ON shift_instances (opened_by)
  WHERE status IN ('OPEN', 'HANDOVER_PENDING');
