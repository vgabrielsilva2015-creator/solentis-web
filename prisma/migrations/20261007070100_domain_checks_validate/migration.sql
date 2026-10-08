-- T-19 — confere as linhas antigas contra as regras da migration anterior.
-- VALIDATE usa trava leve (SHARE UPDATE EXCLUSIVE): leituras e gravações continuam.
-- ANTES de aplicar em produção: rodar scripts/ops/t19-preflight.sql (só leitura) e ver zero
-- em todas as linhas. Se alguma regra falhar aqui, o migrate deploy para nesta migration
-- (as regras NOT VALID da anterior continuam valendo). Veja docs/MIGRATIONS.md seção T-19.

ALTER TABLE "users" VALIDATE CONSTRAINT "chk_users_role";
ALTER TABLE "occurrences" VALIDATE CONSTRAINT "chk_occurrences_severity";
ALTER TABLE "occurrences" VALIDATE CONSTRAINT "chk_occurrences_status";
ALTER TABLE "occurrences" VALIDATE CONSTRAINT "chk_occurrences_type";
ALTER TABLE "occurrence_severity_defaults" VALIDATE CONSTRAINT "chk_occurrence_severity_defaults_severity";
ALTER TABLE "shift_instances" VALIDATE CONSTRAINT "chk_shift_instances_status";
ALTER TABLE "shift_handovers" VALIDATE CONSTRAINT "chk_shift_handovers_status";
ALTER TABLE "shift_tasks" VALIDATE CONSTRAINT "chk_shift_tasks_status";
ALTER TABLE "preventive_maintenances" VALIDATE CONSTRAINT "chk_preventive_maintenances_status";
ALTER TABLE "corrective_maintenances" VALIDATE CONSTRAINT "chk_corrective_maintenances_status";
ALTER TABLE "corrective_maintenances" VALIDATE CONSTRAINT "chk_corrective_maintenances_priority";
ALTER TABLE "equipment" VALIDATE CONSTRAINT "chk_equipment_status";
ALTER TABLE "readings" VALIDATE CONSTRAINT "chk_readings_origin";
ALTER TABLE "analyses" VALIDATE CONSTRAINT "chk_analyses_origin";
ALTER TABLE "external_analyses" VALIDATE CONSTRAINT "chk_external_analyses_origin";
ALTER TABLE "analyses" VALIDATE CONSTRAINT "chk_analyses_laboratory_type";
ALTER TABLE "external_analyses" VALIDATE CONSTRAINT "chk_external_analyses_status";
ALTER TABLE "monitoring_schedules" VALIDATE CONSTRAINT "chk_monitoring_schedules_sample_type";
ALTER TABLE "monitoring_schedules" VALIDATE CONSTRAINT "chk_monitoring_schedules_frequency";
ALTER TABLE "monitoring_schedules" VALIDATE CONSTRAINT "chk_monitoring_schedules_executor_role";
ALTER TABLE "parameter_limits" VALIDATE CONSTRAINT "chk_parameter_limits_rule_type";
ALTER TABLE "chemical_stock_entries" VALIDATE CONSTRAINT "chk_chemical_stock_entries_quantity";
ALTER TABLE "chemical_stock_exits" VALIDATE CONSTRAINT "chk_chemical_stock_exits_quantity";
ALTER TABLE "chemical_stock_counts" VALIDATE CONSTRAINT "chk_chemical_stock_counts_counted_quantity";
