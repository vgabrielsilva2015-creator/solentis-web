-- T-14 — Row Level Security em TODAS as tabelas do schema public, sem policies
-- (deny-all) e sem FORCE.
--
-- Efeito
--   * O app conecta pelo Prisma como DONO das tabelas. Dono sem FORCE ignora o
--     RLS: nenhuma query do app muda (testado em staging com dono não-superusuário).
--   * Os papéis da API automática do Supabase (anon, authenticated — PostgREST)
--     ficam sem acesso: RLS sem policy nega tudo e, além disso, os privilégios
--     desses papéis nas tabelas são revogados. O Solentis não usa essa API.
--   * Não substitui o isolamento por tenant_id na aplicação (guardião + T-05).
--
-- Idempotente: pode rodar mais de uma vez. Em produção onde o RLS já foi ligado
-- por prisma/sql/enable_rls.sql, só reforça (e cobre tabelas novas).

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
  END LOOP;
END $$;

DO $$
DECLARE
  papel TEXT;
BEGIN
  FOREACH papel IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = papel) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', papel);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', papel);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', papel);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', papel);
    END IF;
  END LOOP;
END $$;
