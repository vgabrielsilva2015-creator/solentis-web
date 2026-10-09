-- T-19 — conferência ANTES de aplicar 20261007070100_domain_checks_validate em produção.
-- SOMENTE LEITURA (só SELECT). Rodar no SQL Editor do Supabase ou com psql na URL direta.
-- Resultado esperado: nenhuma linha. Cada linha mostra uma regra, o valor fora da lista e
-- quantas linhas têm esse valor. Corrigir os dados (com backup e aprovação) ou ajustar a
-- lista na migration antes de validar. Não imprime dados pessoais, só o valor da coluna.

SELECT 'chk_users_role' AS regra, "role"::text AS valor, count(*) AS linhas FROM "users" WHERE NOT ("role" IN ('OPERATOR','TECHNICIAN','MANAGER','MAINTENANCE','SUPER_ADMIN')) GROUP BY 2
UNION ALL
SELECT 'chk_occurrences_severity' AS regra, "severity"::text AS valor, count(*) AS linhas FROM "occurrences" WHERE NOT ("severity" IN ('LOW','MEDIUM','HIGH','CRITICAL')) GROUP BY 2
UNION ALL
SELECT 'chk_occurrences_status' AS regra, "status"::text AS valor, count(*) AS linhas FROM "occurrences" WHERE NOT ("status" IN ('OPEN','IN_PROGRESS','WAITING','RESOLVED')) GROUP BY 2
UNION ALL
SELECT 'chk_occurrences_type' AS regra, "type"::text AS valor, count(*) AS linhas FROM "occurrences" WHERE NOT ("type" IS NULL OR "type" IN ('OPERATIONAL','LABORATORY','EQUIPMENT','ENVIRONMENTAL','SAFETY')) GROUP BY 2
UNION ALL
SELECT 'chk_occurrence_severity_defaults_severity' AS regra, "severity"::text AS valor, count(*) AS linhas FROM "occurrence_severity_defaults" WHERE NOT ("severity" IN ('LOW','MEDIUM','HIGH','CRITICAL')) GROUP BY 2
UNION ALL
SELECT 'chk_shift_instances_status' AS regra, "status"::text AS valor, count(*) AS linhas FROM "shift_instances" WHERE NOT ("status" IN ('SCHEDULED','OPEN','HANDOVER_PENDING','CLOSED')) GROUP BY 2
UNION ALL
SELECT 'chk_shift_handovers_status' AS regra, "status"::text AS valor, count(*) AS linhas FROM "shift_handovers" WHERE NOT ("status" IN ('PENDING','CONFIRMED','TIMED_OUT')) GROUP BY 2
UNION ALL
SELECT 'chk_shift_tasks_status' AS regra, "status"::text AS valor, count(*) AS linhas FROM "shift_tasks" WHERE NOT ("status" IN ('PENDING','DONE','SKIPPED')) GROUP BY 2
UNION ALL
SELECT 'chk_preventive_maintenances_status' AS regra, "status"::text AS valor, count(*) AS linhas FROM "preventive_maintenances" WHERE NOT ("status" IN ('SCHEDULED','IN_PROGRESS','COMPLETED','OVERDUE','CANCELLED')) GROUP BY 2
UNION ALL
SELECT 'chk_corrective_maintenances_status' AS regra, "status"::text AS valor, count(*) AS linhas FROM "corrective_maintenances" WHERE NOT ("status" IN ('OPEN','IN_PROGRESS','COMPLETED','VALIDATED','CANCELLED')) GROUP BY 2
UNION ALL
SELECT 'chk_corrective_maintenances_priority' AS regra, "priority"::text AS valor, count(*) AS linhas FROM "corrective_maintenances" WHERE NOT ("priority" IS NULL OR "priority" IN ('LOW','MEDIUM','HIGH','CRITICAL')) GROUP BY 2
UNION ALL
SELECT 'chk_equipment_status' AS regra, "status"::text AS valor, count(*) AS linhas FROM "equipment" WHERE NOT ("status" IN ('OPERATING','MAINTENANCE','INACTIVE','SCRAPPED')) GROUP BY 2
UNION ALL
SELECT 'chk_readings_origin' AS regra, "origin"::text AS valor, count(*) AS linhas FROM "readings" WHERE NOT ("origin" IN ('MANUAL','SENSOR','IMPORT','AI_IMPORT')) GROUP BY 2
UNION ALL
SELECT 'chk_analyses_origin' AS regra, "origin"::text AS valor, count(*) AS linhas FROM "analyses" WHERE NOT ("origin" IN ('MANUAL','SENSOR','IMPORT','AI_IMPORT')) GROUP BY 2
UNION ALL
SELECT 'chk_external_analyses_origin' AS regra, "origin"::text AS valor, count(*) AS linhas FROM "external_analyses" WHERE NOT ("origin" IN ('MANUAL','SENSOR','IMPORT','AI_IMPORT')) GROUP BY 2
UNION ALL
SELECT 'chk_analyses_laboratory_type' AS regra, "laboratory_type"::text AS valor, count(*) AS linhas FROM "analyses" WHERE NOT ("laboratory_type" IN ('INTERNAL','EXTERNAL')) GROUP BY 2
UNION ALL
SELECT 'chk_external_analyses_status' AS regra, "status"::text AS valor, count(*) AS linhas FROM "external_analyses" WHERE NOT ("status" IN ('PENDING_LAB','COMPLETED')) GROUP BY 2
UNION ALL
SELECT 'chk_monitoring_schedules_sample_type' AS regra, "sample_type"::text AS valor, count(*) AS linhas FROM "monitoring_schedules" WHERE NOT ("sample_type" IN ('FIELD','INTERNAL','EXTERNAL')) GROUP BY 2
UNION ALL
SELECT 'chk_monitoring_schedules_frequency' AS regra, "frequency"::text AS valor, count(*) AS linhas FROM "monitoring_schedules" WHERE NOT ("frequency" IN ('PER_SHIFT','DAILY','WEEKLY','MONTHLY')) GROUP BY 2
UNION ALL
SELECT 'chk_monitoring_schedules_executor_role' AS regra, "executor_role"::text AS valor, count(*) AS linhas FROM "monitoring_schedules" WHERE NOT ("executor_role" IN ('OPERATOR','TECHNICIAN')) GROUP BY 2
UNION ALL
SELECT 'chk_parameter_limits_rule_type' AS regra, "rule_type"::text AS valor, count(*) AS linhas FROM "parameter_limits" WHERE NOT ("rule_type" IN ('TETO','FAIXA','EFICIENCIA')) GROUP BY 2
UNION ALL
SELECT 'chk_chemical_stock_entries_quantity' AS regra, "quantity"::text AS valor, count(*) AS linhas FROM "chemical_stock_entries" WHERE NOT ("quantity" > 0) GROUP BY 2
UNION ALL
SELECT 'chk_chemical_stock_exits_quantity' AS regra, "quantity"::text AS valor, count(*) AS linhas FROM "chemical_stock_exits" WHERE NOT ("quantity" > 0) GROUP BY 2
UNION ALL
SELECT 'chk_chemical_stock_counts_counted_quantity' AS regra, "counted_quantity"::text AS valor, count(*) AS linhas FROM "chemical_stock_counts" WHERE NOT ("counted_quantity" >= 0) GROUP BY 2
ORDER BY 1, 2;
