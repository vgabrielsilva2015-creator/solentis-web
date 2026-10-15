# Auditoria independente do SaaS Solentis — 2026-10-15

> ✅ **ATUALIZAÇÃO (2026-10-15, pós-correções):** os achados de código (E1–E3, E5–E8) foram
> corrigidos e estão em produção; ver `AUDITORIA-FORENSE-2026-10-15.md` (topo). Resta só **E4**
> (apontar o `.env` de dev para banco local) — ação do dono. O corpo abaixo é o diagnóstico original.

> Auditoria executada com evidência real do repositório, dos testes e das configurações acessíveis.
> **Postura: brutalmente honesta.** O que não pôde ser validado está marcado como tal.
> **Nada foi modificado** no produto durante a auditoria (só este relatório foi escrito).

## Limites de acesso (o que ficou BLOQUEADO)
O auditor **não tem** acesso à Vercel, ao Supabase de produção nem a um navegador real, e **não toca em produção** por regra. Portanto ficam **Bloqueados**: validação em produção, E2E em navegador real, testes de carga, e inspeção dos dados efetivamente armazenados. Onde isso importa, está dito.

Fontes de evidência: `git` (branch/commit), `prisma/schema.prisma`, `src/**`, `.github/workflows/ci.yml`, execução local de `tsc`/`lint`/`vitest` (unit + integração em Postgres **local descartável**), `npm audit`, histórico de CI via `gh`, e **duas auditorias independentes por subagente** (correção + segurança) sobre a trilha de mudanças recente.

---

## A. Veredito executivo

A Solentis é um **protótipo funcional maduro de produto único (single-plant por uso real), com arquitetura multi-tenant genuína**, bem além de um MVP de demonstração: autenticação real (NextAuth v5 + MFA TOTP opcional), matriz de permissões única, isolamento multi-tenant com **guardião estático no CI**, 43 modelos de dados, 105 páginas, migrations com baseline, CI de 4 trilhas (todas verdes) e observabilidade estruturada (Pino + health check). O código é disciplinado e os padrões (serviço/ação fina, `updateMany` condicionado a estado, `logAudit`, validação de tenant antes de FK) são aplicados com consistência rara para um projeto de autor único.

**Está funcionando?** No escopo validável (testes unit + integração em Postgres real local, build, typecheck, CI), **sim**. Os fluxos de negócio centrais têm cobertura de teste real.

**O que funciona com evidência:** autenticação/sessão revalidada, permissões, isolamento multi-tenant (estrutural), leituras/análises/ocorrências/turnos/estoque no nível de serviço, deduplicação de NC com trava de corrida, importação de laudo por IA com limites. Ver inventário (C) e testes (D).

**O que NÃO está comprovado:** funcionamento em produção (sem acesso), jornada E2E em navegador real por perfil, comportamento sob carga/escala, e a integridade dos dados reais já gravados.

**Pode receber clientes pagantes?** Para **piloto controlado** (1–3 plantas, com o dono por perto): **sim, com ressalvas**. Para **clientes pagantes autônomos**: **ainda não** — há 1 bug de corrida de severidade ALTA no estoque, backup/restore não testado, `.env` local apontando para produção, e nenhuma validação E2E/escala independente.

**Riscos que impedem conclusão mais favorável:** (1) corrida na revisão de contagem de estoque pode ajustar saldo de forma inconsistente; (2) recuperação de desastre não comprovada; (3) risco operacional do `.env` de produção na máquina de dev; (4) ausência de evidência de escala.

**Próximo passo mais importante:** corrigir o bug de corrida do estoque (P0/P1) e **testar um restore de backup** antes de expor qualquer cliente pagante a dados próprios.

---

## B. Nota de maturidade (0–5)

