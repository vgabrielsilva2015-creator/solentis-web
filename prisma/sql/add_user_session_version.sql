-- T-06 — versão da sessão do usuário (aditivo, seguro para rodar várias vezes).
--
-- Incrementada quando o acesso do usuário muda (desativação, troca de papel ou
-- e-mail, reset ou troca de senha). A sessão JWT guarda a versão do login e é
-- encerrada na próxima revalidação (até 60 s) se a versão no banco for outra.
--
-- ORDEM DE DEPLOY: rodar este SQL ANTES de publicar o código da T-06. O código
-- novo lê a coluna em toda revalidação de sessão e no login.
-- Rollback: a coluna pode ficar (o código antigo a ignora). Para remover:
--   ALTER TABLE "users" DROP COLUMN IF EXISTS "session_version";

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_version" INTEGER NOT NULL DEFAULT 0;
