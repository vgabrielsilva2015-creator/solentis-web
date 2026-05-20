-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" DATETIME NOT NULL,
    CONSTRAINT "sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "quality_parameters" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "min_limit" REAL,
    "max_limit" REAL,
    "legal_reference" TEXT,
    "effective_date" DATETIME NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "created_by" TEXT NOT NULL,
    CONSTRAINT "quality_parameters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "quality_parameters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "parameter_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "parameter_id" TEXT NOT NULL,
    "min_limit_before" REAL,
    "max_limit_before" REAL,
    "min_limit_after" REAL,
    "max_limit_after" REAL,
    "effective_date_before" DATETIME,
    "effective_date_after" DATETIME NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,
    CONSTRAINT "parameter_history_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "parameter_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analysis_methods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analysis_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment_categories" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "equipment_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "collection_points" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "collection_points_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "crosses_midnight" BOOLEAN NOT NULL DEFAULT false,
    "handover_timeout_minutes" INTEGER NOT NULL DEFAULT 120,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "occurrence_severity_defaults" (
    "severity" TEXT NOT NULL PRIMARY KEY,
    "deadline_hours" INTEGER NOT NULL,
    "updated_at" DATETIME NOT NULL,
    "updated_by" TEXT NOT NULL,
    CONSTRAINT "occurrence_severity_defaults_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "serial_number" TEXT,
    "location" TEXT,
    "installation_date" DATETIME,
    "preventive_frequency_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    CONSTRAINT "equipment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "equipment_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "equipment_categories" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "equipment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shift_instances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "opened_by" TEXT NOT NULL,
    "opened_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_instances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shift_instances_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shift_instances_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "readings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "collection_point_id" TEXT NOT NULL,
    "parameter_id" TEXT,
    "shift_instance_id" TEXT,
    "value" REAL,
    "unit" TEXT,
    "notes" TEXT,
    "is_non_conformant" BOOLEAN,
    "origin" TEXT NOT NULL DEFAULT 'MANUAL',
    "metadata_origin" TEXT,
    "recorded_by" TEXT NOT NULL,
    "recorded_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "readings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "readings_collection_point_id_fkey" FOREIGN KEY ("collection_point_id") REFERENCES "collection_points" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "readings_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "readings_shift_instance_id_fkey" FOREIGN KEY ("shift_instance_id") REFERENCES "shift_instances" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "readings_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "collection_point_id" TEXT NOT NULL,
    "parameter_id" TEXT NOT NULL,
    "method_id" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "unit" TEXT NOT NULL,
    "min_limit_applied" REAL,
    "max_limit_applied" REAL,
    "report_text" TEXT,
    "is_non_conformant" BOOLEAN NOT NULL,
    "approved_by" TEXT,
    "approved_at" DATETIME,
    "origin" TEXT NOT NULL DEFAULT 'MANUAL',
    "metadata_origin" TEXT,
    "collected_at" DATETIME NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "analyses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "analyses_collection_point_id_fkey" FOREIGN KEY ("collection_point_id") REFERENCES "collection_points" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "analyses_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "analyses_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "analysis_methods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "analyses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "analyses_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "preventive_maintenances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "scheduled_date" DATETIME NOT NULL,
    "completed_date" DATETIME,
    "completed_by" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "preventive_maintenances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "preventive_maintenances_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "preventive_maintenances_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "corrective_maintenances" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsible_id" TEXT NOT NULL,
    "priority" TEXT DEFAULT 'MEDIUM',
    "start_date" DATETIME NOT NULL,
    "end_date" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "estimated_cost" DECIMAL,
    "actual_cost" DECIMAL,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "corrective_maintenances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "corrective_maintenances_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "corrective_maintenances_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "occurrences" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "deadline" DATETIME NOT NULL,
    "resolved_at" DATETIME,
    "resolved_by" TEXT,
    "responsible_id" TEXT,
    "reported_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "occurrences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "occurrences_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "occurrences_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "occurrences_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "occurrence_photos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "occurrence_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "occurrence_photos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "occurrence_photos_occurrence_id_fkey" FOREIGN KEY ("occurrence_id") REFERENCES "occurrences" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "occurrence_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shift_handovers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_instance_id" TEXT NOT NULL,
    "outgoing_user_id" TEXT NOT NULL,
    "incoming_user_id" TEXT,
    "checklist_data" TEXT NOT NULL,
    "outgoing_observations" TEXT,
    "handover_at" DATETIME NOT NULL,
    "timeout_at" DATETIME NOT NULL,
    "incoming_observations" TEXT,
    "confirmed_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_handovers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shift_handovers_shift_instance_id_fkey" FOREIGN KEY ("shift_instance_id") REFERENCES "shift_instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shift_handovers_outgoing_user_id_fkey" FOREIGN KEY ("outgoing_user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shift_handovers_incoming_user_id_fkey" FOREIGN KEY ("incoming_user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "ip_address" TEXT,
    "justification" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "quality_parameters_tenant_id_is_active_idx" ON "quality_parameters"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "quality_parameters_created_at_idx" ON "quality_parameters"("created_at");

-- CreateIndex
CREATE INDEX "parameter_history_parameter_id_changed_at_idx" ON "parameter_history"("parameter_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_methods_tenant_id_name_key" ON "analysis_methods"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_categories_tenant_id_name_key" ON "equipment_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "collection_points_tenant_id_idx" ON "collection_points"("tenant_id");

-- CreateIndex
CREATE INDEX "shifts_tenant_id_idx" ON "shifts"("tenant_id");

-- CreateIndex
CREATE INDEX "equipment_tenant_id_category_id_idx" ON "equipment"("tenant_id", "category_id");

-- CreateIndex
CREATE INDEX "shift_instances_tenant_id_shift_id_date_idx" ON "shift_instances"("tenant_id", "shift_id", "date");

-- CreateIndex
CREATE INDEX "shift_instances_opened_by_idx" ON "shift_instances"("opened_by");

-- CreateIndex
CREATE INDEX "readings_tenant_id_recorded_at_idx" ON "readings"("tenant_id", "recorded_at");

-- CreateIndex
CREATE INDEX "readings_collection_point_id_idx" ON "readings"("collection_point_id");

-- CreateIndex
CREATE INDEX "readings_parameter_id_idx" ON "readings"("parameter_id");

-- CreateIndex
CREATE INDEX "readings_shift_instance_id_idx" ON "readings"("shift_instance_id");

-- CreateIndex
CREATE INDEX "readings_tenant_id_is_non_conformant_created_at_idx" ON "readings"("tenant_id", "is_non_conformant", "created_at");

-- CreateIndex
CREATE INDEX "analyses_tenant_id_parameter_id_collected_at_idx" ON "analyses"("tenant_id", "parameter_id", "collected_at");

-- CreateIndex
CREATE INDEX "analyses_tenant_id_is_non_conformant_approved_by_idx" ON "analyses"("tenant_id", "is_non_conformant", "approved_by");

-- CreateIndex
CREATE INDEX "analyses_collection_point_id_idx" ON "analyses"("collection_point_id");

-- CreateIndex
CREATE INDEX "analyses_recorded_by_idx" ON "analyses"("recorded_by");

-- CreateIndex
CREATE INDEX "analyses_collected_at_idx" ON "analyses"("collected_at");

-- CreateIndex
CREATE INDEX "preventive_maintenances_equipment_id_scheduled_date_status_idx" ON "preventive_maintenances"("equipment_id", "scheduled_date", "status");

-- CreateIndex
CREATE INDEX "preventive_maintenances_tenant_id_status_idx" ON "preventive_maintenances"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "corrective_maintenances_equipment_id_status_idx" ON "corrective_maintenances"("equipment_id", "status");

-- CreateIndex
CREATE INDEX "corrective_maintenances_tenant_id_priority_status_idx" ON "corrective_maintenances"("tenant_id", "priority", "status");

-- CreateIndex
CREATE INDEX "occurrences_tenant_id_severity_status_idx" ON "occurrences"("tenant_id", "severity", "status");

-- CreateIndex
CREATE INDEX "occurrences_deadline_idx" ON "occurrences"("deadline");

-- CreateIndex
CREATE INDEX "occurrences_reported_by_idx" ON "occurrences"("reported_by");

-- CreateIndex
CREATE INDEX "occurrence_photos_occurrence_id_idx" ON "occurrence_photos"("occurrence_id");

-- CreateIndex
CREATE UNIQUE INDEX "shift_handovers_shift_instance_id_key" ON "shift_handovers"("shift_instance_id");

-- CreateIndex
CREATE INDEX "shift_handovers_status_timeout_at_idx" ON "shift_handovers"("status", "timeout_at");

-- CreateIndex
CREATE INDEX "audit_logs_table_name_record_id_idx" ON "audit_logs"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");