| Dimensão | Nota | Base da nota |
|---|:--:|---|
| Funcionalidade | **3** | Muitos módulos implementados e cobertos por teste; lacunas reais (corrida de estoque, auditoria de reincidência). Sem E2E em navegador real por mim. |
| Arquitetura | **3** | Camadas claras (`server/*` serviço + action fina, matriz de permissões, guards); dívida: arquivos de ~780/480/450 linhas ainda não quebrados (M-22/23). |
| Segurança | **3** | Controles fortes (permissões, guardião, rate limit, RLS aplicado, 0 `npm audit` HIGH, sem segredo em log). 1 médio (defesa em profundidade) aberto; sem pentest/validação em produção. |
| Multi-tenancy | **3** | Guardião estático + 39 testes citam tenant + RLS deny-all + tenant resolvido do banco. 1 médio: `parameterId` não revalidado dentro de `criarOcorrenciaAutomatica`. Sem prova de isolamento em runtime por mim. |
| Qualidade dos dados | **3** | 43 models, FKs, 68 `@@index`, 9 `@@unique` + índices únicos parciais, 40 `@default(now)`. JSON como String (validação fica na aplicação) = risco. Dados reais não inspecionados. |
| Testes | **3** | 881 unit + 89 integração (Postgres real) + E2E smoke + guardião de isolamento + teste de contrato de auditoria. Gaps: a corrida do estoque não tem teste; profundidade de E2E não verificável. |
| Performance | **2** | Baseline medido (M-12) só em volume pequeno; índices compostos adicionados. **Sem** teste de carga/escala real. |
| Escalabilidade | **2** | Teto do plano Supabase (~60 conexões) é o limite real; `connection_limit` documentado mas **não verificado** na Vercel; sem benchmark. |
| Observabilidade | **3** | Pino estruturado com masking + `/api/health` (SELECT 1, 3 s) + heartbeat de cron. Sem evidência de alerting/métricas/tracing configurados e testados. |
| Operação e recuperação | **2** | Processo de migrations documentado; script de backup existe; **PITR/restore NÃO testado**; rollback = `git revert`; `.env` local aponta p/ produção (perigoso). |
| UX/UI | **3** (por sinais de código) | Mobile-first, bottom nav, 105 páginas, rascunhos em localStorage, fila offline, botões de voltar. **Sem** validação em navegador real nem checagem axe por mim. |
| Prontidão comercial | **2** | Multi-tenant real, super admin cria planta/usuário, onboarding "planta nasce mobiliada". Falta: billing/planos, restore testado, E2E comprovado, correção do bug ALTO. |

> Escala: 0 inexistente · 1 experimental · 2 parcial com limitações relevantes · 3 funcional no escopo validado, com lacunas · 4 maduro/confiável no escopo · 5 robusto comprovado. Notas altas exigem evidência — por isso nenhuma passa de 3 (produção/escala não validáveis aqui).

---

## C. Inventário funcional (mapa real)

**Estado do repo:** branch `main`, commit `af6191d`, working tree limpo (fora `.md` de trabalho), local == `origin/main`.
**Stack efetiva:** Next.js **16.4.0**, React **19.2.7**, Prisma **5.22** (`@prisma/client` 5.22), NextAuth **5.0.0-beta.31**, PostgreSQL (Supabase), TypeScript estrito, Tailwind v4, Pino, Serwist. Scripts: `dev, build (next build --webpack), start, lint, test, test:run, test:integration`.
**Superfície:** 105 `page.tsx` · 10 rotas de API · 28 `actions.ts`. Por perfil: gestor 46, operador 19, técnico 16, manutenção 7, admin 5.
**Dados:** 43 models, 0 enums nativos (String + constantes TS), 68 `@@index`, 9 `@@unique`, 15 `@unique`, 20 `onDelete`, 5 `deleted_at` (soft-delete), 0 campos `Json` nativos (JSON serializado como String).
**APIs:** `auth/[...nextauth]`, `cron/shifts`, `export`, `health`, `logs`, `occurrences/[id]/photo`, `readings/[id]/photo`, `shift-task-photos/[id]`, `equipments/[id]/files`, `search`.

