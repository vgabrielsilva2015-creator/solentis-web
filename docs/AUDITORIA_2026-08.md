# Auditoria Técnica Solentis — 2026-08-05

Auditoria multiangular do projeto conduzida por 6 lentes independentes (5 subagentes
especializados + análise de performance). Documento de diagnóstico: **nada aqui foi
corrigido ainda** — é a base para o plano priorizado da seção final.

## ⚠️ Contexto no momento da auditoria (ler primeiro)

1. **Edição concorrente:** durante a auditoria, outra sessão de IA estava editando este
   mesmo diretório em paralelo (confirmado pelo dono — trabalho intencional). Arquivos que
   surgiram/mudaram no meio da análise: `prisma/schema.prisma`, `gestor/dashboard/page.tsx`,
   `gestor/relatorios/page.tsx`, `gestor/laudos/importar/actions.ts`,
   `tecnico/analises/actions.ts`, `operador/ocorrencias/actions.ts`, e os **novos**
   `src/lib/occurrences.ts`, `src/components/pdf/AutomonitoramentoDocument.tsx`,
   `src/app/gestor/relatorios/automonitoramento-download-btn.tsx` (feature de relatório PDF
   de automonitoramento + refactor de criação de ocorrências, em andamento).
2. **Build quebrado:** no fechamento da auditoria, `npx tsc --noEmit` falhava com **11 erros**
   (ver item CRIT-01). Alguns achados abaixo (occurrences.ts, relatorios) referem-se a código
   ainda em construção pela sessão paralela — os `arquivo:linha` podem ter mudado; **re-rode
   `tsc --noEmit` antes de agir**.
3. **Trabalho local não commitado revisado:** compressão de imagem no cliente
   (`src/lib/compress-image.ts` + integração em ~9 forms) e suporte a vírgula decimal em
   leituras. **Veredito dos revisores: bem construído, não enfraquece a validação
   server-side** (magic bytes/tamanho continuam sendo checados no servidor; `z.number()`
   rejeita `NaN` no parse decimal).

---

## 🔁 RE-AUDITORIA — 2026-08-05 (pós-"fase 4", commit `f6b4ccc`, branch `main`)

Segunda passada pelas 6 lentes sobre o código **já corrigido e commitado** pela sessão paralela.
Working tree limpo, `tsc --noEmit` verde, 162 testes passando. Abaixo, o delta.

### ✅ Resolvido e verificado (2+ lentes confirmaram)
| Item | Como foi resolvido |
|---|---|
| **CRIT-01** build | null-guards `if (task.shift_instance && ...)` em `turnos/actions.ts`; shape de `relatorios/page.tsx` realinhado. |
| **ALTO-01** push em rollback | `handleNewOccurrence` retorna closure empilhada em `postCommitHooks`, executada só após o `$transaction`. Padrão consistente nas 3 rotas. |
| **ALTO-02** push duplicado | bloco antigo removido de `tecnico/analises/actions.ts`. |
| **ALTO-03** `getNotifications` | filtra `opened_by: user.id` + `orderBy: opened_at desc`. |
| **ALTO-04** estoque em JS | novo `src/lib/stock-queries.ts` (`groupBy`/`_sum`), adotado nas 4 telas. Fecha refactor #5. |
| **ALTO-05** dashboard sem bound | `AND ${dateCol} >= ${periodoAnteriorInicio}` no `WHERE`. |
| **MED-03** upload equipamento | `saveImageUpload(file,'equipments',5MB)` valida tamanho antes do buffer. Fecha refactor #3. |
| **MED-06** unique nullable | `legal_reference String @default("")`. |
| Refactors #4, #8, #9 | `calcularNaoConformidade` reusado; `catch unknown`; limpezas mortas originais. |

### ❌ Continua aberto (sem mudança)
- **CRIT-02** `email @unique` — inalterado; **precisa das 2 queries no Supabase** (decisão de produto). Maior risco real.
- **MED-04** RBAC de leituras (OPERATOR/MANAGER/TECHNICIAN escrevem) — sem decisão documentada.
- **MED-05** índice parcial anti-race — entrou só nota **genérica** no topo do schema; falta comentário no model `ShiftInstance` + passo no RUNBOOK.

