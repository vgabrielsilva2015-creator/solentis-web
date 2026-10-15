# Auditoria FORENSE da Solentis — 2026-10-15 (com reprodução de defeito)

> Complementa o relatório estrutural `AUDITORIA-INDEPENDENTE-2026-10-15.md` (inventário A–J).
> Aqui o foco é **profundidade e reprodução**: o bug ALTO foi **reproduzido em Postgres real**,
> e houve varredura estática profunda por "falso sucesso / erro engolido / mock / dead code / XSS".
> **Nada do produto foi alterado.** O teste de reprodução foi temporário e já removido (não commitado).

## Método e acesso
- `git`: `main` @ `af6191d`, working tree limpo. Local == `origin/main`.
- Reprodução: **embedded-postgres** (PG 18, local, descartável, banco `solentis_int`) com as 23 migrations aplicadas via `migrate deploy`. **Nunca** produção.
- Teste forense temporário chamou o **serviço** `revisarContagemDeEstoque` diretamente (2 revisores), 25 corridas `Promise.all([aprovar, rejeitar])`.
- **Bloqueado** (sem acesso / não executável aqui): produção, E2E em navegador real, carga.

---

## A. Veredito executivo (forense)
A base é **limpa e disciplinada** em quase tudo que dá para medir estaticamente (0 `catch {}` vazio, 1 único `: any` em código de produção, 0 `dangerouslySetInnerHTML` com dado de usuário, 0 mock/stub/TODO real em produção). O build, os 881 testes unit e os 89 de integração passam. **Porém**, o defeito de concorrência da revisão de contagem de estoque (E1 do relatório anterior) **não era hipótese: foi reproduzido**, com dois sintomas medidos. Isso rebaixa a prontidão para "clientes pagantes autônomos" até a correção.

---

## B. Mapa do produto
Sem mudança desde o relatório estrutural (ver `AUDITORIA-INDEPENDENTE-2026-10-15.md §C`): 43 models, 105 páginas, 10 APIs, 28 `actions.ts`; perfis gestor/operador/técnico/manutenção/admin. Billing/planos: **não implementado**.

---

## C. Matriz de funcionalidades (ajuste forense)
Uma mudança de classificação relevante vs. o relatório anterior:
- **Revisão de contagem de estoque (M-04):** era "Validada por integração"; **rebaixado para "Implementada com DEFEITO de concorrência CONFIRMADO"** (ver E1 abaixo). O fluxo feliz single-user funciona; o fluxo concorrente corrompe a consistência.

Demais classificações inalteradas.

---

## D. Testes executados (forense)
| Verificação | Resultado |
|---|---|
| `npx tsc --noEmit` | ✅ 0 erros |
| `npm run lint` | ✅ 0 erros (123 warnings pré-existentes) |
| `npx vitest run` (unit) | ✅ 881/881 |
| `npm run test:integration` (Postgres real) | ✅ 89/89 |
| `npm audit --omit=dev --audit-level=high` | ✅ 0 vulnerabilidades |
| **Reprodução E1** (teste temporário, 25 corridas) | ⚠️ **defeito reproduzido** — ver E1 |
| E2E navegador real / carga / produção | ⛔ Bloqueado |

### Varreduras estáticas profundas (evidência)
- `catch {}` / catch vazio em código: **0**.
- `: any` explícito em produção: **1** (praticamente erradicado).
- `console.*` em código server: **3** — todos `console.error('Error in postCommitHook', err)` (`operador/ocorrencias/actions.ts:174`, `tecnico/analises/actions.ts:127`, `server/leituras/service.ts:115`). **Contradiz** o CLAUDE.md ("zero console.* server-side"); são logs crus fora do Pino (sem masking/estrutura). Severidade baixa.
- `dangerouslySetInnerHTML`: **2**, ambos **estáticos e seguros** (CSS `@keyframes` em `gestor/dashboard/loading.tsx`; script anti-flash de tema em `components/theme-provider.tsx`) — **sem** dado de usuário → sem XSS.
- `mock/stub/TODO/FIXME/placeholder` em produção: **nenhum real** (os matches são classes Tailwind `placeholder:` e comentários `@tenant-safe`).

---

## E. Lista de defeitos