| Módulo | Estado | Nível de validação | Evidência |
|---|---|---|---|
| Autenticação + sessão revalidada | Implementado | Validada por integração | `src/lib/auth.ts`, `session-guard.ts`; testes de sessão/rate-limit |
| MFA TOTP (opcional, off por padrão) | Implementado | Validada em teste isolado | migration `20261008100000_user_mfa`; `MFA_ENFORCE` |
| Reset/definir senha por e-mail | Implementado | Validada em teste isolado | `PasswordResetToken`, fluxo por token hash |
| Permissões (matriz única) | Implementado | Validada por integração | `src/server/auth/permissions.ts`, `docs/PERMISSOES.md`, `permissions.test.ts` |
| Isolamento multi-tenant | Implementado | Validada (estática) + integração | `tenant-isolation.test.ts` (guardião no CI) + RLS deny-all aplicado |
| Super Admin (cria planta/usuário, reset, toggle) | Implementado | Implementado, não validado (E2E) | `src/app/admin/plantas/actions.ts` |
| Leituras de campo | Implementado | Validada por integração | `src/server/leituras/*`, testes |
| Análises laboratoriais + aprovação | Implementado | Validada por integração | `tecnico/analises/actions.ts`, `m01-*` |
| Importação de laudo por IA (Gemini) | Implementado | Validada em teste isolado | `gestor/importacao/actions.ts`, `laudo-sniff.ts`, `m16-*` |
| Ocorrências (auto + manual, dedup) | Implementado | Validada por integração | `src/server/occurrences/criar.ts`, `m06/m07` |
| Equipamentos + manutenção (máquina de estados) | Implementado | Validada por integração | `tecnico/equipamentos/actions.ts`, `m02` |
| Turnos + passagem + encerrar à força | Implementado | Validada por integração | `gestor/turnos/*`, `m05` |
| Estoque químico (entrada/saída/contagem/revisão) | Implementado | Validada por integração **com bug ALTO** | `src/server/estoque/service.ts`, `m04`; ver E1 |
| Dashboards por perfil | Implementado | Implementado, não validado (render real) | `src/server/dashboard/queries.ts` (SQL agregado) |
| Auditoria (UI + contrato) | Implementado | Validada por integração | `src/lib/audit.ts`, `m03-*`, `gestor/auditoria` |
| PWA + fila offline (IndexedDB) | Implementado | Validada em teste isolado + E2E smoke | `src/lib/offline-queue/*`, `t15-offline-fila.spec.ts` |
| Notificações push + WhatsApp | Implementado | Implementado, não validado (envio real) | `web-push.ts`, `whatsapp.ts`; envio real BLOQUEADO |
| Cron de turnos | Implementado | Validada por integração (idempotência) | `api/cron/shifts`, `p0-cron-shifts.int.test.ts` |
| Billing / planos / limites comerciais | **Não implementado** | — | sem evidência de cobrança/planos por tenant |
| Osmose reversa / monitoramento ARLA dedicado | Não implementado como módulo próprio | — | coberto genericamente por leituras/análises |

---

## D. Testes executados (nesta auditoria)

| Verificação | Comando | Resultado |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | ✅ 0 erros |
| Lint | `npm run lint` (eslint) | ✅ 0 erros (123 warnings pré-existentes, ex.: `no-unused-vars`) |
| Testes unitários | `npx vitest run` | ✅ **881/881** (67 arquivos) |
| Testes de integração (Postgres real local) | `npm run test:integration` (embedded-postgres descartável) | ✅ **89/89** (9 arquivos) — rodado mais cedo hoje no mesmo HEAD lógico |
| Dependências (produção) | `npm audit --omit=dev --audit-level=high` | ✅ 0 vulnerabilidades |
| CI (últimas 5 execuções na `main`) | `gh run list` | ✅ todas `success` (jobs: Isolamento+Testes+Typecheck+Lint+Build · Integração+migrations do zero · Segurança/Gitleaks · E2E smoke) |
| **E2E em navegador real** | — | ⛔ **Bloqueado** (sem navegador/ambiente); CI roda só o *smoke* |
| **Teste de carga** | — | ⛔ **Não executado** (não fazer contra produção; sem staging dedicado nesta sessão) |
| **Validação em produção** | — | ⛔ **Bloqueado** (sem acesso) |

**Qualidade dos testes (inspeção):** há testes de *integração com Postgres real* (não só mocks), um *guardião de isolamento* por análise estática do código-fonte, e um *teste de contrato de auditoria* que exige `logAudit` em toda action de escrita. Isso é acima da média. **Porém**: o bug de corrida do estoque (E1) **não é coberto** por nenhum teste atual, e parte da suíte unitária usa mocks de auth/logger (esperado). A quantidade de testes não prova ausência dos defeitos abaixo.

---

## E. Achados críticos (com evidência)

> Origem: duas auditorias independentes por subagente (correção + segurança) + medições do auditor. Cada achado traz arquivo e cenário.

