-- Sessões encerradas pelo "Sair": o sid do JWT encerrado fica aqui até expirar.
-- Tabela nova, aditiva, com RLS ligado (regra da T-14).

-- CreateTable
CREATE TABLE "revoked_sessions" (
    "sid" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revoked_sessions_pkey" PRIMARY KEY ("sid")
);

-- CreateIndex
CREATE INDEX "revoked_sessions_expires_at_idx" ON "revoked_sessions"("expires_at");

ALTER TABLE "revoked_sessions" ENABLE ROW LEVEL SECURITY;
