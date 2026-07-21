# REVISÃO GERAL — Solentis (solentis-web)

**Escopo:** revisão ponta a ponta — segurança (invasão + vazamento), funcionamento do código, banco de dados, servidor/infra e tudo que está no GitHub (todas as branches + histórico).
**Método:** análise estática do código, varredura completa do histórico git, build/testes/typecheck/lint executados localmente.
**Data:** 2026-07-09
**Complementa:** `SECURITY_AUDIT.md` (detalhe técnico dos achados de segurança, com patches). Este documento é o guarda-chuva.

---

## ⚠️ Limite honesto de alcance
Auditei **tudo que é código, git e configuração**. **Não acesso ao vivo** o Vercel (servidor) nem o Supabase (banco em produção) — não tenho credenciais nem rede para eles e não invento achados. Os itens que só você consegue confirmar no painel estão no **§7 (Checklist do dono)**, com os comandos prontos.

---

## 1. VEREDITO GERAL

**Saúde do projeto: BOA. Rodada de correções de código CONCLUÍDA (2026-07-21) — todos os Altos, Médios e Baixos acionáveis por código foram corrigidos. Restam apenas itens de INFRA/DONO (RLS no Supabase, baseline de migration, envs, backup) antes de clientes pagantes.**

| Dimensão | Estado |
|---|---|
| 🔒 Segurança | Boa base; 2 Altos **já corrigidos**; ~7 Médios pendentes (ver SECURITY_AUDIT.md) |
| ⚙️ Funcionamento | Build ✅ · Types ✅ · 162 testes ✅ · 2 bugs funcionais novos encontrados |
| 🗄️ Banco de dados | Modelagem sólida (Decimal p/ dinheiro, tenant_id difundido) · **sem caminho de migração confiável** |
| 🖥️ Servidor/infra | Config correta; **faltam headers de segurança**; depende de verificação de envs |
| 🐙 GitHub | **Zero segredos vazados no histórico** ✅ · CI bom mas com pontos cegos · local 4 commits atrás |

### Top 5 prioridades (ordem de ataque)
1. ✅ **[FEITO]** Login de conta desativada + IDOR de comentário.
2. ✅ **[FEITO]** Push notifications (`session.user.id`) — FUNC-01 (commit a8e8439).
3. ✅ **[FEITO]** Race de turno duplicado — índice único parcial via SQL aditivo — FUNC-02 (commit df0ee1b).
4. ✅ **[FEITO]** Headers de segurança (CSP-RO/HSTS/X-Frame-Options/nosniff) — MÉDIO-01.
5. ⏳ **[DONO]** Sem caminho de migração do banco (4 migrations p/ 42 tabelas) — DB-01. Precisa de baseline com cuidado (ver memória "migrations quebradas"); não executado nesta sessão por ser fora do alcance de código seguro.

---

## 2. SEGURANÇA (invasão + vazamento) — resumo

Detalhe completo e patches em **`SECURITY_AUDIT.md`**. Situação após esta sessão:

