-- ============================================================================
-- Solentis — Habilitar Row Level Security (RLS) — DEFESA EM PROFUNDIDADE
-- ============================================================================
-- CONTEXTO (leia antes de rodar):
--   O app conecta via Prisma como DONO das tabelas (role `postgres`). O dono
--   IGNORA o RLS (não usamos FORCE), então as queries do Prisma continuam
--   funcionando exatamente igual — RISCO ZERO para a aplicação.
--
--   O valor deste RLS é fechar a API automática do Supabase (PostgREST, roles
--   `anon`/`authenticated`). Sem policies, o acesso por esse caminho fica
--   NEGADO POR PADRÃO. O Solentis não usa essa API, então isto é puramente
--   uma camada extra de segurança (e cala os avisos "RLS disabled" do painel).
--
--   Isto NÃO substitui o isolamento por tenant_id da aplicação (o guardião de
--   isolamento continua sendo a proteção principal das queries do Prisma).
--
-- COMO RODAR (recomendado): cole no Supabase → SQL Editor → Run.
--   Alternativa: npx prisma db execute --file prisma/sql/enable_rls.sql --schema prisma/schema.prisma
--   (o db execute usa a DIRECT_URL; confirme que aponta para o banco certo.)
--
-- É IDEMPOTENTE: rodar de novo não causa erro.
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE '\_%'   -- pula tabelas internas (ex.: _prisma_migrations)
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
  END LOOP;
END $$;

-- ── Verificação: confirme que rowsecurity = true em todas as tabelas do app ──
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public' AND tablename NOT LIKE '\_%'
-- ORDER BY tablename;

-- ── ROLLBACK (se algum dia precisar reverter) ───────────────────────────────
-- DO $$
-- DECLARE r RECORD;
-- BEGIN
--   FOR r IN
--     SELECT tablename FROM pg_tables
--     WHERE schemaname = 'public' AND tablename NOT LIKE '\_%'
--   LOOP
--     EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', r.tablename);
--   END LOOP;
-- END $$;