### ⚠️ Resolvido pela metade / feito errado
- **MED-01 índices — execução equivocada.** `prisma/sql/add_indexes.sql` criou **4 índices duplicados** de `@@index` já existentes no schema (`analyses`, `external_analyses`, `stock_entry`, `stock_exit` por `tenant_id,parameter_id/product_id,data`) → só custo de escrita, zero ganho. O único útil é `idx_readings_tenant_parameter_created`. **Os índices que a query real precisa continuam faltando:**
  ```sql
  CREATE INDEX IF NOT EXISTS idx_readings_tenant_created       ON "readings" ("tenant_id","created_at");
  CREATE INDEX IF NOT EXISTS idx_analyses_tenant_collected     ON "analyses" ("tenant_id","collected_at");
  CREATE INDEX IF NOT EXISTS idx_extanalyses_tenant_collected  ON "external_analyses" ("tenant_id","collected_at");
  CREATE INDEX IF NOT EXISTS idx_stock_exit_tenant_used        ON "chemical_stock_exits" ("tenant_id","used_at");
  CREATE INDEX IF NOT EXISTS idx_occurrences_tenant_status_deadline ON "occurrences" ("tenant_id","status","deadline");
  ```
  (+ limpar os 4 duplicados; refletir no schema com `@@index`.)
- **MED-02 `findMany` sem `take`** — só parcialmente. Seguem sem `take`: `gestor/ocorrencias/page.tsx:60-69` (`allStats`, MTTR em JS sobre histórico total — **pior pendência de escala**), `gestor/manutencao/{corretivas,preventivas}/page.tsx`, `gestor/dashboard/page.tsx:168` (`activeOccurrences`), `api/export/route.ts` branch `occurrences`.

### 🆕 Novos achados desta passada (introduzidos pela sessão paralela)
- **[MÉDIO-ALTO — bug de dados] `getReportData` com `take: 1000` SEM `orderBy`** (`gestor/relatorios/actions.ts:20-34`). Se o período tiver >1000 leituras, o subconjunto é **não-determinístico** → `min/max/avg`/contagem de não-conformidade do relatório ficam **incorretos e não-reprodutíveis** (mesmo relatório, números diferentes). Correção real: `groupBy(['parameter_id'], { _min, _max, _avg, _count })` — elimina o limite arbitrário e o não-determinismo. Também: `include: { collection_point: true }` **morto** e `parameter: true` trazendo linha inteira (usar `select`).
- **[MÉDIO — compliance] PDF de automonitoramento trunca em silêncio** (`gestor/relatorios/page.tsx`, `take: 500`). Mês com >500 análises (interna+externa) gera "Documento oficial de Compliance" **incompleto sem aviso** na UI. Correção: avisar quando `total >= 500` (ou paginar/stream).
- **[MÉDIO — paridade] `saveMappedReadings` não dispara plano de ação** (`gestor/laudos/importar/actions.ts:263-317`). NC vinda de laudo importado abre ocorrência **sem** `handleNewOccurrence` → sem `ShiftTask` de ação e sem push aos gestores, diferente de leitura/análise manual. Chamar `handleNewOccurrence` para paridade.
- **[BAIXO] `console.error` nos 3 `postCommitHooks`** (`leituras`/`analises`/`ocorrencias` actions) — **pula o masking do Pino** (risco de vazar subscription/PII um dia) e é duplicação literal 3×. Extrair `runPostCommitHooks(hooks)` com `getLogger`. *(4 lentes apontaram.)*
- **[BAIXO] `run-indexes.js` na raiz do repo** — script ad-hoc fora da convenção (`prisma db execute`); remover do versionamento após aplicar os índices.
- **[BAIXO] import morto** de `getLogger` em `tecnico/analises/actions.ts`; `getReportData` sem Zod nas datas; `Record<string,any>` em `getReportData`; 2 botões de download de PDF quase idênticos.
- **[NOTA] `ShiftTask.occurrence_id` `onDelete: Cascade`** dormente (não há hard-delete de `Occurrence` hoje). Se um expurgo LGPD for introduzido, a tarefa de remediação some sem rastro — considerar `Restrict`/`SetNull` se esse cenário surgir.

### Refactors ainda pendentes
#1 unificar 3 `occurrence-form.tsx` (~750 linhas dup), #2 componentes-folha de equipamento gestor↔técnico, #6 `any` nas telas de escala (27×), #7 `any` no `dashboard-client.tsx` (9×). `AutomonitoramentoDocument.tsx` está limpo (não é alvo).