| ID | Severidade | Achado | Status |
|---|---|---|---|
| ALTO-01 | 🟠 Alto | Usuário desativado ainda logava (`is_active` ignorado) | ✅ **Corrigido** |
| ALTO-02 | 🟠 Alto | IDOR cross-tenant em `addOccurrenceComment` | ✅ **Corrigido** |
| MÉDIO-01 | 🟡 Médio | Sem headers de segurança HTTP | ✅ **Corrigido** (CSP em Report-Only) |
| MÉDIO-02 | 🟡 Médio | Senha provisória com `Math.random()` | ✅ **Corrigido** (CSPRNG) |
| MÉDIO-03 | 🟡 Médio | `extractDataFromPDF` (IA) sem guard de role → abuso de custo | ✅ **Corrigido** |
| MÉDIO-04 | 🟡 Médio | CSV/formula injection na exportação | ✅ **Corrigido** |
| MÉDIO-05 | 🟡 Médio | Upload valida só MIME do cliente (sem magic bytes) | ✅ **Corrigido** |
| MÉDIO-06 | 🟡 Médio | Enumeração de usuário por timing (dummy hash inválido) | ✅ **Corrigido** |
| MÉDIO-07 | 🟡 Médio | PWA cacheia páginas autenticadas (device compartilhado) | ✅ **Corrigido** (NetworkOnly) |
| BAIXO-01 | 🔵 Baixo | `/api/logs` frouxo (sem validação, spread de contexto) | ✅ **Corrigido** |
| BAIXO-02 | 🔵 Baixo | `pointId` de outro tenant aceito no import de laudo | ✅ **Corrigido** |
| BAIXO-04 | 🔵 Baixo | Política de senha duplicada/morta | ✅ **Corrigido** |
| BAIXO-03/05/06 | 🔵 Baixo | JWT sem revogação · troca sem senha atual · postcss (Next) | ⏳ Design/dono (ver §7) |
| DB-02 | 🟡 Médio | Guardião de isolamento não cobria escritas | ✅ **Corrigido** |
| DB-01/03/04 | 🟡/🔵 | Baseline de migration · RLS no Supabase · `tenant_id` faltante | ⏳ Dono/infra (ver §7) |

**Vazamento de dados entre plantas (o maior risco de um SaaS multi-tenant):** o isolamento é feito **na aplicação** (Prisma bypassa RLS). Está aplicado de forma consistente — verificado em fotos, usuários, export, busca, ocorrências, turnos, estoque. A única falha de escrita cross-tenant (comentário) foi corrigida. **Recomendação estrutural:** habilitar RLS no Supabase como rede de segurança (§4 DB-03).

---

## 3. FUNCIONAMENTO DO CÓDIGO (revisão end-to-end)

### Saúde executável (rodado agora)
| Verificação | Resultado |
|---|---|
| `npm run build` | ✅ **Sucesso** — 77 páginas, compilou em 4.1 min |
| `npx tsc --noEmit` | ✅ **Limpo** — zero erros de tipo |
| `npx vitest run` (completo) | ✅ **162/162** (12 suítes) |
| `npx eslint .` | ⚠️ **176 erros / 158 warnings** — quase todos `no-explicit-any` (tech debt; não quebra build/CI) |

### 🐛 FUNC-01 (Médio) — Push notifications provavelmente quebradas
**Arquivo:** `src/lib/push-actions.ts:21,26,41` + `src/lib/auth.config.ts:25-30`
**Descrição:** `subscribeUser`/`unsubscribeUser`/`sendPushToUsers` usam `session.user.id`, mas o callback `session` em `auth.config.ts` **nunca mapeia `token.sub → session.user.id`** (só define `role`, `mustChangePassword`, `tenantId`). Confirmado por grep: não há nenhuma atribuição de `session.user.id` no projeto. Em runtime, `session.user.id` é `undefined` → o `upsert` grava `user_id: undefined` num campo obrigatório → **a inscrição de push falha silenciosamente**. Todo o resto do código evita isso usando `resolveUserId(email)`; só o push usa `session.user.id` direto.
**Impacto:** A feature de notificação push (não-conformidade CONAMA para gestores) pode não estar registrando ninguém. Precisa de verificação em runtime.
**Correção (patch):**
```ts
// src/lib/auth.config.ts — no callback session()
session({ session, token }) {
  session.user.id                 = token.sub as string   // ⬅️ ADICIONAR
  session.user.role               = token.role as string
  session.user.mustChangePassword = token.mustChangePassword as boolean
  session.user.tenantId           = token.tenantId as string
  return session
},
```
> Verifique também que o tipo `Session['user']` inclui `id` (a augmentação em `auth.ts` deve declarar `id: string`).