### E1 — ALTA · **CONFIRMADO (REPRODUZIDO)** · corrida na revisão de contagem de estoque
**Arquivo:** `src/server/estoque/service.ts#revisarContagemDeEstoque` (L110–166).
**Causa raiz:** a checagem `review_status !== 'PENDING'` (L119) roda **antes** do `lockProduct` (L125), que trava a linha de `chemical_products` — **não** a linha da contagem. Na aprovação, o ajuste de estoque é criado (L146–154) e só então o `updateMany` do status (L155–158) usa `where: review_status:'PENDING'` — mas **o `count` retornado nunca é lido** (ao contrário de M-01/M-02/M-05, que sempre fazem `if (count===0) abortar`). Resultado: o guard protege o *campo de status*, não o *efeito colateral* (o lançamento de estoque).

**Reprodução (Postgres real, 25 corridas `Promise.all([aprovar(gestorA), rejeitar(gestorB)])` sobre a mesma contagem PENDENTE, saldo 10, contagem 6):**
- **25/25 → ambos retornaram `ok:true`** (dupla decisão: a UI confirma "feito" para os dois gestores simultaneamente, em 100% dos casos).
- **7/25 (~28%) → contagem terminou `REJECTED` mas o ajuste "Ajuste por contagem física (aprovada pelo gestor)" foi criado** — saldo movido para 6 numa contagem oficialmente **rejeitada**.

**Impacto:** inconsistência de inventário sob concorrência — exatamente o que o M-04 (trava + separação de funções) pretendia impedir. Dois gestores revisando a mesma pendência (cenário real) corrompem o saldo e recebem ambos "sucesso". Não há teste que pegue isso (`p0-estoque-concorrencia.int.test.ts` cobre saídas/contagem-vs-saída, não duas revisões).
**Correção:** ler o `count` dos dois `updateMany` de transição e abortar se `0` **antes** de qualquer efeito colateral; e travar a linha da contagem (ex.: advisory lock por `countId`, ou `SELECT ... FOR UPDATE` na própria contagem) em vez de só o produto. **Critério de aceite:** repetir as 25 corridas → no máximo 1 decisão com efeito, 0 ajuste em contagem rejeitada, 1 das chamadas retorna erro "já revisada".

### E2 — MÉDIA · reincidência/escalonamento de NC (M-07) sem `logAudit`
`src/server/occurrences/criar.ts#agruparReincidencia` (L151–178) e a criação automática (L112–126) não auditam. Escalar severidade (muda prazo/alerta) não deixa rastro. **Aceite:** escalonamento gera `audit_logs` com before/after.

### E3 — MÉDIA · `criarOcorrenciaAutomatica` não revalida `parameterId` contra o tenant
Valida `collectionPointId`, não `parameterId` (chave da dedup). Latente (os 3 chamadores validam), mas um 4º chamador futuro abre cruzamento entre tenants sem o guardião detectar. **Aceite:** teste com parâmetro de outro tenant → rejeitado dentro da função.

### E4 — MÉDIA (operacional) · `.env` local aponta para o Supabase de PRODUÇÃO
`DATABASE_URL` do `.env` aponta para supabase/pooler (não localhost). Um `migrate`/`vitest` sem sobrescrever a env bate em prod — acidente a 1 comando. **Aceite:** `.env` de dev → banco local.

### E5 — BAIXA · 3 `console.error` em código server (post-commit hook)
Logs crus fora do Pino (sem masking). Também desmente a doc. **Aceite:** trocar por `logger.error`.

### E6 — BAIXA · erro do Gemini ao cliente sem sanitizar
`gestor/importacao/actions.ts` (~L151–156). Sem vazar segredo, mas fere "stack trace não vaza". **Aceite:** mensagem genérica + cru só no log.

### E7 — BAIXA (nota) · exceção de MANAGER em M-01 incondicional (texto≠regra).
### E8 — BAIXA (backlog) · entrada/saída de estoque sem `logAudit`.

---

## F. Segurança e multi-tenancy (forense)
Confirmado forte no nível de código (ver `AUDITORIA-INDEPENDENTE §F` + auditoria por subagente): autorização via `requirePermission`/`getActor` sem `session.user.role` na mão; guardião estático de isolamento; RLS deny-all aplicado; `pg_advisory_xact_lock` parametrizado; magic bytes + rate limit no import; `npm audit` 0 HIGH; **0 XSS** (os 2 `dangerouslySetInnerHTML` são estáticos). **Aberto:** E3 (defesa em profundidade). **Não comprovado (Bloqueado):** IDOR cross-tenant em runtime, CSRF em navegador real, isolamento observado no banco de produção.

