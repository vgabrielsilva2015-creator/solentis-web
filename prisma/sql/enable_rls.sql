-- ============================================================================
-- RLS (Row-Level Security) — RASCUNHO PARA REVISÃO — NÃO APLICAR ÀS CEGAS
-- ============================================================================
-- Objetivo: defesa em profundidade contra vazamento entre plantas (tenants).
-- Hoje o isolamento é 100% na aplicação (Prisma). Isto adiciona uma rede de
-- segurança NO BANCO: uma query que "esqueça" o tenant_id passa a não ver
-- linhas de outro tenant, em vez de vazar.
--
-- ⚠️ PRÉ-REQUISITO CRÍTICO (leia docs/RLS_PLANO.md antes de rodar):
--   O papel do Postgres que o Prisma usa NÃO pode ser superuser nem ter
--   BYPASSRLS. Se o Prisma conectar como `postgres` (superuser do Supabase),
--   TODAS estas políticas são ignoradas e isto não protege nada.
--   Por isso usamos FORCE ROW LEVEL SECURITY (faz a RLS valer até para o
--   DONO da tabela) — mas superuser/BYPASSRLS ainda fura. Confirme o papel.
--
-- ⚠️ A aplicação precisa injetar o tenant por request ANTES das queries:
--     SELECT set_config('app.tenant_id', '<id-do-tenant>', true);
--   O 3º argumento `true` = escopo de TRANSAÇÃO (obrigatório com o pooler do
--   Supabase em modo transaction). Sem isso, ou tudo é negado (fail-closed),
--   ou o valor vaza entre requests. Ver o plano do lado do Prisma no doc.
--
-- Rode PRIMEIRO em um banco de STAGING/cópia. Idempotente (pode reexecutar).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Tabelas COM coluna tenant_id  → política direta
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'users','password_reset_tokens','login_attempts','sessions',
    'quality_parameters','parameter_limits','parameter_aliases',
    'analysis_methods','equipment_categories','collection_points',
    'shifts','shift_schedules','occurrence_severity_defaults','equipment',
    'shift_instances','readings','analyses','external_analyses',
    'monitoring_schedules','preventive_maintenances','corrective_maintenances',
    'occurrences','occurrence_photos','shift_handovers','shift_tasks',
    'shift_task_templates','shift_task_photos','chemical_products',
    'chemical_stock_entries','chemical_stock_exits','chemical_stock_counts',
    'audit_logs','maintenance_logs','shift_scales','maintenance_days'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN
      RAISE NOTICE 'Tabela % não existe — pulando', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE public.%I FORCE  ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON public.%I', t);
    -- FOR ALL cobre SELECT/INSERT/UPDATE/DELETE.
    -- USING filtra o que é lido/alterado; WITH CHECK barra gravar p/ outro tenant.
    -- current_setting(..., true) => NULL quando não setado => comparação falsa
    -- => nega tudo (fail-closed). Isso é proposital.
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON public.%I
        FOR ALL
        USING      (tenant_id = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id = current_setting('app.tenant_id', true))
    $f$, t);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2) Tabela raiz `tenants` → cada tenant só enxerga a si mesmo
-- ----------------------------------------------------------------------------
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_self ON public.tenants;
CREATE POLICY tenant_self ON public.tenants
  FOR ALL
  USING      (id = current_setting('app.tenant_id', true))
  WITH CHECK (id = current_setting('app.tenant_id', true));

-- ----------------------------------------------------------------------------
-- 3) Tabelas SEM tenant_id → política via relação (subquery)
--    (o ideal a médio prazo é adicionar tenant_id a elas p/ política direta)
-- ----------------------------------------------------------------------------

-- push_subscriptions.user_id → users.tenant_id
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.push_subscriptions;
CREATE POLICY tenant_isolation ON public.push_subscriptions
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = push_subscriptions.user_id
      AND u.tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = push_subscriptions.user_id
      AND u.tenant_id = current_setting('app.tenant_id', true)));

-- parameter_history.parameter_id → quality_parameters.tenant_id
ALTER TABLE public.parameter_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parameter_history FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.parameter_history;
CREATE POLICY tenant_isolation ON public.parameter_history
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.quality_parameters q
    WHERE q.id = parameter_history.parameter_id
      AND q.tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.quality_parameters q
    WHERE q.id = parameter_history.parameter_id
      AND q.tenant_id = current_setting('app.tenant_id', true)));

-- occurrence_comments.occurrence_id → occurrences.tenant_id
ALTER TABLE public.occurrence_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_comments FORCE  ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation ON public.occurrence_comments;
CREATE POLICY tenant_isolation ON public.occurrence_comments
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.occurrences o
    WHERE o.id = occurrence_comments.occurrence_id
      AND o.tenant_id = current_setting('app.tenant_id', true)))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.occurrences o
    WHERE o.id = occurrence_comments.occurrence_id
      AND o.tenant_id = current_setting('app.tenant_id', true)));

-- ============================================================================
-- ROLLBACK (se precisar desfazer em staging):
--   Para cada tabela:  ALTER TABLE public.<t> DISABLE ROW LEVEL SECURITY;
--                      DROP POLICY IF EXISTS tenant_isolation ON public.<t>;
--   (tenants: DROP POLICY tenant_self)
-- ============================================================================