### 🐛 FUNC-02 (Médio) — Race condition: turno duplicado sob Postgres
**Arquivo:** `src/app/operador/turnos/actions.ts:121` (e o mesmo padrão em `assumirPosto`, `confirmarPassagem`)
**Descrição:** `abrirTurno` faz "verifica se existe → cria" dentro de uma `$transaction`, com o comentário *"SQLite serializa escritas — seguro no MVP"*. **Mas o banco migrou para Postgres**, cujo isolamento padrão (READ COMMITTED) **não** serializa isso: dois cliques/abas concorrentes podem passar os dois pela checagem `existing` e criar **duas instâncias OPEN** do mesmo turno/dia. Não há `@@unique` que impeça isso (só um `@@index([tenant_id, shift_id, date])`, que não é único). O handoff já registrava histórico de "turno duplicado" — a proteção atual não é atômica no banco.
**Correção:** criar índice único parcial (via SQL aditivo, conforme convenção do projeto):
```sql
-- prisma/sql/add_unique_open_shift.sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_shift_instance_ativa
ON shift_instances (tenant_id, shift_id, date)
WHERE status IN ('OPEN', 'HANDOVER_PENDING', 'SCHEDULED');
```
E tratar o erro `P2002` no `abrirTurno` devolvendo "Já existe um turno aberto". Isso torna a garantia **atômica no banco**, não dependente do nível de isolamento.

### ⚪ FUNC-03 (Baixo) — `aplicarTimeouts` escreve no banco durante render de página (GET)
**Arquivo:** `src/app/operador/turnos/actions.ts:79`
**Descrição:** `aplicarTimeouts` faz `updateMany` e é chamada em Server Components no render. Renderizar a página (inclusive por prefetch/robôs) dispara escrita. Funciona, mas mistura leitura com efeito colateral. **Baixo.** Considere mover para o cron (`/api/cron/shifts`) que já roda diariamente, ou aceitar como "lazy timeout" documentado (é decisão consciente do projeto — regra inviolável 3.3).

### ⚪ FUNC-04 (Baixo) — Testes com flakiness sob carga
**Descrição:** Na 1ª execução, 2 testes de senha falharam por timeout; isolados e na 2ª execução completa, 162/162 passaram. Causa: bcrypt custo 12 estoura o `testTimeout` padrão quando as 12 suítes rodam em paralelo. **Risco real:** o CI usa `vitest run --no-cache` (paralelo) — pode falhar aleatoriamente e **bloquear merges legítimos**. **Correção:** `testTimeout: 20000` no `vitest.config.ts`, ou reduzir `SALT_ROUNDS` nos testes via mock.

---

## 4. BANCO DE DADOS

**Modelagem geral: sólida.** 42 models, `tenant_id` na esmagadora maioria, índices compostos coerentes, snapshots imutáveis de limites legais (rastreabilidade CONAMA).

### ✅ Pontos corretos
- **Dinheiro em `Decimal`** (`estimated_cost`, `actual_cost`, `cost`) — segue o princípio "nunca Float p/ dinheiro". ✅
- **Cascades coerentes** com a estratégia de soft-delete (usuários/pontos/parâmetros usam `is_active`/`deleted_at`, não são hard-deletados). ✅
- **`ShiftHandover.shift_instance_id` é `@unique`** → dupla passagem barrada no nível do banco. ✅
- Índices para as consultas de dashboard (`groupBy`/`count`) presentes. ✅

### 🟡 DB-01 (Médio) — Sem caminho de migração confiável (risco de recuperação de desastre)
Só existem **4 migrations** em `prisma/migrations` para **42 models**. O schema é mantido por `db push` + SQL aditivo (`prisma/sql/`). Consequência: **não dá para recriar o banco de produção a partir do histórico de migrations** (`prisma migrate deploy` produziria um schema incompleto). Se precisar restaurar/clonar o ambiente, o processo é manual e frágil.
**Correção:** fazer um *baseline* — gerar uma migration inicial que represente o schema atual completo (`prisma migrate diff --from-empty --to-schema-datamodel` → SQL) e marcá-la como aplicada (`migrate resolve --applied`). Passa a ter um ponto de restauração reproduzível. (Fazer com cuidado, em ambiente de teste primeiro — combina com a memória "migrations quebradas".)

