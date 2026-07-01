-- Onda de Templates de Tarefa (aditivo — não altera dados existentes)
-- Aplicado via `prisma db execute`. Idempotente.

-- 1) Novos campos em shift_tasks (nullable / com default → seguros)
ALTER TABLE "shift_tasks" ADD COLUMN IF NOT EXISTS "template_id" TEXT;
ALTER TABLE "shift_tasks" ADD COLUMN IF NOT EXISTS "requires_photo" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "shift_tasks" ADD COLUMN IF NOT EXISTS "repeated_from_id" TEXT;
ALTER TABLE "shift_tasks" ADD COLUMN IF NOT EXISTS "repeat_reason" TEXT;

-- 2) Nova tabela shift_task_templates
CREATE TABLE IF NOT EXISTS "shift_task_templates" (
  "id"             TEXT NOT NULL,
  "tenant_id"      TEXT NOT NULL,
  "shift_id"       TEXT NOT NULL,
  "title"          TEXT NOT NULL,
  "description"    TEXT,
  "requires_photo" BOOLEAN NOT NULL DEFAULT false,
  "assigned_to_id" TEXT,
  "is_active"      BOOLEAN NOT NULL DEFAULT true,
  "sort_order"     INTEGER NOT NULL DEFAULT 0,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"     TEXT NOT NULL,
  CONSTRAINT "shift_task_templates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "shift_task_templates_tenant_id_shift_id_is_active_idx"
  ON "shift_task_templates" ("tenant_id", "shift_id", "is_active");

-- 3) Foreign keys (envolvidas em DO block p/ idempotência)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_task_templates_tenant_id_fkey') THEN
    ALTER TABLE "shift_task_templates" ADD CONSTRAINT "shift_task_templates_tenant_id_fkey"
      FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_task_templates_shift_id_fkey') THEN
    ALTER TABLE "shift_task_templates" ADD CONSTRAINT "shift_task_templates_shift_id_fkey"
      FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_task_templates_assigned_to_id_fkey') THEN
    ALTER TABLE "shift_task_templates" ADD CONSTRAINT "shift_task_templates_assigned_to_id_fkey"
      FOREIGN KEY ("assigned_to_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_task_templates_created_by_fkey') THEN
    ALTER TABLE "shift_task_templates" ADD CONSTRAINT "shift_task_templates_created_by_fkey"
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_tasks_template_id_fkey') THEN
    ALTER TABLE "shift_tasks" ADD CONSTRAINT "shift_tasks_template_id_fkey"
      FOREIGN KEY ("template_id") REFERENCES "shift_task_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'shift_tasks_repeated_from_id_fkey') THEN
    ALTER TABLE "shift_tasks" ADD CONSTRAINT "shift_tasks_repeated_from_id_fkey"
      FOREIGN KEY ("repeated_from_id") REFERENCES "shift_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
