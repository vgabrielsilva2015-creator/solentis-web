-- ============================================================================
-- Solentis — verificações SOMENTE LEITURA para o banco de produção (T-04)
-- ============================================================================
-- Rodar no Supabase → SQL Editor (ou psql com usuário de leitura).
-- Nenhum comando aqui altera dados ou estrutura: só SELECT em catálogos e tabelas.
-- Não imprime hashes de senha nem tokens. Copie o resultado para o
-- PRODUCTION-CHECKLIST.md (seção "Resultados").
-- ============================================================================

-- 1) Contas padrão / seed ainda existentes (e há quanto tempo a senha não muda)
SELECT u.email, u.role, u.is_active, u.must_change_password, t.slug AS planta,
       u.created_at, u.updated_at, u.last_login_at
FROM users u JOIN tenants t ON t.id = u.tenant_id
WHERE u.email IN ('admin@solentis.local','tecnico@solentis.local','operador@solentis.local',
                  'manutencao@solentis.local','super@solentis.local','admin@solentis.com')
   OR u.email LIKE '%@solentis.local';

-- 2) Todos os SUPER_ADMIN e em qual planta estão
SELECT u.email, u.is_active, u.must_change_password, t.slug AS planta, u.last_login_at
FROM users u JOIN tenants t ON t.id = u.tenant_id
WHERE u.role = 'SUPER_ADMIN';

-- 3) Unicidade de e-mail: índice único global existe? e há duplicados?
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'users' AND indexdef ILIKE '%UNIQUE%';
SELECT lower(email) AS email, count(*) FROM users GROUP BY 1 HAVING count(*) > 1;

-- 4) Índices esperados (turno e consultas) presentes?
SELECT indexname FROM pg_indexes
WHERE indexname IN ('uniq_shift_instance_ativa','uniq_turno_ativo_por_operador',
                    'idx_readings_tenant_parameter_created','idx_analyses_tenant_parameter_collected',
                    'idx_extanalyses_tenant_parameter_collected','idx_stock_entry_tenant_product_date',
                    'idx_stock_exit_tenant_product_date')
ORDER BY 1;

-- 5) RLS por tabela
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- 6) Estado das migrations registradas
SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY started_at;

-- 7) Colunas aplicadas fora das migrations (devem existir)
SELECT table_name, column_name FROM information_schema.columns
WHERE table_schema = 'public' AND (table_name, column_name) IN (
  ('readings','photo_filename'), ('shift_tasks','template_id'), ('shift_tasks','requires_photo'),
  ('shift_tasks','repeated_from_id'), ('shift_tasks','repeat_reason'), ('shift_tasks','occurrence_id'),
  ('users','receive_nc_push'))
ORDER BY 1, 2;
SELECT to_regclass('public.shift_task_templates') AS shift_task_templates;

-- 8) Conexões em uso agora (dimensionar connection_limit)
SELECT usename, application_name, state, count(*) FROM pg_stat_activity
GROUP BY 1, 2, 3 ORDER BY 4 DESC;

-- 9) Volume por tabela (planejamento de escala)
SELECT relname AS tabela, n_live_tup AS linhas_aprox
FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 15;
