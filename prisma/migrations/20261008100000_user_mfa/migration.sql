-- Fase 2 do Super Admin — segundo fator (TOTP) e códigos de recuperação.
-- Tabelas novas e vazias, sem alterar nenhuma tabela existente.
-- RLS ligado aqui mesmo, porque as tabelas nascem depois da migration de RLS deny-all da T-14.

-- CreateTable
CREATE TABLE "user_mfa" (
    "user_id" TEXT NOT NULL,
    "secret_enc" TEXT NOT NULL,
    "key_version" INTEGER NOT NULL DEFAULT 1,
    "enabled_at" TIMESTAMP(3),
    "last_step" BIGINT NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_mfa_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "mfa_recovery_codes" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mfa_recovery_codes_user_id_idx" ON "mfa_recovery_codes"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_recovery_codes_user_id_code_hash_key" ON "mfa_recovery_codes"("user_id", "code_hash");

-- AddForeignKey
ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mfa_recovery_codes" ADD CONSTRAINT "mfa_recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS deny-all (sem policy e sem FORCE), como as demais tabelas
ALTER TABLE "user_mfa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "mfa_recovery_codes" ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE papel TEXT;
BEGIN
  FOREACH papel IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = papel) THEN
      EXECUTE format('REVOKE ALL ON TABLE public."user_mfa" FROM %I', papel);
      EXECUTE format('REVOKE ALL ON TABLE public."mfa_recovery_codes" FROM %I', papel);
    END IF;
  END LOOP;
END $$;
