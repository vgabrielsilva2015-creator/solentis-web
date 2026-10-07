# SECRETS — inventário e rotação

Documento da T-08. **Nenhum valor de segredo aparece aqui nem em nenhum outro arquivo do repositório.** Os valores vivem só nas variáveis de ambiente da Vercel, no `.env` local (ignorado pelo Git) e num gerenciador de senhas.

## 1. Quando rotacionar
- **Agora, uma vez:** depois da auditoria de out/2026. O `.env` local foi copiado para máquinas de trabalho e o token do GitHub já apareceu no `git remote`.
- Sempre que alguém com acesso sair do projeto.
- Sempre que um segredo aparecer em log, print, chat, commit ou e-mail.
- Rotina: a cada 12 meses.

## 2. Inventário
Lista tirada do código (`process.env.*`), e não de memória.

| Segredo | Onde é usado | Efeito de rotacionar | Como rotacionar |
|---|---|---|---|
| `AUTH_SECRET` (ou `NEXTAUTH_SECRET`) | assina o JWT da sessão | **todos são deslogados** uma vez | `openssl rand -base64 32` → Vercel (Production) → redeploy |
| Senha do banco (`DATABASE_URL`, `DIRECT_URL`) | Prisma, pg_dump | o app cai até as duas variáveis serem atualizadas | Supabase → Settings → Database → Reset password → atualizar as **duas** URLs na Vercel → redeploy. Fazer fora do horário de turno. |
| `CRON_SECRET` | `/api/cron/shifts` | nenhum (a Vercel manda o novo valor sozinha) | gerar um novo → Vercel → redeploy |
| `RESEND_API_KEY` | e-mails de reset e convite | nenhum | Resend → API Keys → criar nova → Vercel → redeploy → **revogar a antiga** |
| `BLOB_READ_WRITE_TOKEN` | uploads | nenhum | Vercel → Storage → Blob → regenerar o token (ou reconectar o store) → redeploy |
| `GEMINI_API_KEY` | importação de laudos | nenhum | Google AI Studio → nova chave → Vercel → redeploy → apagar a antiga |
| `VAPID_PRIVATE_KEY` + `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | push | **as inscrições de push atuais param**; cada usuário precisa reativar as notificações | `npx web-push generate-vapid-keys` → as duas na Vercel → redeploy. Só rotacionar se houver suspeita de vazamento. |
| `WHATSAPP_TOKEN` | alerta de ocorrência | nenhum | Meta for Developers → novo token → Vercel → redeploy |
| Token do GitHub (antigo, do `git remote`) | — | nenhum | GitHub → Settings → Developer settings → Tokens → **revogar**. Conferir que o `git remote -v` local não tem mais token na URL. |
| Códigos de recuperação (`docs/recovery-codes.txt`) | 2FA de alguma conta | — | ver seção 4 |

O `NEXTAUTH_URL` e o `EMAIL_FROM` não são segredos.

## 3. Ordem recomendada (rotação pós-auditoria)
1. Revogar o token antigo do GitHub. Não afeta o app.
2. `RESEND_API_KEY`, `GEMINI_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `CRON_SECRET`, `WHATSAPP_TOKEN`: trocar todos na Vercel e fazer **um** redeploy.
3. Fora do horário de turno: senha do banco + `AUTH_SECRET`, com um redeploy. Todos entram de novo uma vez.
4. Atualizar o `.env` local com os valores novos, sem colar em chat ou ticket.
5. Marcar o item 1.14 e a seção 3 do `PRODUCTION-CHECKLIST.md`.

## 4. `docs/recovery-codes.txt`
- O arquivo existe só na máquina local e **não** está no Git. Desde a T-08 ele está no `.gitignore` (`docs/recovery-codes.txt` e `*recovery-codes*`), para nunca ser commitado por acidente (`git add .`).
- O conteúdo **não foi lido** na auditoria.
- **Não apague antes de ter cópia segura.** Os códigos de recuperação são a saída de emergência de uma conta com 2FA. O caminho é:
  1. Copiar os códigos para um gerenciador de senhas (Bitwarden, 1Password ou o do navegador, com senha mestra).
  2. Conferir que a cópia abre.
  3. Só então apagar o arquivo da pasta do projeto.
- Se suspeitar que o arquivo foi exposto, gere códigos novos na conta correspondente. Isso invalida os antigos.

## 5. Proteções automáticas
- `.gitignore`: `.env*` (menos `.env.example`), códigos de recuperação, `*.pem`, `*.key`, `*.dump`, `backups/`.
- Teste `src/lib/__tests__/secrets-hygiene.test.ts`, que roda no CI. Ele falha se algum arquivo **versionado**:
  - for `.env` real, dump, chave privada ou códigos de recuperação;
  - contiver o formato de chave real de Resend, Google, GitHub, Vercel Blob, Stripe, chave privada PEM ou URL de Postgres com senha.

  Exemplos com `USER:PASSWORD` são permitidos.
- Logger com mascaramento (`src/lib/logger.ts`): campos `password`, `token`, `secret`, `authorization` e `cookie` viram `[REDACTED]`.