### E1 — ALTA · corrida na revisão de contagem de estoque aplica ajuste inconsistente
**Arquivo:** `src/server/estoque/service.ts` — `revisarContagemDeEstoque` (~L110–166).
**Defeito:** a checagem "contagem ainda está `PENDING`?" é um `findFirst` **antes** da trava, e a trava (`lockProduct`) tranca **só `chemical_products`, não a linha da contagem**. Os `updateMany` finais incluem `review_status: 'PENDING'` no `where` mas **não leem o `count`** (ao contrário de M-01/M-02/M-05, que sempre fazem `if (count === 0) abort`).
**Cenário:** Gestor A (APROVAR) e Gestor B (REJEITAR) abrem a mesma contagem pendente. B rejeita e comita; A, serializado pela trava do produto, prossegue, **cria o lançamento de ajuste** no estoque, audita como `APPLIED`, e o `updateMany` final afeta 0 linhas silenciosamente. Fim: linha fica `REJECTED`, mas o saldo foi ajustado como se aprovado, e a action responde "ok". É exatamente o que o M-04 queria impedir.
**Status:** PLAUSÍVEL (alta confiança por leitura; não reproduzido em Postgres). Sem teste de regressão (o `p0-estoque-concorrencia.int.test.ts` não cobre 2 revisões concorrentes).
**Correção:** ler o `count` do `updateMany` de transição e abortar se `0` (padrão da própria trilha); idealmente travar a linha da contagem (`SELECT ... FOR UPDATE` / advisory lock por `countId`). + teste de regressão.

### E2 — MÉDIA · reincidência/escalonamento de NC (M-07) não grava `logAudit`
**Arquivo:** `src/server/occurrences/criar.ts` — `agruparReincidencia` (~L151–178) e criação automática (~L112–126).
**Defeito:** criar o comentário de reincidência e **escalar a severidade** da ocorrência (lógica nova do M-07) não deixam rastro em `audit_logs`. Comparar com a criação manual, que audita.
**Impacto:** "por que essa ocorrência virou CRÍTICA?" fica sem resposta na auditoria — justamente o pilar de rastreabilidade CONAMA do produto. Não está listado no backlog de exceções conhecidas (que só cita estoque).
**Status:** CONFIRMADO (ausência de `logAudit`). **Correção:** `logAudit` no escalonamento (before/after da severidade) e na criação automática.

### E3 — MÉDIA · `criarOcorrenciaAutomatica` não revalida `parameterId` contra o tenant (defesa em profundidade)
**Arquivo:** `src/server/occurrences/criar.ts` (~L84–125).
**Defeito:** valida `collectionPointId` contra o tenant, mas **não** o `parameterId` — que é a chave da deduplicação (M-07). Hoje **não explorável** (os 3 chamadores validam o parâmetro antes), mas um 4º chamador futuro que esqueça abriria cruzamento de dados entre tenants sem o guardião pegar (ele varre `tenant_id` no `where`, não a integridade do valor).
**Status:** Médio (latente). **Correção:** revalidar `parameterId` dentro da função, igual ao ponto de coleta.

### E4 — MÉDIA (operacional) · `.env` local aponta para o Supabase de PRODUÇÃO
**Evidência:** `.env` existe, está no `.gitignore` (bom, não vaza), mas `DATABASE_URL` aponta para supabase/pooler (produção), não `localhost`.
**Impacto:** qualquer `prisma migrate`/`db push`/script/`vitest` de integração rodado sem sobrescrever a env **bate em produção**. É um acidente de 1 comando de distância (ex.: `migrate reset` destrutivo). Foi por isso que esta auditoria usou Postgres local descartável.
**Correção:** `.env` de dev deve apontar para banco **local**; produção só via env setada na hora e terminal fechado depois. Documentar em `docs/MIGRATIONS.md`/RUNBOOK.

### E5 — BAIXA · erro do Gemini devolvido ao cliente sem sanitizar
**Arquivo:** `src/app/gestor/importacao/actions.ts` (~L151–156). `errorMessage(lastError).substring(0,150)` vai para a tela. **Sem vazamento de segredo** (a key do Gemini vai em header, não na URL/mensagem), mas fere o princípio "stack trace nunca vaza". Restrito a `lab.import` (MANAGER). **Correção:** mensagem genérica ao usuário, erro cru só no log.

### E6 — BAIXA (nota) · exceção do MANAGER em M-01 é incondicional
**Arquivo:** `src/app/tecnico/analises/actions.ts:157`. O comentário diz "planta de 1 técnico", mas o código libera **qualquer** MANAGER a aprovar a própria análise, em qualquer planta. Não é falha de segurança (MANAGER é o perfil mais confiável), mas o texto ≠ a regra. **Ação:** decidir (manter bypass total e ajustar o texto, ou condicionar a 1 técnico).