### 🟡 DB-02 (Médio) — Guardião de isolamento tem ponto cego em escrita
**Arquivo:** `src/lib/__tests__/tenant-isolation.test.ts`
O teste que protege o CI contra vazamento de tenant só varre **operações de leitura + `updateMany/deleteMany`** (`SCOPED_OPS`). Ele **não** verifica `create`, `createMany`, `update`, `upsert`, `delete`, e **ignora modelos sem `tenant_id`**. Foi exatamente por isso que o IDOR de comentário (ALTO-02) passou batido. Dá falsa confiança.
**Correção:** estender `SCOPED_OPS` para incluir escritas e, para modelos sem `tenant_id` (como `OccurrenceComment`), exigir um comentário `// @tenant-checked` comprovando o check-then-act. Assim o CI volta a cobrir a superfície de escrita.

### 🔵 DB-03 (Baixo/Estrutural) — RLS desabilitado (isolamento 100% na aplicação)
O Prisma conecta com papel que bypassa RLS. Cada query esquecida vira brecha. **Recomendação:** habilitar RLS no Supabase com política `tenant_id = current_setting('app.tenant_id')::text` e injetar o tenant por request. É a defesa em profundidade que teria neutralizado o ALTO-02 no banco. (Projeto maior; planejar pós-correções.)

### 🔵 DB-04 (Baixo) — `ParameterHistory`/`OccurrenceComment` sem `tenant_id`
Isolamento desses depende de check-then-act via relação. Já corrigido para comentários. Para `ParameterHistory`, confirmar que toda leitura parte de um `parameter_id` já validado por tenant (hoje é o caso). Ideal: adicionar `tenant_id` a ambos para permitir RLS e queries diretas.

---

## 5. SERVIDOR / INFRAESTRUTURA

### ✅ Correto
- `vercel.json`: região `gru1` (São Paulo — latência ok p/ Brasil), cron `5 3 * * *` (00:05 BRT) registrado. ✅
- `instrumentation.ts` fixa `TZ=America/Sao_Paulo` (corrige fuso em telas server-rendered). ✅
- Uploads no Vercel Blob com nome `randomUUID` (não adivinhável), servidos por rotas autenticadas tenant-safe. ✅
- Cron **fail-closed** em produção (exige `Bearer CRON_SECRET`). ✅

### 🟡 Pendências de infra
- **Headers de segurança ausentes** (SECURITY_AUDIT MÉDIO-01) — corrigir no `next.config.mjs`.
- **Rotas de debug** — houve uma `/api/debug/email` no histórico (protegida por SUPER_ADMIN, já removida). Recomendo bloquear `/api/debug/*` no `proxy.ts` de forma permanente para evitar reintrodução acidental.
- **Envs sensíveis** — inventário no §7; confirmar que nenhuma virou `NEXT_PUBLIC_` (hoje só a VAPID pública, que é correta).

---

## 6. GITHUB (todas as branches + histórico)

### ✅ Excelente
- **Nenhum segredo real vazado em nenhum commit de nenhuma branch.** Varredura de todo o histórico só encontrou `.env.example` com placeholders `USER:PASSWORD@HOST`. Nenhum `.env` real foi commitado jamais. ✅
- **Dependabot** bem configurado (agrupa minors, respeita o pin do Prisma v5 e do next-auth v5-beta). ✅
- **CI (`ci.yml`)**: roda em push/PR, tem o *guardião de isolamento multi-tenant* + `npm audit --audit-level=high` + `tsc`. Muito acima da média. ✅

### 🟡 Pendências GitHub
- **Local está 4 commits atrás de `origin/main`** (mudança líquida: só `layout.tsx`). Rode `git pull` antes de trabalhar.
- **CI não roda `next build` nem `eslint`** → erros de build/lint não bloqueiam merge. Adicionar um passo de build ao workflow.
- **Flaky test pode quebrar o CI** (ver FUNC-04) — corrigir o `testTimeout`.
- **~35 branches remotas** (muitas dependabot/feics já mescladas) — limpeza de higiene.
- **`npm audit`**: 2 moderate (postcss via Next, build-time) — acompanhar release do Next.

---

