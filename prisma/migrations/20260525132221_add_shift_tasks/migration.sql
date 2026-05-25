-- CreateTable
CREATE TABLE "shift_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "shift_instance_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigned_to_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "completed_by" TEXT,
    "completion_notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "shift_tasks_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shift_tasks_shift_instance_id_fkey" FOREIGN KEY ("shift_instance_id") REFERENCES "shift_instances" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shift_tasks_assigned_to_id_fkey" FOREIGN KEY ("assigned_to_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "shift_tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shift_tasks_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shift_task_photos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "shift_task_photos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "shift_task_photos_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "shift_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "shift_task_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "shift_tasks_shift_instance_id_status_idx" ON "shift_tasks"("shift_instance_id", "status");

-- CreateIndex
CREATE INDEX "shift_tasks_tenant_id_assigned_to_id_status_idx" ON "shift_tasks"("tenant_id", "assigned_to_id", "status");

-- CreateIndex
CREATE INDEX "shift_task_photos_task_id_idx" ON "shift_task_photos"("task_id");