### E7 — BAIXA (backlog conhecido) · entrada/saída de estoque não auditam
Já documentado no `CLAUDE.md`: `registrarEntradaDeEstoque`/`registrarSaidaDeEstoque` não chamam `logAudit` (só a contagem). Ponto de rastreabilidade, não de isolamento.

---

## F. Auditoria de segurança e multi-tenancy

**Efetivamente testado (estático + integração local):**
- **Autorização:** toda server action nova/alterada começa por `requirePermission`/`getActor()+permissionError`; nenhum uso de `session.user.role` na mão; `tenantId`/`userId` vêm do `ActionCtx` resolvido no banco, nunca de input do cliente. ✅
- **Isolamento:** guardião estático (`tenant-isolation.test.ts`) falha o build se uma query de modelo com `tenant_id` não filtrar por tenant; RLS deny-all aplicado em produção (sem `FORCE` → dono/Prisma ignora, correto; revoga `anon`/`authenticated` do PostgREST, que o app não usa). ✅
- **Injeção:** único raw novo é `pg_advisory_xact_lock` via *tagged template* parametrizado; o único `$executeRawUnsafe` do repo é no harness de teste, travado por `assertSafeDatabase` (só banco local `_int/_test/_ci`). ✅
- **Import por IA:** magic bytes reais antes de gastar cota; rate limit por usuário/tenant (fail-open consistente); timeout 45 s. ✅
- **Segredos/log:** masking do Pino intacto; nenhum logger novo imprime telefone/e-mail/token/URL de banco. ✅ `npm audit` prod HIGH = 0. ✅
- **Headers/CSP, bloqueio de `/api/debug`, upload magic bytes, CSV injection** — endereçados na revisão de 2026-07-28 (não re-testados a fundo aqui).

**Aberto:** E3 (revalidar `parameterId` — defesa em profundidade) e E5 (sanitizar erro ao cliente).

**Sem comprovação (Bloqueado):** pentest dinâmico, tentativa real de IDOR cross-tenant alterando IDs/payloads em runtime, CSRF em navegador real, e isolamento observado no banco de produção. O **isolamento é forte no nível de código** (guardião + RLS), mas **não foi provado em runtime** por esta auditoria.

---

## G. Escalabilidade e custos (condicional — sem benchmark)

**Fatos:** baseline de queries (M-12) só em volume pequeno; índices compostos adicionados (M-13/14, aplicados em prod via SQL Editor); pooler documentado (`connection_limit=1`, 6543) mas **não verificado na Vercel**; ~29 das 46 chamadas `findMany` não têm `take` explícito (histórico diz que são limitadas por status/FK/data — **não exaustivamente verificado**). Dashboards usam SQL agregado.

**Gargalo real:** o **teto de conexões do plano Supabase** (Free ~60) — não o código. Escalar = upgrade de plano.

**Cenários de planejamento (hipóteses, não capacidade medida):**
- **10 orgs:** plausível no plano atual, 1 planta por org, uso esporádico de operadores. Falta medir p95 dos fluxos de escrita.
- **100 orgs:** provável necessidade de pooler maior (upgrade Supabase) + `connection_limit` confirmado + CDN/caching de dashboard. Medir conexões simultâneas.
- **1.000 orgs:** exige revisão de pool/filas (cron, push em lote), particionamento de históricos (leituras/análises/logs crescem sem bound), e observabilidade de latência. Arquitetura ainda cabe, mas sem evidência.
- **10.000 orgs:** exige decisão arquitetural (sharding/pool dedicado, jobs assíncronos, arquivamento) — fora do que o código prova hoje.

**Falta medir:** latência p50/p95/p99 dos fluxos críticos, throughput, saturação de conexões, crescimento de histórico, custo por org. **Nada disso foi medido** nesta auditoria.

---

## H. Prontidão comercial (parecer separado)

- **Piloto controlado (1–3 plantas, dono por perto):** ✅ **apto, com ressalvas** — corrigir E1 antes, e combinar que backup/restore será testado na primeira semana.
- **Primeiros clientes pagantes (autônomos):** ⚠️ **ainda não** — bloqueadores: E1 (corrida de estoque), restore não testado, `.env`→prod, sem E2E/escala comprovados, sem billing/planos.
- **Expansão comercial ampla:** ❌ **não** — falta evidência de escala, observabilidade com alerting testado, DR comprovado e automação de onboarding/cobrança.

