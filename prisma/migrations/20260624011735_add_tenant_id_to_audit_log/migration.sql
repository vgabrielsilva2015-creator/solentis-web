-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip_address" TEXT,
    "success" BOOLEAN NOT NULL,
    "attempted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quality_parameters" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "min_limit" DOUBLE PRECISION,
    "max_limit" DOUBLE PRECISION,
    "legal_reference" TEXT,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT NOT NULL,
    "default_method_id" TEXT,

    CONSTRAINT "quality_parameters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_limits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "parameter_id" TEXT NOT NULL,
    "matrix" TEXT NOT NULL,
    "min_limit" DOUBLE PRECISION,
    "max_limit" DOUBLE PRECISION,
    "rule_type" TEXT NOT NULL DEFAULT 'TETO',
    "legal_reference" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parameter_limits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_history" (
    "id" TEXT NOT NULL,
    "parameter_id" TEXT NOT NULL,
    "min_limit_before" DOUBLE PRECISION,
    "max_limit_before" DOUBLE PRECISION,
    "min_limit_after" DOUBLE PRECISION,
    "max_limit_after" DOUBLE PRECISION,
    "effective_date_before" TIMESTAMP(3),
    "effective_date_after" TIMESTAMP(3) NOT NULL,
    "changed_by" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "parameter_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parameter_aliases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "parameter_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "parameter_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_methods" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pop_content" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_categories" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_points" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "matrix" TEXT,
    "location" TEXT,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_field" BOOLEAN NOT NULL DEFAULT true,
    "is_internal" BOOLEAN NOT NULL DEFAULT true,
    "is_external" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "crosses_midnight" BOOLEAN NOT NULL DEFAULT false,
    "handover_timeout_minutes" INTEGER NOT NULL DEFAULT 120,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_schedules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "days_of_week" INTEGER[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occurrence_severity_defaults" (
    "severity" TEXT NOT NULL,
    "deadline_hours" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" TEXT NOT NULL,

    CONSTRAINT "occurrence_severity_defaults_pkey" PRIMARY KEY ("severity")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "serial_number" TEXT,
    "location" TEXT,
    "installation_date" TIMESTAMP(3),
    "preventive_frequency_days" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "manufacturer" TEXT,
    "model_name" TEXT,
    "manual_url" TEXT,
    "photo_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPERATING',
    "responsible_id" TEXT,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_instances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "opened_by" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "readings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "collection_point_id" TEXT NOT NULL,
    "parameter_id" TEXT,
    "shift_instance_id" TEXT,
    "value" DOUBLE PRECISION,
    "raw_value" TEXT,
    "is_detected" BOOLEAN NOT NULL DEFAULT true,
    "unit" TEXT,
    "notes" TEXT,
    "is_non_conformant" BOOLEAN,
    "origin" TEXT NOT NULL DEFAULT 'MANUAL',
    "metadata_origin" TEXT,
    "recorded_by" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "collection_point_id" TEXT NOT NULL,
    "parameter_id" TEXT NOT NULL,
    "method_id" TEXT,
    "value" DOUBLE PRECISION,
    "raw_value" TEXT,
    "is_detected" BOOLEAN NOT NULL DEFAULT true,
    "unit" TEXT NOT NULL,
    "min_limit_applied" DOUBLE PRECISION,
    "max_limit_applied" DOUBLE PRECISION,
    "report_text" TEXT,
    "laboratory_type" TEXT NOT NULL DEFAULT 'INTERNAL',
    "is_non_conformant" BOOLEAN NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "origin" TEXT NOT NULL DEFAULT 'MANUAL',
    "metadata_origin" TEXT,
    "collected_at" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "external_analyses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "collection_point_id" TEXT NOT NULL,
    "parameter_id" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "raw_value" TEXT,
    "is_detected" BOOLEAN NOT NULL DEFAULT true,
    "unit" TEXT NOT NULL,
    "min_limit_applied" DOUBLE PRECISION,
    "max_limit_applied" DOUBLE PRECISION,
    "report_text" TEXT,
    "laboratory_name" TEXT,
    "laudo_number" TEXT,
    "is_non_conformant" BOOLEAN,
    "status" TEXT NOT NULL DEFAULT 'PENDING_LAB',
    "origin" TEXT NOT NULL DEFAULT 'MANUAL',
    "collected_at" TIMESTAMP(3) NOT NULL,
    "collected_by" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "external_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_schedules" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "collection_point_id" TEXT NOT NULL,
    "parameter_id" TEXT NOT NULL,
    "executor_role" TEXT NOT NULL,
    "sample_type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "days_of_week" INTEGER[],
    "days_of_month" INTEGER[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT NOT NULL,

    CONSTRAINT "monitoring_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preventive_maintenances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "scheduled_date" TIMESTAMP(3) NOT NULL,
    "completed_date" TIMESTAMP(3),
    "completed_by" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "preventive_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corrective_maintenances" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "responsible_id" TEXT NOT NULL,
    "priority" TEXT DEFAULT 'MEDIUM',
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "estimated_cost" DECIMAL(65,30),
    "actual_cost" DECIMAL(65,30),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "deadline" TIMESTAMP(3),

    CONSTRAINT "corrective_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occurrences" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT,
    "type" TEXT,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "deadline" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "resolved_by" TEXT,
    "resolution_notes" TEXT,
    "responsible_id" TEXT,
    "reported_by" TEXT NOT NULL,
    "collection_point_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "immediate_action" TEXT,

    CONSTRAINT "occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occurrence_photos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "occurrence_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occurrence_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_handovers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "shift_instance_id" TEXT NOT NULL,
    "outgoing_user_id" TEXT NOT NULL,
    "incoming_user_id" TEXT,
    "checklist_data" TEXT NOT NULL,
    "outgoing_observations" TEXT,
    "handover_at" TIMESTAMP(3) NOT NULL,
    "timeout_at" TIMESTAMP(3) NOT NULL,
    "incoming_observations" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_handovers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_tasks" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "shift_instance_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "completed_by" TEXT,
    "completion_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "shift_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_task_photos" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shift_task_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemical_products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "min_stock" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chemical_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemical_stock_entries" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "supplier" TEXT,
    "invoice_number" TEXT,
    "notes" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chemical_stock_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemical_stock_exits" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "used_at" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chemical_stock_exits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chemical_stock_counts" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "counted_quantity" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "counted_at" TIMESTAMP(3) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chemical_stock_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT,
    "table_name" TEXT NOT NULL,
    "record_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "before" TEXT,
    "after" TEXT,
    "ip_address" TEXT,
    "justification" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "logged_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "parts_replaced" TEXT,
    "cost" DECIMAL(65,30),
    "performed_by" TEXT NOT NULL,
    "next_maintenance_date" TIMESTAMP(3),
    "attachment_url" TEXT,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occurrence_comments" (
    "id" TEXT NOT NULL,
    "occurrence_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "occurrence_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_scales" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "operator_id" TEXT NOT NULL,

    CONSTRAINT "shift_scales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_days" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_CollectionPointToQualityParameter" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenant_id_role_is_active_idx" ON "users"("tenant_id", "role", "is_active");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE INDEX "login_attempts_tenant_id_email_attempted_at_idx" ON "login_attempts"("tenant_id", "email", "attempted_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "quality_parameters_tenant_id_is_active_idx" ON "quality_parameters"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "quality_parameters_created_at_idx" ON "quality_parameters"("created_at");

-- CreateIndex
CREATE INDEX "parameter_limits_tenant_id_matrix_idx" ON "parameter_limits"("tenant_id", "matrix");

-- CreateIndex
CREATE UNIQUE INDEX "parameter_limits_tenant_id_parameter_id_matrix_legal_refere_key" ON "parameter_limits"("tenant_id", "parameter_id", "matrix", "legal_reference");

-- CreateIndex
CREATE INDEX "parameter_history_parameter_id_changed_at_idx" ON "parameter_history"("parameter_id", "changed_at");

-- CreateIndex
CREATE UNIQUE INDEX "parameter_aliases_tenant_id_alias_key" ON "parameter_aliases"("tenant_id", "alias");

-- CreateIndex
CREATE UNIQUE INDEX "analysis_methods_tenant_id_name_key" ON "analysis_methods"("tenant_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_categories_tenant_id_name_key" ON "equipment_categories"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "collection_points_tenant_id_idx" ON "collection_points"("tenant_id");

-- CreateIndex
CREATE INDEX "shifts_tenant_id_idx" ON "shifts"("tenant_id");

-- CreateIndex
CREATE INDEX "shift_schedules_tenant_id_idx" ON "shift_schedules"("tenant_id");

-- CreateIndex
CREATE INDEX "shift_schedules_shift_id_is_active_idx" ON "shift_schedules"("shift_id", "is_active");

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
CREATE INDEX "external_analyses_tenant_id_parameter_id_collected_at_idx" ON "external_analyses"("tenant_id", "parameter_id", "collected_at");

-- CreateIndex
CREATE INDEX "external_analyses_collection_point_id_idx" ON "external_analyses"("collection_point_id");

-- CreateIndex
CREATE INDEX "external_analyses_status_idx" ON "external_analyses"("status");

-- CreateIndex
CREATE INDEX "monitoring_schedules_tenant_id_executor_role_is_active_idx" ON "monitoring_schedules"("tenant_id", "executor_role", "is_active");

-- CreateIndex
CREATE INDEX "monitoring_schedules_collection_point_id_idx" ON "monitoring_schedules"("collection_point_id");

-- CreateIndex
CREATE INDEX "monitoring_schedules_parameter_id_idx" ON "monitoring_schedules"("parameter_id");

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
CREATE INDEX "shift_tasks_shift_instance_id_status_idx" ON "shift_tasks"("shift_instance_id", "status");

-- CreateIndex
CREATE INDEX "shift_tasks_tenant_id_assigned_to_id_status_idx" ON "shift_tasks"("tenant_id", "assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "shift_task_photos_task_id_idx" ON "shift_task_photos"("task_id");

-- CreateIndex
CREATE INDEX "chemical_products_tenant_id_is_active_idx" ON "chemical_products"("tenant_id", "is_active");

-- CreateIndex
CREATE INDEX "chemical_stock_entries_tenant_id_product_id_received_at_idx" ON "chemical_stock_entries"("tenant_id", "product_id", "received_at");

-- CreateIndex
CREATE INDEX "chemical_stock_exits_tenant_id_product_id_used_at_idx" ON "chemical_stock_exits"("tenant_id", "product_id", "used_at");

-- CreateIndex
CREATE INDEX "chemical_stock_counts_tenant_id_product_id_counted_at_idx" ON "chemical_stock_counts"("tenant_id", "product_id", "counted_at");

-- CreateIndex
CREATE INDEX "audit_logs_tenant_id_timestamp_idx" ON "audit_logs"("tenant_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_table_name_record_id_idx" ON "audit_logs"("table_name", "record_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_timestamp_idx" ON "audit_logs"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "shift_scales_tenant_id_date_shift_id_operator_id_key" ON "shift_scales"("tenant_id", "date", "shift_id", "operator_id");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_days_date_key" ON "maintenance_days"("date");

-- CreateIndex
CREATE UNIQUE INDEX "_CollectionPointToQualityParameter_AB_unique" ON "_CollectionPointToQualityParameter"("A", "B");

-- CreateIndex
CREATE INDEX "_CollectionPointToQualityParameter_B_index" ON "_CollectionPointToQualityParameter"("B");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_attempts" ADD CONSTRAINT "login_attempts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_parameters" ADD CONSTRAINT "quality_parameters_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_parameters" ADD CONSTRAINT "quality_parameters_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quality_parameters" ADD CONSTRAINT "quality_parameters_default_method_id_fkey" FOREIGN KEY ("default_method_id") REFERENCES "analysis_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_limits" ADD CONSTRAINT "parameter_limits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_limits" ADD CONSTRAINT "parameter_limits_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_history" ADD CONSTRAINT "parameter_history_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_history" ADD CONSTRAINT "parameter_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_aliases" ADD CONSTRAINT "parameter_aliases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parameter_aliases" ADD CONSTRAINT "parameter_aliases_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_methods" ADD CONSTRAINT "analysis_methods_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_categories" ADD CONSTRAINT "equipment_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_points" ADD CONSTRAINT "collection_points_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_schedules" ADD CONSTRAINT "shift_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_schedules" ADD CONSTRAINT "shift_schedules_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrence_severity_defaults" ADD CONSTRAINT "occurrence_severity_defaults_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "equipment_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_instances" ADD CONSTRAINT "shift_instances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_instances" ADD CONSTRAINT "shift_instances_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_instances" ADD CONSTRAINT "shift_instances_opened_by_fkey" FOREIGN KEY ("opened_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_collection_point_id_fkey" FOREIGN KEY ("collection_point_id") REFERENCES "collection_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_shift_instance_id_fkey" FOREIGN KEY ("shift_instance_id") REFERENCES "shift_instances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "readings" ADD CONSTRAINT "readings_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_collection_point_id_fkey" FOREIGN KEY ("collection_point_id") REFERENCES "collection_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_method_id_fkey" FOREIGN KEY ("method_id") REFERENCES "analysis_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_analyses" ADD CONSTRAINT "external_analyses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_analyses" ADD CONSTRAINT "external_analyses_collection_point_id_fkey" FOREIGN KEY ("collection_point_id") REFERENCES "collection_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_analyses" ADD CONSTRAINT "external_analyses_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "external_analyses" ADD CONSTRAINT "external_analyses_collected_by_fkey" FOREIGN KEY ("collected_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_schedules" ADD CONSTRAINT "monitoring_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_schedules" ADD CONSTRAINT "monitoring_schedules_collection_point_id_fkey" FOREIGN KEY ("collection_point_id") REFERENCES "collection_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_schedules" ADD CONSTRAINT "monitoring_schedules_parameter_id_fkey" FOREIGN KEY ("parameter_id") REFERENCES "quality_parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_schedules" ADD CONSTRAINT "monitoring_schedules_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenances" ADD CONSTRAINT "preventive_maintenances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenances" ADD CONSTRAINT "preventive_maintenances_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preventive_maintenances" ADD CONSTRAINT "preventive_maintenances_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_maintenances" ADD CONSTRAINT "corrective_maintenances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_maintenances" ADD CONSTRAINT "corrective_maintenances_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corrective_maintenances" ADD CONSTRAINT "corrective_maintenances_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_reported_by_fkey" FOREIGN KEY ("reported_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_responsible_id_fkey" FOREIGN KEY ("responsible_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrences" ADD CONSTRAINT "occurrences_collection_point_id_fkey" FOREIGN KEY ("collection_point_id") REFERENCES "collection_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrence_photos" ADD CONSTRAINT "occurrence_photos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrence_photos" ADD CONSTRAINT "occurrence_photos_occurrence_id_fkey" FOREIGN KEY ("occurrence_id") REFERENCES "occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrence_photos" ADD CONSTRAINT "occurrence_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_shift_instance_id_fkey" FOREIGN KEY ("shift_instance_id") REFERENCES "shift_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_outgoing_user_id_fkey" FOREIGN KEY ("outgoing_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_handovers" ADD CONSTRAINT "shift_handovers_incoming_user_id_fkey" FOREIGN KEY ("incoming_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_tasks" ADD CONSTRAINT "shift_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_tasks" ADD CONSTRAINT "shift_tasks_shift_instance_id_fkey" FOREIGN KEY ("shift_instance_id") REFERENCES "shift_instances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_tasks" ADD CONSTRAINT "shift_tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_tasks" ADD CONSTRAINT "shift_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_tasks" ADD CONSTRAINT "shift_tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_task_photos" ADD CONSTRAINT "shift_task_photos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_task_photos" ADD CONSTRAINT "shift_task_photos_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "shift_tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_task_photos" ADD CONSTRAINT "shift_task_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_products" ADD CONSTRAINT "chemical_products_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_products" ADD CONSTRAINT "chemical_products_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_stock_entries" ADD CONSTRAINT "chemical_stock_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_stock_entries" ADD CONSTRAINT "chemical_stock_entries_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "chemical_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_stock_entries" ADD CONSTRAINT "chemical_stock_entries_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_stock_exits" ADD CONSTRAINT "chemical_stock_exits_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_stock_exits" ADD CONSTRAINT "chemical_stock_exits_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "chemical_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_stock_exits" ADD CONSTRAINT "chemical_stock_exits_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_stock_counts" ADD CONSTRAINT "chemical_stock_counts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_stock_counts" ADD CONSTRAINT "chemical_stock_counts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "chemical_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chemical_stock_counts" ADD CONSTRAINT "chemical_stock_counts_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrence_comments" ADD CONSTRAINT "occurrence_comments_occurrence_id_fkey" FOREIGN KEY ("occurrence_id") REFERENCES "occurrences"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occurrence_comments" ADD CONSTRAINT "occurrence_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_scales" ADD CONSTRAINT "shift_scales_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_scales" ADD CONSTRAINT "shift_scales_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_scales" ADD CONSTRAINT "shift_scales_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_days" ADD CONSTRAINT "maintenance_days_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CollectionPointToQualityParameter" ADD CONSTRAINT "_CollectionPointToQualityParameter_A_fkey" FOREIGN KEY ("A") REFERENCES "collection_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CollectionPointToQualityParameter" ADD CONSTRAINT "_CollectionPointToQualityParameter_B_fkey" FOREIGN KEY ("B") REFERENCES "quality_parameters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
