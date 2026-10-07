-- T-05 — Referências cross-tenant já gravadas (SOMENTE LEITURA).
--
-- As FKs do banco são globais: até a T-05, algumas actions aceitavam o id de um
-- registro de outra planta. Esta consulta conta, para cada FK, as linhas cujo
-- tenant_id é diferente do tenant_id do registro referenciado.
-- Resultado esperado: nenhuma linha. Qualquer linha listada precisa de análise
-- manual antes de qualquer correção (não apagar nada sem backup e plano).
--
-- Gerado a partir de prisma/schema.prisma. Não imprime conteúdo, só contagens.

SELECT * FROM (
  SELECT 'users.created_by -> users' AS referencia, count(*) AS linhas
    FROM "users" x JOIN "users" p ON p.id = x."created_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'password_reset_tokens.user_id -> users' AS referencia, count(*) AS linhas
    FROM "password_reset_tokens" x JOIN "users" p ON p.id = x."user_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'sessions.user_id -> users' AS referencia, count(*) AS linhas
    FROM "sessions" x JOIN "users" p ON p.id = x."user_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'quality_parameters.created_by -> users' AS referencia, count(*) AS linhas
    FROM "quality_parameters" x JOIN "users" p ON p.id = x."created_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'quality_parameters.default_method_id -> analysis_methods' AS referencia, count(*) AS linhas
    FROM "quality_parameters" x JOIN "analysis_methods" p ON p.id = x."default_method_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'parameter_limits.parameter_id -> quality_parameters' AS referencia, count(*) AS linhas
    FROM "parameter_limits" x JOIN "quality_parameters" p ON p.id = x."parameter_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'parameter_aliases.parameter_id -> quality_parameters' AS referencia, count(*) AS linhas
    FROM "parameter_aliases" x JOIN "quality_parameters" p ON p.id = x."parameter_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_schedules.shift_id -> shifts' AS referencia, count(*) AS linhas
    FROM "shift_schedules" x JOIN "shifts" p ON p.id = x."shift_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'occurrence_severity_defaults.updated_by -> users' AS referencia, count(*) AS linhas
    FROM "occurrence_severity_defaults" x JOIN "users" p ON p.id = x."updated_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'equipment.category_id -> equipment_categories' AS referencia, count(*) AS linhas
    FROM "equipment" x JOIN "equipment_categories" p ON p.id = x."category_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'equipment.created_by -> users' AS referencia, count(*) AS linhas
    FROM "equipment" x JOIN "users" p ON p.id = x."created_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'equipment.responsible_id -> users' AS referencia, count(*) AS linhas
    FROM "equipment" x JOIN "users" p ON p.id = x."responsible_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_instances.shift_id -> shifts' AS referencia, count(*) AS linhas
    FROM "shift_instances" x JOIN "shifts" p ON p.id = x."shift_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_instances.opened_by -> users' AS referencia, count(*) AS linhas
    FROM "shift_instances" x JOIN "users" p ON p.id = x."opened_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'readings.collection_point_id -> collection_points' AS referencia, count(*) AS linhas
    FROM "readings" x JOIN "collection_points" p ON p.id = x."collection_point_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'readings.parameter_id -> quality_parameters' AS referencia, count(*) AS linhas
    FROM "readings" x JOIN "quality_parameters" p ON p.id = x."parameter_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'readings.shift_instance_id -> shift_instances' AS referencia, count(*) AS linhas
    FROM "readings" x JOIN "shift_instances" p ON p.id = x."shift_instance_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'readings.recorded_by -> users' AS referencia, count(*) AS linhas
    FROM "readings" x JOIN "users" p ON p.id = x."recorded_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'analyses.collection_point_id -> collection_points' AS referencia, count(*) AS linhas
    FROM "analyses" x JOIN "collection_points" p ON p.id = x."collection_point_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'analyses.parameter_id -> quality_parameters' AS referencia, count(*) AS linhas
    FROM "analyses" x JOIN "quality_parameters" p ON p.id = x."parameter_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'analyses.method_id -> analysis_methods' AS referencia, count(*) AS linhas
    FROM "analyses" x JOIN "analysis_methods" p ON p.id = x."method_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'analyses.recorded_by -> users' AS referencia, count(*) AS linhas
    FROM "analyses" x JOIN "users" p ON p.id = x."recorded_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'analyses.approved_by -> users' AS referencia, count(*) AS linhas
    FROM "analyses" x JOIN "users" p ON p.id = x."approved_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'external_analyses.collection_point_id -> collection_points' AS referencia, count(*) AS linhas
    FROM "external_analyses" x JOIN "collection_points" p ON p.id = x."collection_point_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'external_analyses.parameter_id -> quality_parameters' AS referencia, count(*) AS linhas
    FROM "external_analyses" x JOIN "quality_parameters" p ON p.id = x."parameter_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'external_analyses.collected_by -> users' AS referencia, count(*) AS linhas
    FROM "external_analyses" x JOIN "users" p ON p.id = x."collected_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'monitoring_schedules.collection_point_id -> collection_points' AS referencia, count(*) AS linhas
    FROM "monitoring_schedules" x JOIN "collection_points" p ON p.id = x."collection_point_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'monitoring_schedules.parameter_id -> quality_parameters' AS referencia, count(*) AS linhas
    FROM "monitoring_schedules" x JOIN "quality_parameters" p ON p.id = x."parameter_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'monitoring_schedules.created_by -> users' AS referencia, count(*) AS linhas
    FROM "monitoring_schedules" x JOIN "users" p ON p.id = x."created_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'preventive_maintenances.equipment_id -> equipment' AS referencia, count(*) AS linhas
    FROM "preventive_maintenances" x JOIN "equipment" p ON p.id = x."equipment_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'preventive_maintenances.completed_by -> users' AS referencia, count(*) AS linhas
    FROM "preventive_maintenances" x JOIN "users" p ON p.id = x."completed_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'corrective_maintenances.equipment_id -> equipment' AS referencia, count(*) AS linhas
    FROM "corrective_maintenances" x JOIN "equipment" p ON p.id = x."equipment_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'corrective_maintenances.responsible_id -> users' AS referencia, count(*) AS linhas
    FROM "corrective_maintenances" x JOIN "users" p ON p.id = x."responsible_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'occurrences.reported_by -> users' AS referencia, count(*) AS linhas
    FROM "occurrences" x JOIN "users" p ON p.id = x."reported_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'occurrences.responsible_id -> users' AS referencia, count(*) AS linhas
    FROM "occurrences" x JOIN "users" p ON p.id = x."responsible_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'occurrences.resolved_by -> users' AS referencia, count(*) AS linhas
    FROM "occurrences" x JOIN "users" p ON p.id = x."resolved_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'occurrences.collection_point_id -> collection_points' AS referencia, count(*) AS linhas
    FROM "occurrences" x JOIN "collection_points" p ON p.id = x."collection_point_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'occurrence_photos.occurrence_id -> occurrences' AS referencia, count(*) AS linhas
    FROM "occurrence_photos" x JOIN "occurrences" p ON p.id = x."occurrence_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'occurrence_photos.uploaded_by -> users' AS referencia, count(*) AS linhas
    FROM "occurrence_photos" x JOIN "users" p ON p.id = x."uploaded_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_tasks.shift_instance_id -> shift_instances' AS referencia, count(*) AS linhas
    FROM "shift_tasks" x JOIN "shift_instances" p ON p.id = x."shift_instance_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_tasks.occurrence_id -> occurrences' AS referencia, count(*) AS linhas
    FROM "shift_tasks" x JOIN "occurrences" p ON p.id = x."occurrence_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_tasks.assigned_to_id -> users' AS referencia, count(*) AS linhas
    FROM "shift_tasks" x JOIN "users" p ON p.id = x."assigned_to_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_tasks.created_by -> users' AS referencia, count(*) AS linhas
    FROM "shift_tasks" x JOIN "users" p ON p.id = x."created_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_tasks.completed_by -> users' AS referencia, count(*) AS linhas
    FROM "shift_tasks" x JOIN "users" p ON p.id = x."completed_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_tasks.template_id -> shift_task_templates' AS referencia, count(*) AS linhas
    FROM "shift_tasks" x JOIN "shift_task_templates" p ON p.id = x."template_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_tasks.repeated_from_id -> shift_tasks' AS referencia, count(*) AS linhas
    FROM "shift_tasks" x JOIN "shift_tasks" p ON p.id = x."repeated_from_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_task_templates.shift_id -> shifts' AS referencia, count(*) AS linhas
    FROM "shift_task_templates" x JOIN "shifts" p ON p.id = x."shift_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_task_templates.assigned_to_id -> users' AS referencia, count(*) AS linhas
    FROM "shift_task_templates" x JOIN "users" p ON p.id = x."assigned_to_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_task_templates.created_by -> users' AS referencia, count(*) AS linhas
    FROM "shift_task_templates" x JOIN "users" p ON p.id = x."created_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_task_photos.task_id -> shift_tasks' AS referencia, count(*) AS linhas
    FROM "shift_task_photos" x JOIN "shift_tasks" p ON p.id = x."task_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_task_photos.uploaded_by -> users' AS referencia, count(*) AS linhas
    FROM "shift_task_photos" x JOIN "users" p ON p.id = x."uploaded_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'chemical_products.created_by -> users' AS referencia, count(*) AS linhas
    FROM "chemical_products" x JOIN "users" p ON p.id = x."created_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'chemical_stock_entries.product_id -> chemical_products' AS referencia, count(*) AS linhas
    FROM "chemical_stock_entries" x JOIN "chemical_products" p ON p.id = x."product_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'chemical_stock_entries.recorded_by -> users' AS referencia, count(*) AS linhas
    FROM "chemical_stock_entries" x JOIN "users" p ON p.id = x."recorded_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'chemical_stock_exits.product_id -> chemical_products' AS referencia, count(*) AS linhas
    FROM "chemical_stock_exits" x JOIN "chemical_products" p ON p.id = x."product_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'chemical_stock_exits.recorded_by -> users' AS referencia, count(*) AS linhas
    FROM "chemical_stock_exits" x JOIN "users" p ON p.id = x."recorded_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'chemical_stock_counts.product_id -> chemical_products' AS referencia, count(*) AS linhas
    FROM "chemical_stock_counts" x JOIN "chemical_products" p ON p.id = x."product_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'chemical_stock_counts.recorded_by -> users' AS referencia, count(*) AS linhas
    FROM "chemical_stock_counts" x JOIN "users" p ON p.id = x."recorded_by"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'audit_logs.user_id -> users' AS referencia, count(*) AS linhas
    FROM "audit_logs" x JOIN "users" p ON p.id = x."user_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'maintenance_logs.equipment_id -> equipment' AS referencia, count(*) AS linhas
    FROM "maintenance_logs" x JOIN "equipment" p ON p.id = x."equipment_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_scales.shift_id -> shifts' AS referencia, count(*) AS linhas
    FROM "shift_scales" x JOIN "shifts" p ON p.id = x."shift_id"
   WHERE x.tenant_id <> p.tenant_id
  UNION ALL
  SELECT 'shift_scales.operator_id -> users' AS referencia, count(*) AS linhas
    FROM "shift_scales" x JOIN "users" p ON p.id = x."operator_id"
   WHERE x.tenant_id <> p.tenant_id
) r
WHERE linhas > 0
ORDER BY linhas DESC;
