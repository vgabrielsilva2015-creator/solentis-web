-- T-10 — contadores de tentativa de login e de pedido de redefinição de senha.
-- Tabela nova, sem relação com dados de negócio. Aditiva.

-- CreateTable
CREATE TABLE "auth_rate_events" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_rate_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auth_rate_events_bucket_created_at_idx" ON "auth_rate_events"("bucket", "created_at");

-- CreateIndex
CREATE INDEX "auth_rate_events_created_at_idx" ON "auth_rate_events"("created_at");
