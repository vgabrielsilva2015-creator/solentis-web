# Plano de RLS (Row-Level Security) — Solentis

**Status:** RASCUNHO para revisão. Nada aplicado em produção.
**Artefato SQL:** `prisma/sql/enable_rls.sql`
**Origem:** item DB-03 da revisão de segurança (`SECURITY_AUDIT.md` / `REVISAO_GERAL.md`).

---

## 1. Por que fazer isso

Hoje o isolamento entre plantas (tenants) é **100% na aplicação**: cada query do
Prisma precisa lembrar de filtrar por `tenant_id`. Uma query esquecida = vazamento
de dados de outra planta, sem nenhuma rede de proteção. Foi exatamente esse tipo de
falha o IDOR de comentário (ALTO-02) que corrigimos.

RLS move uma **segunda barreira para dentro do banco**: mesmo que a aplicação
esqueça o `tenant_id`, o Postgres devolve só as linhas do tenant atual. A camada da
aplicação **continua existindo** — RLS é defesa em profundidade, não substituto.

---

## 2. ⚠️ O ponto que faz ou quebra tudo: o papel do Postgres

RLS **não vale para**:
- roles **superuser**;
- roles com o atributo **BYPASSRLS**;
- o **dono da tabela** — *a menos que* se use `FORCE ROW LEVEL SECURITY` (o SQL já usa).

No Supabase, a connection string padrão (`postgres`) costuma ser **superuser**. Se o
Prisma conectar com ela, **todas as políticas são silenciosamente ignoradas** e o
`enable_rls.sql` não protege nada.

**Antes de qualquer coisa, confirme o papel que o Prisma usa** (no Supabase SQL editor):
```sql
SELECT current_user;                                   -- quem o Prisma é
SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user;
```
- Se `rolsuper = true` ou `rolbypassrls = true` → **precisa de um role dedicado** para a
  aplicação (sem superuser, sem bypassrls), dono das tabelas ou com `GRANT` nelas, e
  trocar `DATABASE_URL`/`DIRECT_URL` para esse role. Esse é o pré-passo mais importante.
- As migrations / `db push` podem continuar usando o role privilegiado; só o **runtime
  da aplicação** precisa do role restrito.

---

## 3. Como a aplicação injeta o tenant por request

A política lê `current_setting('app.tenant_id', true)`. Alguém precisa **setar** esse
valor a cada request, antes das queries:
```sql
SELECT set_config('app.tenant_id', '<tenant-id>', true);
```
O 3º argumento `true` = **escopo de transação** (não de sessão). Isso é **obrigatório**
porque o Supabase usa PgBouncer em *transaction mode*: um `SET` de sessão vazaria entre
requests de conexões reaproveitadas. Com escopo de transação, o valor vale só dentro
da transação daquela query e some depois.

Consequência prática: **cada operação precisa rodar numa transação que primeiro seta o
GUC**. Rascunho de um Prisma Client Extension para automatizar:

```ts
// src/lib/prisma-rls.ts  (RASCUNHO — revisar)
import { prisma } from '@/lib/prisma'

/** Retorna um client Prisma cujas queries já rodam com o tenant setado no banco. */
export function prismaForTenant(tenantId: string) {
  return prisma.$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          // set_config + a query na MESMA transação (escopo `true` = transação)
          const [, result] = await prisma.$transaction([
            prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`,
            query(args),
          ])
          return result
        },
      },
    },
  })
}
```

Uso nas Server Actions (substituindo `prisma` por um client já "escopado"):
```ts
const tenantId = await getTenantId()
const db = prismaForTenant(tenantId)
await db.reading.findMany()   // já vê só o tenant certo, mesmo sem where tenant_id
```

### Complexidades honestas (não é 1 linha)
- **Transações interativas existentes** (`prisma.$transaction(async (tx) => …)`, usadas em
  turnos, equipamentos, etc.) **não** passam pelo hook acima. Nelas, seta o GUC como
  **primeira instrução** dentro da transação: `await tx.$executeRaw\`SELECT set_config('app.tenant_id', ${tenantId}, true)\``.
- **Migração gradual:** dá para introduzir o `prismaForTenant` e migrar as actions aos
  poucos. Enquanto uma action ainda usa o `prisma` cru, ela depende só do filtro
  de aplicação (como hoje) — nada quebra, só ainda não tem a rede da RLS.
- Alternativa mais elegante (fase 2): guardar o tenant num `AsyncLocalStorage` setado no
  início do request e um único client escopado — evita passar `tenantId` em todo lugar.

---

## 4. Operações de sistema (cron) — cuidado

O cron `/api/cron/shifts` **itera por vários tenants**. Com RLS ligada, ele não pode
usar um client escopado a um único tenant. Duas saídas:
- **(a)** No loop do cron, setar `app.tenant_id` para cada tenant antes de processá-lo
  (usa o mesmo `prismaForTenant(tenantId)` dentro do laço). **Recomendado** — mantém o
  cron sob RLS.
- **(b)** Rodar o cron com um role que tenha BYPASSRLS. Mais simples, porém remove a
  proteção do job — evite salvo necessidade.

---

## 5. Rollout faseado (sem susto)

1. **Staging primeiro.** Restaure uma cópia do banco (ou use um projeto Supabase de
   teste) e rode `enable_rls.sql` lá. Nunca estreie em produção.
2. **Confirme o role** (§2). Se for superuser, crie o role restrito e aponte o Prisma
   para ele **em staging**.
3. **Ligue o lado da aplicação** (`prismaForTenant`) em staging e rode a suíte + um
   passeio manual pelos 3 perfis. Sintoma de GUC não setado: telas vazias / "não
   encontrado" (fail-closed) — é o esperado quando falta setar o tenant.
4. **Teste de vazamento:** logado no tenant A, tente abrir por ID um recurso do tenant B
   (ex.: `/tecnico/ocorrencias/<id-do-B>`). Deve dar "não encontrado".
5. Só então **produção**, em janela de baixa carga, com o SQL + o deploy do
   `prismaForTenant` **juntos** (a app precisa setar o GUC assim que a RLS entrar, senão
   tudo é negado).
6. Tenha o **rollback** à mão (fim do `enable_rls.sql`): `DISABLE ROW LEVEL SECURITY`.

---

## 6. Checklist de aceite

- [ ] `current_user` do Prisma **não** é superuser nem bypassrls.
- [ ] `enable_rls.sql` rodou em staging sem erro (idempotente).
- [ ] `prismaForTenant` (ou equivalente) seta `app.tenant_id` em todas as actions e no cron.
- [ ] Suíte Vitest verde em staging com RLS ligada.
- [ ] Teste manual de vazamento cross-tenant → bloqueado pelo banco.
- [ ] Plano de rollback validado.
- [ ] Deploy de SQL + app coordenados em produção.

---

## 7. Melhoria complementar (opcional, fase 2)

Adicionar `tenant_id` às 3 tabelas que hoje dependem de subquery na política
(`push_subscriptions`, `parameter_history`, `occurrence_comments`) — via SQL aditivo,
conforme convenção do projeto. Deixa as políticas diretas (mais rápidas) e simplifica
futuras queries tenant-safe. Era também recomendação DB-04 do audit.