Sem dados reais de clientes/uso — **não há** validação de mercado, disposição a pagar ou retenção; não inventar.

---

## I. Plano de correção priorizado

**Fase A — Segurança e integridade (antes de qualquer cliente):**
- **E1 (P0/P1):** corrigir corrida da revisão de contagem (ler `count` do `updateMany`; travar a linha da contagem) + teste de regressão em `p0-estoque-concorrencia.int.test.ts`. Aceite: 2 revisões concorrentes → exatamente 1 efeito, estado coerente.
- **E4 (P1):** `.env` de dev → banco local; documentar o procedimento de prod. Aceite: `grep` do `.env` não aponta para supabase.
- **E3 (P2):** revalidar `parameterId` em `criarOcorrenciaAutomatica`. Aceite: teste com parâmetro de outro tenant → rejeitado.

**Fase B — Funcionalidade real / rastreabilidade:**
- **E2 (P1):** `logAudit` na reincidência/escalonamento de NC. Aceite: escalonamento gera linha em `audit_logs` com before/after.
- **E7 (P2):** auditar entrada/saída de estoque. **E6 (P3):** alinhar regra×texto do bypass de MANAGER.
- **E5 (P3):** sanitizar erro do Gemini ao cliente.

**Fase C — Confiabilidade operacional:**
- **Testar restore de backup (P1)** num projeto separado — "backup não testado não é backup". Confirmar PITR do Supabase.
- Rotacionar token do GitHub (se ainda exposto). Alerting externo no `/api/health`.

**Fase D — Prontidão comercial:**
- Onboarding autônomo de cliente (hoje depende do super admin/dono); billing/planos por tenant; documentação de suporte; validação UX em navegador real + axe nas 5 telas-chave.

**Fase E — Escalabilidade:**
- Benchmark em staging (k6 já existe em `scripts/load/`): p50/p95/p99 + saturação de conexões. Confirmar `connection_limit` na Vercel. Plano de arquivamento de históricos. Só otimizar o que o benchmark mostrar.

---

## J. Conclusão sem maquiagem

- **Estado atual do produto:** protótipo funcional **maduro** e disciplinado, multi-tenant real, em produção na Vercel; pronto para **piloto controlado**, não para clientes pagantes autônomos.
- **O que está comprovadamente funcionando:** typecheck, lint, 881 testes unit, 89 de integração em Postgres real, build, CI de 4 trilhas verdes, 0 vuln HIGH; autenticação/permissões/isolamento (estrutural) e os serviços de negócio centrais no nível de teste.
- **O que existe no código mas não foi comprovado:** jornada E2E em navegador real por perfil, envio real de push/WhatsApp/e-mail, dashboards renderizados, e comportamento em produção.
- **O que está incompleto ou quebrado:** corrida na revisão de contagem de estoque (ALTA); auditoria ausente na reincidência de NC; billing/planos inexistentes; restore não testado.
- **Maior risco técnico:** E1 — inconsistência de saldo de estoque sob concorrência.
- **Maior risco de segurança:** E3 (latente) + a ausência de pentest/validação de isolamento em runtime; nada crítico encontrado no código.
- **Maior gargalo para crescer:** teto de conexões do plano Supabase + ausência total de evidência de carga.
- **Pode receber clientes pagantes hoje?** Piloto sim (com E1 corrigido e restore testado); pagantes autônomos, não.
- **Pode escalar hoje?** Desconhecido — não medido. O limite conhecido é o plano Supabase.
- **O que falta para conclusão confiável:** E2E em navegador real, teste de carga em staging, validação de isolamento em runtime, e teste de restore.
- **As cinco ações mais importantes agora:** (1) corrigir E1 + teste; (2) testar restore de backup; (3) apontar `.env` de dev para banco local (E4); (4) `logAudit` na reincidência (E2); (5) rodar E2E por perfil + benchmark de carga em staging.

---
*Auditoria read-only. Nenhuma correção aplicada. Achados E1–E3/E5/E6 vindos de duas revisões independentes por subagente; E4/E7 e as medições de gate/escala pelo auditor. Evidência reproduzível pelos comandos da seção D.*