## 7. CHECKLIST DO DONO (só você consegue verificar — runtime/painel)

Rode/confirme você mesmo (comandos prontos onde aplicável):

- [ ] **Vercel → Env Vars**: `AUTH_SECRET`/`NEXTAUTH_SECRET` forte e presente · `CRON_SECRET` · `RESEND_API_KEY` · `EMAIL_FROM` · `BLOB_READ_WRITE_TOKEN` · `GEMINI_API_KEY` · `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_ID` · `DATABASE_URL`/`DIRECT_URL`. **Nenhuma** com prefixo `NEXT_PUBLIC_` exceto `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.
- [ ] **Supabase → Database → confirmar se RLS está habilitado** nas tabelas (hoje o isolamento está só na app — ver DB-03).
- [ ] **Supabase → confirmar o papel do Postgres** usado pelo Prisma (se é service_role/owner que bypassa RLS).
- [ ] **Rotacionar** qualquer credencial que já tenha aparecido em `git remote`/tela no passado (o handoff mencionava um token do GitHub embutido no remote — confirmar revogação).
- [ ] **Testar push em produção** após o patch FUNC-01 (assinar notificações num dispositivo e disparar uma não-conformidade).
- [ ] **Advisories do `next-auth@5.0.0-beta.31`** — é beta no caminho de auth; acompanhar o changelog de segurança.
- [ ] **Backup do banco**: confirmar que o Supabase tem PITR/backup automático ativo e **testar um restore** ("backup não testado não é backup").

---

## 8. PLANO DE CORREÇÃO CONSOLIDADO (ordem de commit)

**Ciclo 1 — Segurança Alta** ✅ FEITO nesta sessão (ALTO-01, ALTO-02).

**Ciclo 2 — Bugs funcionais (fazer já; afetam features que já estão no ar):**
1. `fix(push): popula session.user.id no callback (corrige inscrição de push)` → FUNC-01
2. `fix(turnos): índice único parcial contra turno duplicado (race Postgres)` → FUNC-02
3. `test(config): aumenta testTimeout p/ estabilizar CI` → FUNC-04

**Ciclo 3 — Hardening de plataforma:**
4. `feat(security): headers HTTP (CSP-RO, HSTS, X-Frame-Options, nosniff)` → MÉDIO-01
5. `fix(security): bloqueia /api/debug/* no proxy` → infra

**Ciclo 4 — Segurança Média de aplicação:**
6. Math.random→CSPRNG · guard no `extractDataFromPDF` · CSV injection · magic bytes · dummy hash timing · PWA cache → MÉDIO-02..07

**Ciclo 5 — Banco / robustez de longo prazo:**
7. `chore(db): baseline de migration reproduzível` → DB-01
8. `test(isolamento): guardião cobre operações de escrita` → DB-02
9. `feat(db): habilita RLS no Supabase (defesa em profundidade)` → DB-03
10. Baixos restantes (SECURITY_AUDIT BAIXO-01..06) + limpeza de branches + build no CI.

---

## 9. MATRIZ DE COBERTURA DESTA REVISÃO

| Área | Status | Onde |
|---|---|---|
| Segurança (invasão/vazamento) | ✅ Auditada | SECURITY_AUDIT.md + §2 |
| Código ponta a ponta (build/types/testes/lint) | ✅ Executada | §3 |
| Lógica de negócio (turno, estoque, ocorrência, handover) | ✅ Revisada | §3 (FUNC-01..04) |
| Banco: schema, migrations, integridade, RLS | ✅ Revisada | §4 |
| Servidor/infra (Vercel, cron, envs, headers) | ✅ Config revisada / ⚠️ runtime → dono | §5, §7 |
| GitHub: todas as branches + histórico + segredos + CI | ✅ Auditada | §6 |
| Verificação runtime de Vercel/Supabase ao vivo | ⚠️ Fora de alcance | §7 (checklist do dono) |

---
*Fim da revisão geral. Nenhum dado foi alterado além das 2 correções de segurança já aplicadas (ALTO-01, ALTO-02), ainda não commitadas.*
