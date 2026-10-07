# PRODUCTION-CHECKLIST — Solentis

Checklist da T-04 (verificação de produção). **Nada aqui foi verificado por quem escreveu**: não houve acesso ao painel da Vercel, ao painel do Supabase nem ao banco de produção. O domínio `solentis.app` estava bloqueado pela rede usada na auditoria. Cada item está marcado como **NÃO VERIFICADO**, com o passo exato para conferir.

O que cada item deveria ser e por quê: `docs/INFRA.md` (T-07).

Legenda: ✅ ok · ❌ problema · ⚠️ ok com ressalva · ❓ NÃO VERIFICADO

> Regra: só consultas de leitura. Nada de `prisma migrate reset`, `db push` ou alteração de dados ao preencher este checklist.

## 1. Banco de produção (Supabase)

Rodar `scripts/ops/production-readonly-checks.sql` no SQL Editor do Supabase e colar os resultados na seção "Resultados" ao final.

| # | Item | Como verificar | Esperado | Estado |
|---|---|---|---|---|
| 1.1 | Contas padrão do seed (`admin@`, `tecnico@`, `operador@`, `manutencao@solentis.local`) | consulta 1 | inexistentes, desativadas ou com senha trocada (`updated_at` recente e `must_change_password = false` após troca real) | ❓ |
| 1.2 | SUPER_ADMIN padrão (`super@solentis.local`, senha fixa em `create-super.ts`) | consultas 1 e 2 | inexistente; SUPER_ADMIN só com e-mail real, fora do tenant de cliente | ❓ |
| 1.3 | Senhas padrão (`Admin@123`, `Tecnico@123`, `Operador@123`, `Manutencao@123`, `Super@123`, `admin123`) | **não testar login em produção** (trava a conta pelo rate limit). Se 1.1/1.2 existirem, resetar a senha pelo painel do gestor/super admin. | nenhuma conta com senha padrão | ❓ |
| 1.4 | Unique global de e-mail | consulta 3 | índice `users_email_key` presente; nenhum e-mail duplicado | ❓ |
| 1.5 | Índices de turno e de consultas | consulta 4 | 7 índices listados | ❓ |
| 1.6 | RLS | consulta 5 | `rowsecurity = true` em todas as tabelas (garantido pela migration da T-14; uma sessão anterior relatou já estar ligado, sem confirmação) | ❓ |
| 1.7 | Migrations registradas | consulta 6 | 4 migrations antigas (até a T-09 criar o baseline) | ❓ |
| 1.8 | Colunas aplicadas por fora das migrations | consulta 7 | 7 colunas + tabela `shift_task_templates` presentes | ❓ |
| 1.9 | Conexões | consulta 8 | uso bem abaixo do limite do plano | ❓ |
| 1.10 | Backups | Supabase → Database → Backups | backups diários ativos | ❓ |
| 1.11 | PITR | Supabase → Database → Backups → Point in Time | **ativo** (exige plano Pro + add-on) | ❓ |
| 1.12 | Restore testado | restaurar o backup mais recente em um projeto separado e abrir o app apontando para ele | restore feito, com data registrada | ❓ |
| 1.13 | Plano Supabase | Settings → Billing | Pro (o Free pausa por inatividade e não tem PITR) | ❓ |
| 1.14 | Senha do banco rotacionada após a auditoria | Settings → Database → Reset password (ver T-08) | sim | ❓ |

## 2. Vercel

| # | Item | Como verificar | Esperado | Estado |
|---|---|---|---|---|
| 2.1 | Plano | Settings → Billing | **Pro** (os termos do Hobby proíbem uso comercial) | ❓ |
| 2.2 | Projeto e branch de produção | Settings → Git | `main` → produção; previews por PR | ❓ |
| 2.3 | Região das functions | Settings → Functions | `gru1` (igual ao `vercel.json`) | ❓ |
| 2.4 | Cron `/api/cron/shifts` | Settings → Cron Jobs + Logs | registrado, execução diária ~00:05 BRT com status 200 | ❓ |
| 2.5 | Deploy em produção = commit esperado | Deployments | commit da `main` mais recente | ❓ |

## 3. Variáveis de ambiente (Vercel → Settings → Environment Variables, ambiente Production)

Variáveis que o código lê de fato (levantamento por `process.env.*` no código):

| Variável | Uso | Esperado | Estado |
|---|---|---|---|
| `DATABASE_URL` | Prisma (pooler 6543) | contém `pgbouncer=true&connection_limit=1&pool_timeout=20` | ❓ |
| `DIRECT_URL` | migrations (5432) | presente; usada só em `migrate deploy` | ❓ |
| `NEXTAUTH_SECRET` / `AUTH_SECRET` | assinatura da sessão | presente, ≥ 32 bytes aleatórios, **rotacionado** (T-08) | ❓ |
| `NEXTAUTH_URL` | links de e-mail (reset/convite) | `https://solentis.app` | ❓ |
| `CRON_SECRET` | proteção do cron | presente, rotacionado | ❓ |
| `RESEND_API_KEY` + `EMAIL_FROM` | e-mails de reset/convite | presentes; domínio verificado no Resend | ❓ |
| `BLOB_READ_WRITE_TOKEN` (ou Blob Store conectado) | uploads | Blob Store conectado ao projeto | ❓ |
| `GEMINI_API_KEY` | importação de laudos | presente, rotacionada | ❓ |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` | push | par válido | ❓ |
| `WHATSAPP_TOKEN` + `WHATSAPP_PHONE_ID` | alerta de ocorrência | presentes só se o recurso for usado | ❓ |
| `LOG_LEVEL` | nível de log | `info` (opcional) | ❓ |
| nenhuma outra `NEXT_PUBLIC_*` | — | só a chave VAPID pública | ❓ |

## 4. Serviços externos

| # | Item | Como verificar | Estado |
|---|---|---|---|
| 4.1 | Blob Store | Vercel → Storage → Blob: store existe, conectado, tamanho usado | ❓ |
| 4.2 | Resend | painel Resend: domínio verificado (SPF/DKIM), envios recentes sem erro | ❓ |
| 4.3 | VAPID | enviar um push de teste a um gestor | ❓ |
| 4.4 | Token antigo do GitHub (já apareceu no `git remote`) | GitHub → Settings → Developer settings → Tokens: revogado | ❓ |

## 5. O que já foi conferido sem acesso externo

| Item | Resultado |
|---|---|
| `.env` local aponta para um pooler Supabase `sa-east-1` (porta 6543, `pgbouncer=true`, **sem** `connection_limit`) | ⚠️ não dá para saber se é o mesmo projeto de produção; scripts locais (`create-super.ts`, seeds, `normalize-emails.js`) **não devem ser rodados** até isso ser confirmado |
| `.vercel/project.json` local | projeto Vercel chamado `meu-projeto` |
| Segredos no histórico do Git | nenhum segredo real encontrado (Passada 1) |
| `docs/recovery-codes.txt` | fora do Git, mas não ignorado (corrigido na T-08) |

## Resultados

_(colar aqui a saída de `scripts/ops/production-readonly-checks.sql` e as conferências de painel, com data)_
