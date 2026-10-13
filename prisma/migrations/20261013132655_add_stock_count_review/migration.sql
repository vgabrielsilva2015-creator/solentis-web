-- AlterTable
ALTER TABLE "chemical_stock_counts" ADD COLUMN     "review_reason" TEXT,
ADD COLUMN     "review_status" TEXT NOT NULL DEFAULT 'APPLIED',
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT;

-- CreateIndex
CREATE INDEX "chemical_stock_counts_tenant_id_review_status_idx" ON "chemical_stock_counts"("tenant_id", "review_status");