### 📋 Plano revisado (o que sobrou)
- **Fase 0 — Infra/decisão (dono):** CRIT-02 rodar as 2 queries no Supabase e decidir (a)/(b); MED-04 decidir RBAC de leituras.
- **Fase 1 — Bug de dados:** `getReportData` `orderBy`+`groupBy` (relatório de compliance com número errado); paridade de `saveMappedReadings`; aviso de truncamento do PDF.
- **Fase 2 — Índices corretos:** aplicar os 5 índices reais via SQL aditivo, limpar os 4 duplicados, refletir no schema, remover `run-indexes.js`.
- **Fase 3 — Escala:** `take`/`groupBy` em `allStats`, manutenções, `activeOccurrences`, export de ocorrências.
- **Fase 4 — Consistência/qualidade:** `runPostCommitHooks` + logger; imports mortos; MED-05 (comentário no schema + RUNBOOK); depois refactors #1/#2/#6/#7 (mostrar diff).

---

## 🔴 CRÍTICO

### CRIT-01 — Build quebrado (`tsc --noEmit`, 11 erros) [code-review]
Bloqueia deploy. Dois focos, ambos causados por mudanças da sessão paralela:

- **`src/app/operador/turnos/actions.ts` (443, 515, 694-695, 723)** — `TS18047 'possibly null'`.
  O schema passou `ShiftTask.shift_instance_id` para `String?` (relação `ShiftInstance?`), mas
  `concluirTarefa`/`pularTarefa`/`repetirTarefa` acessam `task.shift_instance.status` /
  `original.shift_instance.id` sem guard de null. **Risco em runtime:** tarefa vinculada a
  `occurrence_id` (sem turno) chega nessas actions → `TypeError: Cannot read properties of null`.
- **`src/app/gestor/relatorios/page.tsx` (121, 130, 157, 219)** — a query de análises foi
  alterada (aparentemente o refactor `include`→`select`) mas o consumidor ainda espera o shape
  antigo (`rawAnalises` tratado como array quando virou `{ name }`; `.map`/`.length`/`.name` no
  tipo errado).

**Correção:** guardas de null nas 3 actions de turno; realinhar o shape em `relatorios/page.tsx`
ao novo retorno da query. *Obs.: ambos os arquivos estão sob edição paralela — coordenar antes.*

### CRIT-02 — `email @unique` dessincronizado entre schema e banco [prisma-expert]
`prisma/schema.prisma:66` declara `email String @unique` (global), mas o histórico tem
`20260624180748_remove_global_email_unique` que **derrubou** esse índice no mesmo dia em que
`20260624121240_email_unique_global` o criou. A unicidade por tenant já existe em
`@@unique([tenant_id, email])` (schema:126).

**Por que é crítico:** `src/lib/auth.ts:64-66` resolve o login com
`prisma.user.findUnique({ where: { email } })` — **sem tenant**. Se o banco realmente não tem
mais a unicidade global (objetivo aparente: permitir mesmo e-mail em tenants diferentes), o
login pode resolver para o usuário do **tenant errado**. Além disso, um `npx prisma db push`
(método sancionado no projeto) vai ver o índice faltando e tentar recriá-lo — falhando se já
houver e-mails duplicados, ou reintroduzindo o bug.

**Ação — verificar o estado real no Supabase antes de qualquer coisa:**
```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'users' AND indexname = 'users_email_key';
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
```
Decisão de produto: (a) manter login global por e-mail → reaplicar o índice único global via SQL
aditivo (bate com o schema atual); ou (b) permitir e-mail duplicado entre tenants → remover
`@unique` da linha 66 **e** reescrever `auth.ts` para resolver o tenant no login (subdomínio/
seletor de planta). (a) é o caminho compatível com o código atual.

---

## 🟠 ALTO

### ALTO-01 — Push fora da transação dispara mesmo em rollback [code-review]
`src/lib/occurrences.ts:22-77` (novo, sessão paralela) — `handleNewOccurrence(tx, occurrence)`
cria a `ShiftTask` dentro da transação (`tx`), mas agenda o push com
`setTimeout(async () => {...}, 0)` usando o **`prisma` global (fora da tx)**, não aguardado.
Se algo posterior na mesma `$transaction` falhar (ex.: `occurrencePhoto.createMany`, `logAudit`),
tudo faz rollback — occurrence e task deixam de existir — mas o push já enfileirado dispara,
mandando "Nova Não Conformidade" com link `/gestor/ocorrencias/{id}` para um registro
inexistente (404 ao clicar). **Correção:** disparar o efeito colateral só após o commit da
transação (retornar os dados do `$transaction` e notificar depois, ou usar um hook pós-commit).

