-- T-19 — valores permitidos nas colunas de domínio (antes texto livre) e quantidades de estoque.
-- NOT VALID: vale para toda linha nova ou alterada, mas NÃO confere as linhas antigas agora, então a
-- migration não falha por causa de dado antigo fora da lista. A conferência das antigas é a migration
-- seguinte (VALIDATE), que só deve ir para produção depois de scripts/ops/t19-preflight.sql dar zero.
-- As listas espelham o código (src/types, Zod e telas). Teste: src/lib/__tests__/db-constraints.test.ts

ALTER TABLE "users" ADD CONSTRAINT "chk_users_role" CHECK ("role" IN ('OPERATOR','TECHNICIAN','MANAGER','MAINTENANCE','SUPER_ADMIN')) NOT VALID;
ALTER TABLE "occurrences" ADD CONSTRAINT "chk_occurrences_severity" CHECK ("severity" IN ('LOW','MEDIUM','HIGH','CRITICAL')) NOT VALID;
ALTER TABLE "occurrences" ADD CONSTRAINT "chk_occurrences_status" CHECK ("status" IN ('OPEN','IN_PROGRESS','WAITING','RESOLVED')) NOT VALID;
ALTER TABLE "occurrences" ADD CONSTRAINT "chk_occurrences_type" CHECK ("type" IS NULL OR "type" IN ('OPERATIONAL','LABORATORY','EQUIPMENT','ENVIRONMENTAL','SAFETY')) NOT VALID;
ALTER TABLE "occurrence_severity_defaults" ADD CONSTRAINT "chk_occurrence_severity_defaults_severity" CHECK ("severity" IN ('LOW','MEDIUM','HIGH','CRITICAL')) NOT VALID;
ALTER TABLE "shift_instances" ADD CONSTRAINT "chk_shift_instances_status" CHECK ("status" IN ('SCHEDULED','OPEN','HANDOVER_PENDING','CLOSED')) NOT VALID;
ALTER TABLE "shift_handovers" ADD CONSTRAINT "chk_shift_handovers_status" CHECK ("status" IN ('PENDING','CONFIRMED','TIMED_OUT')) NOT VALID;
ALTER TABLE "shift_tasks" ADD CONSTRAINT "chk_shift_tasks_status" CHECK ("status" IN ('PENDING','DONE','SKIPPED')) NOT VALID;
ALTER TABLE "preventive_maintenances" ADD CONSTRAINT "chk_preventive_maintenances_status" CHECK ("status" IN ('SCHEDULED','IN_PROGRESS','COMPLETED','OVERDUE','CANCELLED')) NOT VALID;
ALTER TABLE "corrective_maintenances" ADD CONSTRAINT "chk_corrective_maintenances_status" CHECK ("status" IN ('OPEN','IN_PROGRESS','COMPLETED','VALIDATED','CANCELLED')) NOT VALID;
ALTER TABLE "corrective_maintenances" ADD CONSTRAINT "chk_corrective_maintenances_priority" CHECK ("priority" IS NULL OR "priority" IN ('LOW','MEDIUM','HIGH','CRITICAL')) NOT VALID;
ALTER TABLE "equipment" ADD CONSTRAINT "chk_equipment_status" CHECK ("status" IN ('OPERATING','MAINTENANCE','INACTIVE','SCRAPPED')) NOT VALID;
ALTER TABLE "readings" ADD CONSTRAINT "chk_readings_origin" CHECK ("origin" IN ('MANUAL','SENSOR','IMPORT','AI_IMPORT')) NOT VALID;
ALTER TABLE "analyses" ADD CONSTRAINT "chk_analyses_origin" CHECK ("origin" IN ('MANUAL','SENSOR','IMPORT','AI_IMPORT')) NOT VALID;
ALTER TABLE "external_analyses" ADD CONSTRAINT "chk_external_analyses_origin" CHECK ("origin" IN ('MANUAL','SENSOR','IMPORT','AI_IMPORT')) NOT VALID;
ALTER TABLE "analyses" ADD CONSTRAINT "chk_analyses_laboratory_type" CHECK ("laboratory_type" IN ('INTERNAL','EXTERNAL')) NOT VALID;
ALTER TABLE "external_analyses" ADD CONSTRAINT "chk_external_analyses_status" CHECK ("status" IN ('PENDING_LAB','COMPLETED')) NOT VALID;
ALTER TABLE "monitoring_schedules" ADD CONSTRAINT "chk_monitoring_schedules_sample_type" CHECK ("sample_type" IN ('FIELD','INTERNAL','EXTERNAL')) NOT VALID;
ALTER TABLE "monitoring_schedules" ADD CONSTRAINT "chk_monitoring_schedules_frequency" CHECK ("frequency" IN ('PER_SHIFT','DAILY','WEEKLY','MONTHLY')) NOT VALID;
ALTER TABLE "monitoring_schedules" ADD CONSTRAINT "chk_monitoring_schedules_executor_role" CHECK ("executor_role" IN ('OPERATOR','TECHNICIAN')) NOT VALID;
ALTER TABLE "parameter_limits" ADD CONSTRAINT "chk_parameter_limits_rule_type" CHECK ("rule_type" IN ('TETO','FAIXA','EFICIENCIA')) NOT VALID;

-- Estoque: entrada e saída sempre positivas, contagem física nunca negativa
ALTER TABLE "chemical_stock_entries" ADD CONSTRAINT "chk_chemical_stock_entries_quantity" CHECK ("quantity" > 0) NOT VALID;
ALTER TABLE "chemical_stock_exits" ADD CONSTRAINT "chk_chemical_stock_exits_quantity" CHECK ("quantity" > 0) NOT VALID;
ALTER TABLE "chemical_stock_counts" ADD CONSTRAINT "chk_chemical_stock_counts_counted_quantity" CHECK ("counted_quantity" >= 0) NOT VALID;
