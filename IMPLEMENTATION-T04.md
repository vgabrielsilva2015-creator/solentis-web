# IMPLEMENTATION-T04 — Verificação de produção

**Branch:** `fix/t04-production-checklist` (sobre `fix/t03-login-errors`)
**Commit:** `545a342` — `docs(ops): add production verification checklist and read-only checks`

## Objetivo
Responder o que está de fato configurado em produção: contas padrão, SUPER_ADMIN, unique de e-mail, índices, RLS, backups/PITR, planos e variáveis de ambiente.

## Problema original
A Passada 1 deixou como **NÃO VERIFICADO** tudo o que depende de produção (P-07, P-09 e as seções 10 e 19).

## Causa raiz
RC-7: a operação ainda é de protótipo. Não existe checklist de produção nem um jeito seguro e documentado de inspecionar o banco real.

## Alterações realizadas
- **`PRODUCTION-CHECKLIST.md`** (raiz do repositório): 33 itens em banco, Vercel, variáveis de ambiente e serviços externos, cada um com como verificar, o esperado e o estado.
  - A tabela de variáveis foi montada a partir do código, com todos os `process.env.*` usados de verdade.
- **`scripts/ops/production-readonly-checks.sql`**: 9 consultas **somente leitura**. Não imprimem hash nem token. Conferi a sintaxe no banco local: todas executam (a de `_prisma_migrations` só existe em produção).

## Verificação executada
**Nenhum item de produção foi verificado.** Não houve acesso ao painel da Vercel, ao painel do Supabase nem ao banco, e o domínio `solentis.app` estava bloqueado na rede usada.

Também decidi não conectar no banco usando a `DATABASE_URL` do seu `.env` local. Não dá para saber se ela é de produção, e a regra é não usar credenciais de produção em testes locais.

Todos os itens estão como ❓ NÃO VERIFICADO, o que segue a regra de não inventar resultado.

O que foi conferido sem acesso externo está na seção 5 do checklist. O `.env` local aponta para um pooler Supabase **sem** `connection_limit`, e por isso os scripts locais não devem ser rodados até confirmar qual banco é.

## Arquivos modificados
`PRODUCTION-CHECKLIST.md` (novo) e `scripts/ops/production-readonly-checks.sql` (novo).

## Testes
Não se aplica a código. O SQL foi executado num banco local para validar a sintaxe.

## Resultado
O roteiro está pronto para você executar em cerca de 20 minutos (SQL Editor + painéis).

## Riscos
Enquanto o checklist não for preenchido, continua aberta a possibilidade de existirem contas com senha padrão em produção (P-09), que é o risco mais grave sem verificação.

## Rollback
`git revert 545a342` (só documentação).

## Pendências (dependem de você)
1. Rodar o SQL e preencher a seção "Resultados".
2. Se as consultas 1 ou 2 retornarem contas padrão: desativar ou resetar a senha **pela interface**, sem testar login com a senha padrão.
3. Conferir os painéis da Vercel e do Supabase listados.