### ALTO-02 — Notificação duplicada em análises não-conformes [code-review]
`src/app/tecnico/analises/actions.ts:112-158` — o push antigo (`sendPushToRole(..., 'MANAGER')`,
L145-158) não foi removido ao introduzir `handleNewOccurrence` (L141), que já notifica MANAGER.
Nas outras duas rotas migradas (leituras, laudos) o push antigo foi removido; só análises ficou
duplicado → gestor recebe **2 pushes** para o mesmo evento. **Correção:** remover o bloco antigo.

### ALTO-03 — `getNotifications` vaza tarefas de outro operador [prisma-expert]
`src/app/actions/notifications.ts:57-63` — `findFirst({ where: { tenant_id, status: 'OPEN' } })`
sem `opened_by` nem `orderBy`. Com >1 turno aberto no tenant (dois operadores, ou turno que
cruza meia-noite), pega **qualquer** turno de forma não-determinística e mostra as tarefas dele
ao usuário logado. **Correção:** filtrar `opened_by: user.id` + `orderBy: { opened_at: 'desc' }`
(padrão já usado em `operador/dashboard/page.tsx:69-73`).

### ALTO-04 — Estoque agrega histórico inteiro em JS [performance + prisma, convergentes]
`operador/dashboard/page.tsx:45-53`, `operador/estoque/page.tsx:13-18`,
`tecnico/estoque/page.tsx`, `gestor/produtos-quimicos/page.tsx:8-16` — todas fazem
`findMany` com `include: { entries, exits }` e somam com `.reduce()` em JS. Carrega **todo o
ledger** (append-only, nunca apagado) de todos os produtos, a cada carga — cresce sem limite com
o tempo de uso. Atinge o dashboard do operador (tela mais visitada). O padrão correto **já existe**
em `operador/estoque/actions.ts:64-68` (`aggregate({ _sum })`). **Correção:** `groupBy(['product_id'],
{ _sum: { quantity: true } })` para entries e exits + `Map` por produto.

### ALTO-05 — Dashboard do gestor varre histórico total mesmo pedindo "7 dias" [performance]
`gestor/dashboard/page.tsx:91-103` — as contagens usam `COUNT(*) FILTER (WHERE data >= ...)`, mas
o `WHERE` externo filtra **só `tenant_id`**; o recorte de data é pós-scan. O Postgres varre o
histórico inteiro de `readings`/`analyses`/`external_analyses` do tenant a cada carga.
**Correção (≈1 linha):** adicionar `AND ${dateCol} >= ${periodoAnteriorInicio}` ao `WHERE` (o valor
já é calculado na função, L51). Não é cache — é bound de query; não introduz staleness.

---

## 🟡 MÉDIO

### MED-01 — Índices ausentes para padrões reais de consulta [performance + prisma]
Aplicar via **SQL aditivo** (`prisma/sql/*.sql` com `IF NOT EXISTS` + `db execute`), depois refletir
no `schema.prisma` (índices completos a DSL v5 suporta) e `prisma generate`:
- `Reading` → `@@index([tenant_id, created_at])` (dashboard filtra `created_at`, mas o índice é em
  `recorded_at`).
- `Occurrence` → `@@index([tenant_id, status, deadline])` (filtro+ordenação das 3 listagens).
- `ChemicalStockExit` → `@@index([tenant_id, used_at])` (dashboard/relatório filtram sem `product_id`,
  então o índice `(tenant_id, product_id, used_at)` não serve).
- Avaliar `Analysis`/`ExternalAnalysis` → `@@index([tenant_id, collected_at])`.

### MED-02 — `findMany` sem `take` (viola regra do projeto) [performance + prisma]
- `gestor/manutencao/corretivas/page.tsx:16-23` e `.../preventivas/page.tsx:16-23` — sem paginação
  (existe versão paginada em `manutencao/preventivas/page.tsx` para copiar).
