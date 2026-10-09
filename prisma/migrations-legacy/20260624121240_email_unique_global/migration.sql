-- DropIndex
DROP INDEX "maintenance_days_date_key";

-- AlterTable
ALTER TABLE "occurrence_severity_defaults" DROP CONSTRAINT "occurrence_severity_defaults_pkey",
ADD COLUMN     "tenant_id" TEXT NOT NULL,
ADD CONSTRAINT "occurrence_severity_defaults_pkey" PRIMARY KEY ("tenant_id", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "maintenance_days_tenant_id_date_key" ON "maintenance_days"("tenant_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "occurrence_severity_defaults" ADD CONSTRAINT "occurrence_severity_defaults_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