---

## G. Arquitetura e banco
43 models, 68 `@@index`, 9 `@@unique` + índices únicos parciais, 20 `onDelete`, 5 soft-delete, 40 `@default(now)`, 0 `Json` nativo (JSON como String → validação na aplicação, risco de dado malformado não barrado pelo banco). Camadas `server/*` (serviço puro + action fina) consistentes. Dívida: arquivos de ~780/480/450 linhas (M-22/23, não feitos). **Integridade sob concorrência:** o padrão "trava + `updateMany` condicionado + checa `count`" é correto em M-01/02/05, mas **quebrado em M-04/revisão** (E1).

---

## H. Performance e escalabilidade
Sem benchmark (não executável aqui). `findMany` sem `take` em 16 arquivos — amostra (export por período, dashboard agregado) sustenta "limitado", mas `notifications.ts`, `relatorios/actions.ts`, `push-service.ts` merecem olhar sob volume. Gargalo real = teto de conexões do plano Supabase, não o código. Cenários 10/100/1.000/10.000 orgs: ver `AUDITORIA-INDEPENDENTE §G` (condicionais, sem medição). **Falta medir:** p50/p95/p99, saturação de conexões, crescimento de histórico.

---

## I. Prontidão comercial
- **Demonstração:** ✅ pronta.
- **Piloto controlado:** ✅ com ressalva — **corrigir E1 antes** (dois gestores existem em plantas reais).
- **Primeiros pagantes autônomos:** ⚠️ **não** até E1 + restore testado + E4.
- **Operação ampla:** ❌ falta escala medida, DR comprovado, billing, onboarding autônomo.

---

## J. Plano de ação
- **P0:** E1 — corrigir corrida da revisão de contagem + **teste de regressão** (as 25 corridas viram teste permanente). É o único defeito que corrompe dado sob uso normal.
- **P1:** E4 (`.env`→local) · E2 (`logAudit` na reincidência) · **testar restore de backup**.
- **P2:** E3 (revalidar `parameterId`) · E8 (auditar entrada/saída) · revisar `findMany` sem `take` nos 3 arquivos citados.
- **P3:** E5 (`console.error`→logger) · E6 (sanitizar erro Gemini) · E7 (texto do bypass MANAGER) · M-22/23 (quebrar arquivos grandes) · M-26 (o único `any`).

---

## K. Nota de maturidade (ajuste forense)
Mantidas as notas do relatório estrutural, com **uma revisão para baixo**:
- **Qualidade dos dados/Integridade sob concorrência:** de 3 → **2** (E1 reproduzido: corrompe inventário sob uso concorrente real).
Demais: Funcionalidade 3 · Arquitetura 3 · Segurança 3 · Multi-tenancy 3 · Testes 3 · Performance 2 · Escalabilidade 2 · Observabilidade 3 · Operação/DR 2 · UX 3 · Comercial 2.

---

## L. Conclusão final
- **O app funciona de verdade?** Sim no escopo validável (unit + integração em PG real + build + CI verde). Fluxos felizes single-user comprovados por teste.
- **Fluxos comprovados:** autenticação/sessão, permissões, isolamento (estrutural), leituras/análises/ocorrências/turnos/estoque single-user, dedup de NC, import com limites, cron idempotente.
- **Não comprovados:** E2E em navegador real por perfil, envio real de notificações, produção, carga.
- **Defeito que impede uso comercial autônomo:** **E1 (reproduzido)** — corrida na revisão de contagem.
- **Risco de vazamento entre clientes:** nenhum reproduzido; controles fortes no código (guardião + RLS); E3 é latente; runtime não testado.
- **A arquitetura suporta crescimento?** Provavelmente até centenas de orgs com upgrade de plano Supabase; **sem medição** acima disso.
- **Limites efetivamente medidos:** nenhum de carga. Medido: corretude (testes) e a corrida E1.
- **O que resolver primeiro:** E1 (com teste de regressão), depois E4 e restore testado.
- **O que falta para certeza:** E2E por perfil, teste de carga em staging, validação de isolamento em runtime, teste de restore.

---
*Forense read-only. O único artefato de teste criado (reprodução de E1) foi temporário e removido; nada do produto foi alterado. Evidência de E1 reproduzível recriando o teste descrito na seção E1 contra Postgres local.*