- `gestor/ocorrencias/page.tsx:60-69` (`allStats`) — carrega todas as ocorrências do tenant para
  contar/calcular MTTR em JS. Trocar por `groupBy` + `$queryRaw` para o MTTR (`AVG(EXTRACT(EPOCH...))`).
- `gestor/dashboard/page.tsx:166` (`activeOccurrences`) — adicionar `take` (ex.: 20).
- `gestor/relatorios/actions.ts:20-33` (`getReportData`) — range arbitrário; usar `groupBy`
  `_min/_max/_avg`. Também tem `include: { collection_point: true }` **morto** (nunca lido) e
  `parameter: true` trazendo linha inteira → trocar por `select`.
- `api/export/route.ts:37-44` — branch de `occurrences` sem `take: 1000` (as outras 4 têm).

### MED-03 — Upload de equipamento sem limite de tamanho no servidor [security + code-review]
`tecnico/equipamentos/actions.ts` (`criarEquipamento`, `editarEquipamento`) — `photo_file`/
`manual_file` passam por `sniffImageType`/assinatura `%PDF` mas **sem checagem de tamanho** (ao
contrário de leituras/ocorrências/tarefas, que têm `MAX_IMG_BYTES`/`MAX_FILE_SIZE`). A compressão
client-side é burlável. Hoje coberto indiretamente pelo cap de ~4,5 MB da Vercel (413 genérico),
mas inconsistente. **Correção:** adicionar o mesmo guard de tamanho por defesa em profundidade.

### MED-04 — RBAC: leituras aceitam escrita de MANAGER/TECHNICIAN [security]
`operador/leituras/actions.ts:18-24` (`requireOperator`) libera OPERATOR, MANAGER e TECHNICIAN a
escreverem leituras; `leituras/nova/page.tsx` não tem guard extra de role. Contraria a "regra de
ouro" (escrita restrita ao dono). **Não é IDOR nem escalonamento** (MANAGER já é a autoridade do
tenant; `recorded_by` grava quem enviou). **Ação:** decisão de produto — restringir a `['OPERATOR']`
ou **documentar como deliberado** (como já foi feito para ocorrências/estoque na Onda 3).

### MED-05 — Índice único parcial anti-race não representado no schema [prisma-expert]
`prisma/sql/add_unique_open_shift.sql` (índice `uniq_shift_instance_ativa`, parcial) fecha a race de
turno duplicado, mas a DSL do Prisma v5 não suporta índice parcial → o Prisma "não sabe" que ele
existe e um `db push` pode **descartá-lo silenciosamente**, reabrindo a race. **Ação:** comentário
forte no model `ShiftInstance` apontando o arquivo SQL + passo no runbook de checagem pós-`db push`:
```sql
SELECT indexname FROM pg_indexes WHERE tablename='shift_instances' AND indexname='uniq_shift_instance_ativa';
```

### MED-06 — `ParameterLimit` unique com coluna nullable [prisma-expert]
`schema.prisma:226-243` — `@@unique([tenant_id, parameter_id, matrix, legal_reference])` com
`legal_reference String?`. Em Postgres `NULL != NULL`, então múltiplas linhas com
`legal_reference = NULL` **não** violam a constraint (duplicata latente). Hoje o seed sempre preenche
a referência, então é risco latente. **Correção:** sentinela `@default("")` ou índice único parcial
`WHERE legal_reference IS NULL`.

---

## 🟢 BAIXO / QUALIDADE

### Refatorações (sem mudança de comportamento) [refactor]
Ordenadas por impacto/esforço:
1. **Unificar 3 `occurrence-form.tsx`** (operador/técnico/gestor, ~95% idênticos, ~750 linhas
   duplicadas) → um `src/components/occurrences/occurrence-form.tsx` parametrizado por
   `draftKey`/`redirectTo`. Mesma action nos três.
2. **Compartilhar componentes-folha de equipamentos** gestor↔técnico (`conclude/status/toggle-button`,
   `corrective-form`, `edit-form` — diff = só o path do import) → `src/components/equipment/`.
3. **Helper `saveImageUpload(file, folder)`** em `src/lib/storage.ts` — bloco de upload (buffer →
   `sniffImageType` → uuid → `saveUpload`) repetido 6× (2× no mesmo arquivo de equipamentos).
