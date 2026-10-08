# IMPLEMENTATION-T07 — Infraestrutura: planos, pooling, backup e restore

**Branch:** `fix/t07-infra-docs` (sobre `fix/t06-session-revalidation`)
**Commit:** `20e71f7` — `docs(infra): document plans, pooling, backups and restore drill`

## Objetivo
Documentar o que a produção precisa ter: Vercel Pro, Supabase Pro, PITR, backup, restore, `connection_limit` e `pool_timeout`. Deixar também um jeito de provar que o restore funciona.

## Problema original
- Não havia documento de infraestrutura de produção.
- O RUNBOOK ainda ensinava backup e restore do **SQLite** (`Copy-Item dev.db`), e o `scripts/backup.ts` copia um arquivo `dev.db` que não existe em produção.
- Não há registro de que algum restore tenha sido testado. O `.env` local não tem `connection_limit`.

## Causa raiz
RC-7: a operação ainda é de protótipo, e a documentação parou na fase SQLite.

## Alterações realizadas
- **`docs/INFRA.md` (novo)**:
  - **Planos.** Vercel **Pro**: as regras da Vercel restringem o Hobby a uso pessoal e não comercial. Supabase **Pro + compute Small + PITR 7 dias**: o Free pausa após 1 semana sem uso e não tem backup automático.
  - **Pooling.** Função de cada parâmetro (`pgbouncer=true`, `connection_limit=1`, `pool_timeout=20`), uso restrito da `DIRECT_URL` e teto de conexões por tamanho de compute.
  - **Backup em 3 camadas.** PITR, backup diário e `pg_dump` semanal guardado fora do Supabase. Fica explícito que fotos e PDFs (Vercel Blob) **não** entram em backup nenhum.
  - **Restore.** Teste trimestral sempre num projeto separado, procedimento de incidente, metas de RPO e RTO, e tabela de registro dos testes.
- **`scripts/ops/compare-row-counts.sh` (novo)**: compara a contagem exata de linhas de todas as tabelas entre a origem e o restore. É somente leitura e devolve código 1 quando há diferença.
- **`docs/RUNBOOK.md` §2**: os procedimentos do SQLite foram trocados pelos de Postgres, com aviso explícito contra `migrate reset` e `db push` em produção.
- `PRODUCTION-CHECKLIST.md` passa a apontar para `INFRA.md`. O `.gitignore` passa a ignorar `*.dump`.

## Arquivos modificados
`docs/INFRA.md` (novo), `scripts/ops/compare-row-counts.sh` (novo), `docs/RUNBOOK.md`, `PRODUCTION-CHECKLIST.md`, `.gitignore`.

## Testes executados
| Verificação | Resultado |
|---|---|
| Teste de restore **local** (`pg_dump -Fc` → `pg_restore` num banco novo → `compare-row-counts.sh`) | dump de 133 KB em 0,2 s, restore em 0,4 s, contagens idênticas, exit 0 |
| Negativo: linhas apagadas no restore | `login_attempts 4 → 0 DIFERENTE`, exit 1 |
| `bash -n` do script | ok |
| Fatos de plano | conferidos na documentação pública da Vercel e do Supabase em 07/10/2026 (fontes abaixo) |

Não houve mudança de código, então `vitest`, `tsc`, `lint` e `build` ficaram iguais aos da T-06.

## Resultado
O dono da conta tem um roteiro para saber o que contratar, o que configurar e como testar o restore. O teste local validou o **procedimento e o script**, mas **não** os backups de produção: esses continuam ❓ NÃO VERIFICADOS.

## Riscos
- Os arquivos do Blob não têm cópia. Se forem apagados, não há como recuperar até a T-26.
- Se a produção ainda estiver no Supabase Free, pode pausar e não tem backup automático. É o risco operacional mais alto que depende de você.

## Rollback
`git revert 20e71f7` (só documentação e script).

## Pendências (dependem de você)
1. Confirmar os planos e ativar o PITR (checklist 1.11, 1.13 e 2.1).
2. Corrigir a `DATABASE_URL` da Vercel com `connection_limit=1&pool_timeout=20`.
3. Fazer o primeiro teste de restore real (INFRA §4.1) e registrar na tabela §4.3.
4. Começar o dump semanal fora do Supabase.

## Fontes
- [Vercel — Hobby plan](https://vercel.com/docs/plans/hobby)
- [Vercel — Fair use guidelines](https://vercel.com/docs/limits/fair-use-policy)
- [Supabase — Database Backups](https://supabase.com/docs/guides/platform/backups.md)
- [Supabase — Pricing](https://supabase.com/pricing.md)