4. **Reusar `calcularNaoConformidade`** (já testado em `readings-utils.ts`) no client de
   `reading-form.tsx:160` e `analysis-form.tsx:109` em vez de reimplementar a regra CONAMA inline.
5. **`getProductsWithStock`/`getProductWithStock`** em `src/lib/stock-queries.ts` (separado do puro
   `stock-utils.ts`) — centraliza query+derivação de estoque de 5-7 páginas. (Converge com ALTO-04.)
6. **Tipar props das telas de escala** (`escala-gestor-client.tsx` 16× `any`,
   `escala-client.tsx` 11×) via `Prisma.XGetPayload<>` — maior redução de `any` do projeto, baixo risco.
7. **Tipar `dashboard-client.tsx`** (~9 `any`) via `Awaited<ReturnType<typeof ...>>`.
8. **`catch (err: any)` → `unknown`** em `laudos/importar/actions.ts` (4×).
9. Limpezas mortas: `import getLogger` sem uso em `leituras/actions.ts:12`; `"..."` sempre concatenado
   em `occurrences.ts:26` mesmo com descrição < 50 chars.

### Candidatos a tipo nativo do Postgres (opcional, invasivo, SQL aditivo) [prisma-expert]
- `@db.Date` para `ShiftInstance.date`, `ShiftScale.date`, `MaintenanceDay.date` (hoje `DateTime`
  com zeragem manual de hora dependente de `TZ` — frágil).
- Enums nativos para `role`/`status`/`severity`/`priority` (validar valores existentes antes do cast).
- `jsonb` para `metadata_origin`, `checklist_data`, `AuditLog.before`/`after` (permite indexar/filtrar
  auditoria por conteúdo).
- `ParameterHistory` e `OccurrenceComment` sem `tenant_id` próprio → denormalizar antes de habilitar
  RLS (DB-03), senão as políticas precisam de subquery contra a tabela pai.
- Model `Session` morto (JWT strategy) — limpeza.

### Segurança — pendências de infra (não é código, já em CLAUDE.md) [security]
RLS no Supabase (DB-03, maior alavancagem), rotação do token do GitHub, teste de restore de backup,
conferência de envs na Vercel. Auditoria anterior (2026-07-28) segue **sem regressões**.

---

## Convergências entre lentes (sinal forte)
- **Estoque em JS** apareceu em *performance* **e** *prisma* → ALTO-04 (prioridade alta real).
- **Upload de equipamento sem limite** apareceu em *security* **e** *code-review* → MED-03.
- **`findMany` sem `take` / índices** apareceram em *performance* **e** *prisma* → MED-01/MED-02.
- **Duplicação de estoque/ocorrência** apareceu em *refactor* e ecoa nos achados de *performance*.

---

## Plano priorizado (proposta)

> Cada bloco é commitável isolado, em português, com `tsc --noEmit` verde + testes antes do commit.
> Regras invioláveis respeitadas (tenant_id, Zod+guard, snapshots de limite, SQL aditivo — nunca
> `migrate dev`). Coordenar com a sessão paralela nos arquivos compartilhados.

**Fase 0 — Desbloquear (urgente)**
- CRIT-01: corrigir os 11 erros de `tsc` (null-guards em `turnos/actions.ts`; shape em
  `relatorios/page.tsx`). *Coordenar — arquivos sob edição paralela.*
- CRIT-02: rodar as 2 queries de diagnóstico no Supabase e decidir (a)/(b) do `email @unique`.

**Fase 1 — Correção (bugs de comportamento)**
- ALTO-01 push pós-commit; ALTO-02 remover push duplicado; ALTO-03 filtrar `opened_by` em
  `getNotifications`.

**Fase 2 — Performance/escala (SQL aditivo + queries)**
- ALTO-04 estoque via `_sum`; ALTO-05 bound de data no dashboard; MED-01 índices; MED-02 `take`.

**Fase 3 — Hardening/consistência**
- MED-03 limite de upload; MED-04 decidir RBAC de leituras; MED-05 doc do índice parcial;
  MED-06 unique nullable.

**Fase 4 — Qualidade (refactor, sem mudar comportamento)**
- Itens 3, 4, 8, 9 (baixo risco) primeiro; depois 1, 2, 6 (mostrar diff antes — mexem em vários
  arquivos).

**Fora de escopo desta rodada (dono/infra):** RLS, rotação de token, restore de backup, tipos
nativos do Postgres (invasivo).
