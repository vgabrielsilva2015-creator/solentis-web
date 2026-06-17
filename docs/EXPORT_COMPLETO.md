# SOLENTIS — Export Completo do Projeto

> Gerado automaticamente. Contém: contexto, decisões, schema, código-fonte completo e testes.

---
## CONTEXTO E HISTÓRICO (CLAUDE.md)

### `CLAUDE.md`
```markdown
# Estado do Projeto Solentis

## Visão Geral
Sistema web de gestão de ETE (Estação de Tratamento de Efluentes). Documento-fonte da verdade: BRIEFING.md (leia SEMPRE ao retomar).

## Status Atual
✅ Item (a) — Verificação de ambiente: Node.js e Git OK
✅ Item (b) — Resumo do briefing entendido
✅ Item (c) — Contradições, ambiguidades e riscos resolvidos
✅ Item (d) — Decisões antes do código tomadas (ver seção 17 do BRIEFING.md)
✅ Adição pós-d — Preparo para sensores (sem implementação no MVP)
✅ Item (e) — PLANO em 12 fases aprovado (29–44h) — ver /docs/PLANO.md
✅ Item (f) — Modelo de dados aprovado (21 tabelas, 9 enums, multi-tenant) — ver /docs/MODELO_DE_DADOS.md
✅ Item (g) — Fase 1 (scaffold) 100% CONCLUÍDA — ver seção abaixo
✅ Fase 5 — Leituras de campo CONCLUÍDA — ver seção abaixo
✅ Fase 6 — Análises laboratoriais CONCLUÍDA — ver seção abaixo
✅ Fase 7 — Equipamentos e manutenções CONCLUÍDA — ver seção abaixo
✅ Fase 8 — Ocorrências CONCLUÍDA — ver seção abaixo
✅ Fase 9 — Turnos CONCLUÍDA — ver seção abaixo
✅ Feature extra — Tarefas por Turno CONCLUÍDA — ver seção abaixo
✅ Feature extra — Controle de Estoque de Produtos Químicos CONCLUÍDA — ver seção abaixo
✅ Fase 10 — Dashboards CONCLUÍDA — ver seção abaixo
✅ Fase 11 — Auditoria, Testes e Hardening CONCLUÍDA — ver seção abaixo
✅ Fase 12 — Polish Mobile CONCLUÍDA — ver seção abaixo

## Decisões-chave (resumo)
- Nome: Solentis
- Stack: Next.js 14+, TypeScript, Tailwind, SQLite+Prisma, NextAuth, Zod, Recharts, shadcn/ui
- Idioma: técnico em inglês, usuário/comentários em pt-BR
- Modo offline: NÃO no MVP (talvez v1.0, "a avaliar")
- Sensores: NÃO no MVP, mas schema preparado (campos origem/metadata_origem)
- 3 perfis: Operador, Técnico, Gestor (matriz de permissões na seção 4 do briefing)
- Credencial inicial seed: admin@solentis.local / Admin@123 (sistema obriga troca no 1º login)
- Multi-tenant desde o MVP via tenant_id + middleware Prisma (seed: id="default")
- Servidor Next.js validado em :3000 — Fase 1 100% concluída
- Tailwind v4 instalado (config no CSS, não em tailwind.config.ts)
- shadcn/ui v4.7 preset Nova + Radix + base neutral (ver seção "Descobertas" abaixo)

### Tabelas (21)
tenants, users, sessions, login_attempts, quality_parameters, analysis_methods,
equipment_categories, collection_points, shifts, occurrence_severity_defaults,
readings, analyses, equipment, preventive_maintenances, corrective_maintenances,
occurrences, occurrence_photos, shift_instances, shift_handovers, audit_logs, parameter_history

### Enums (9)
Role, DataOrigin, OccurrenceSeverity, OccurrenceStatus, MaintenanceStatus,
Priority, ShiftInstanceStatus, HandoverStatus, AuditAction

## Status da Fase 1 (Scaffold) — CONCLUÍDA em 2026-05-14

### ✅ Tudo concluído e validado

- create-next-app com TypeScript, Tailwind v4, App Router, ESLint
- Paths `@/*` configurados via tsconfig.json
- `.gitignore` mesclado (entradas críticas: *.db, uploads/, backups/, !.env.example)
- Estrutura `src/app/`, `public/`, `docs/` criadas
- shadcn/ui v4.7 instalado (preset Nova, Radix, base neutral) — commit `8d781b4`
  - Arquivos: `components.json`, `src/lib/utils.ts`, `src/components/ui/button.tsx`
  - `src/app/globals.css` com CSS variables oklch + dark mode (Tailwind v4)
- Prisma v7 inicializado (SQLite, prisma.config.ts, dotenv) — commit `a15628d`
  - Schema em `prisma/schema.prisma`; cliente gerado em `src/generated/prisma/`
  - Banco `dev.db` criado localmente (no Git — coberto por `*.db`)
- Página inicial "Solentis" com layout dark, centralizado (`src/app/page.tsx`)
- `docs/RUNBOOK.md` criado com 5 seções
- `.env.example` criado com variáveis documentadas
- **Critério de aceite #1:** `npm run dev` sobe em :3000 ✅
- **Critério de aceite #2:** página exibe "Solentis" ✅
- **Critério de aceite #3:** `npx prisma studio` abre sem erro ✅

## ✅ Fase 2 — Autenticação e gestão de usuários — CONCLUÍDA em 2026-05-20

### Critérios de aceite — todos validados ✅
1. Login com credenciais corretas autentica e redireciona ao dashboard do perfil ✅
2. Login com credenciais erradas exibe mensagem de erro ✅
3. Usuário com `must_change_password=true` é forçado à tela de troca antes de qualquer rota ✅
4. Rate limit: 5 tentativas falhas → bloqueio 15min ✅ (testado via Vitest)
5. Perfil errado tentando acessar rota protegida → redirecionado a `/acesso-negado` ✅

### Commits da Fase 2 (9 commits)
- `5555725` fix: downgrade Prisma v7→v5 + infra auth — NextAuth, bcrypt, Zod, types (A–C)
- `979f12c` feat: seed com tenant default + admin@solentis.local (D)
- `634faf4` feat: middleware de rotas por perfil (E)
- `23fbbd4` feat: página de login mobile-first + Server Action (F)
- `f25443b` feat: tela de troca de senha obrigatória com checklist visual (G)
- `112a854` feat: dashboards placeholder por perfil + botão de logout (H)
- `46d8c27` fix: remover emoji dos dashboards + pendência de logo anotada
- `9c9676e` feat: CRUD de usuários para Gestor — busca, badges, reset de senha (I)
- `f044d54` test: 4 cenários críticos de auth — 10 testes Vitest passando (J)

### Arquivos principais criados na Fase 2
- `src/lib/auth.ts` — configuração NextAuth v5 com JWT + rate limit + roles
- `src/lib/auth-utils.ts` — funções puras de auth (testáveis sem Prisma)
- `src/lib/password.ts` — hashPassword / verifyPassword (bcryptjs, SALT=12)
- `src/lib/prisma.ts` — singleton PrismaClient
- `src/middleware.ts` — proteção de rotas por prefixo de perfil
- `src/app/(auth)/login/` — página + Server Action de login
- `src/app/(auth)/trocar-senha/` — troca de senha obrigatória com re-autenticação
- `src/app/gestor/dashboard/`, `tecnico/dashboard/`, `operador/dashboard/` — placeholders
- `src/app/gestor/usuarios/` — CRUD completo com busca, badges, último login, reset de senha
- `src/lib/__tests__/auth.test.ts` — 10 asserções, 0 falhas
- `vitest.config.ts` — configuração Vitest com alias `@/*`

## ✅ Fase 4 — Listas gerenciadas pelo Gestor — CONCLUÍDA em 2026-05-20

### Critérios de aceite — todos validados ✅
1. Gestor cria/edita/desativa um parâmetro; histórico de versões gravado em `ParameterHistory` ✅
2. Tentativa de acesso por Operador/Técnico → redirecionado a `/acesso-negado` (middleware) ✅
3. Seed pré-carregado aparece em todas as listagens ✅

### Commits da Fase 4 (3 commits)
- `31191c1` feat: sidebar lateral fixa + refactor paginas gestor
- `c05fa59` feat: CRUDs de parametros, metodos, categorias, pontos, turnos e prazos
- `<final>` feat: fase 4 completa — CLAUDE.md atualizado

### Arquivos principais criados na Fase 4
- `src/app/gestor/layout.tsx` — layout compartilhado com sidebar (autenticação centralizada)
- `src/components/gestor/sidebar.tsx` — sidebar com active state via `usePathname`
- `src/app/gestor/parametros/` — CRUD completo + `ParameterHistory` ao editar limites
- `src/app/gestor/metodos/` — CRUD de métodos de análise
- `src/app/gestor/categorias/` — CRUD de categorias de equipamento
- `src/app/gestor/pontos-de-coleta/` — CRUD de pontos de coleta
- `src/app/gestor/turnos/` — CRUD de turnos (com `crosses_midnight` e timeout de passagem)
- `src/app/gestor/prazos-ocorrencia/` — edição dos 4 prazos fixos por severidade

### Padrões estabelecidos na Fase 4
- Layout compartilhado `src/app/gestor/layout.tsx` — pages individuais não precisam de header/auth
- Páginas de listagem: Server Component com `searchParams` para busca
- Páginas de edição: Server Component (`[id]/page.tsx`) + Client Component (`[id]/edit-form.tsx`)
- Formulários de criação: Client Component com `useActionState`
- `crosses_midnight` (checkbox): `z.preprocess((v) => v === 'on', z.boolean())`
- Campos JSON-like opcionais: `z.preprocess((v) => v === '' ? null : String(v), z.string().nullable())`

## ✅ Fase 8 — Ocorrências — CONCLUÍDA em 2026-05-22

### Critérios de aceite — todos validados ✅
1. Registrar ocorrência CRITICAL → deadline = now + 24h ✅
2. Acessar `/api/occurrences/[id]/photo` sem sessão → 401 ✅
3. Upload de `.exe` → rejeitado com mensagem clara ✅
4. Preencher formulário → fechar aba → reabrir → campos de texto recuperados (localStorage) ✅

### Arquivos principais criados na Fase 8
- `prisma/schema.prisma` — campo `resolution_notes String?` adicionado ao model `Occurrence`
- `migrations/20260522171925_add_occurrence_resolution_notes` — migration aplicada
- `next.config.ts` — `bodySizeLimit: '6mb'` para Server Actions (upload de 5 MB)
- `src/lib/occurrence-utils.ts` — `calcularDeadline`, `isPrazoVencido`, `isMimeTypeValido` (puras)
- `src/app/operador/ocorrencias/actions.ts` — `registrarOcorrencia`: Zod + upload de arquivo + transação (Occurrence + OccurrencePhoto)
- `src/app/operador/ocorrencias/nova/page.tsx` + `occurrence-form.tsx` — formulário com localStorage draft e auto-fill de prazo
- `src/app/operador/ocorrencias/page.tsx` — listagem paginada própria com badge "PRAZO VENCIDO" animado
- `src/app/operador/dashboard/page.tsx` — atualizado com widget "X ocorrências suas em aberto"
- `src/app/api/occurrences/[id]/photo/route.ts` — GET autenticado: 401 sem sessão, stream do arquivo
- `src/app/tecnico/ocorrencias/actions.ts` — `resolverOcorrencia`: Zod + status RESOLVED + resolution_notes
- `src/app/tecnico/ocorrencias/page.tsx` — listagem completa (filtro em aberto/todas) com badge "PRAZO VENCIDO"
- `src/app/tecnico/ocorrencias/[id]/page.tsx` — detalhe: descrição, foto, prazo, formulário de resolução
- `src/app/tecnico/ocorrencias/[id]/resolve-form.tsx` — formulário de fechamento com campo obrigatório
- `src/app/tecnico/dashboard/page.tsx` — atalho para ocorrências adicionado
- `src/lib/__tests__/ocorrencias.test.ts` — 14 testes Vitest (49 total passando)

### Padrões estabelecidos na Fase 8
- **Upload em Server Action:** `formData.get('photo') as File | null` — verifica `size > 0`, MIME type e tamanho antes de `fs.writeFile`; path: `./uploads/occurrences/{uuid}.{ext}`
- **Foto sem autenticação bloqueada:** arquivo salvo fora de `/public`; servido APENAS via `/api/occurrences/[id]/photo` com `auth()` obrigatório
- **deadline calculado no servidor:** busca `occurrence_severity_defaults` por severidade → `now + deadlineHours * 3600 * 1000`; Operador vê prazo sugerido mas não edita
- **`resolution_notes` obrigatório ao fechar:** Zod valida min 5 chars; campo `resolution_notes String?` adicionado ao schema
- **localStorage draft em ocorrências:** mesma estratégia das fases anteriores (`mounted` guard, chave `occurrence_draft`); foto NÃO é salva no draft (limitação do browser — documentado na UI)
- **Badge "PRAZO VENCIDO" animado:** `animate-pulse` do Tailwind em `text-red-400` para destaque forte
- **`bodySizeLimit: '6mb'`:** configurado em `next.config.ts → experimental.serverActions` para suportar upload de 5 MB (+ overhead multipart)

## ✅ Fase 7 — Equipamentos e manutenções — CONCLUÍDA em 2026-05-21

### Critérios de aceite — todos validados ✅
1. Criar equipamento → preventiva agendada automaticamente (hoje + frequência em dias) ✅
2. Concluir preventiva → nova preventiva agendada (data conclusão + frequência) ✅
3. Preventiva vencida → badge vermelho na listagem e detalhe (computed na query, sem gravar no BD) ✅
4. Registrar corretiva → responsável auto-preenchido com o usuário logado ✅
5. Dashboard técnico exibe widgets: preventivas vencidas, análises pendentes, corretivas em andamento ✅
6. 9 testes Vitest (addDays + isOverdue); 35 total passando ✅

### Arquivos principais criados na Fase 7
- `src/lib/equipment-utils.ts` — `addDays()` e `isOverdue()` puras e testáveis
- `src/app/tecnico/equipamentos/actions.ts` — `criarEquipamento`, `editarEquipamento`, `toggleAtivoEquipamento`, `concluirPreventiva`, `registrarCorretiva`, `atualizarStatusCorretiva`
- `src/app/tecnico/equipamentos/page.tsx` — listagem paginada com busca, filtro inativos, badge "Preventiva vencida"
- `src/app/tecnico/equipamentos/novo/page.tsx` + `novo/equipment-form.tsx` — formulário de criação
- `src/app/tecnico/equipamentos/[id]/page.tsx` — detalhe: preventivas + corretivas + formulário edição
- `src/app/tecnico/equipamentos/[id]/edit-form.tsx` — formulário de edição inline
- `src/app/tecnico/equipamentos/[id]/conclude-button.tsx` — Client Component `useTransition` para concluir preventiva
- `src/app/tecnico/equipamentos/[id]/status-button.tsx` — Client Component para COMPLETED/CANCELLED de corretiva
- `src/app/tecnico/equipamentos/[id]/corrective-form.tsx` — formulário de nova corretiva
- `src/app/tecnico/equipamentos/[id]/toggle-button.tsx` — ativar/desativar equipamento
- `src/app/tecnico/dashboard/page.tsx` — atualizado com 3 widgets de atenção (preventivas vencidas, análises pendentes, corretivas abertas)
- `src/lib/__tests__/equipamentos.test.ts` — 9 testes Vitest (35 total passando)

### Padrões estabelecidos na Fase 7
- **OVERDUE sem background job:** `scheduled_date < today AND status = SCHEDULED` computado na query; campo `OVERDUE` no enum reservado para futura job
- **Transações atômicas:** `prisma.$transaction` garante criação do equipamento + primeira preventiva como unidade atômica; idem para concluir + agendar próxima
- **Responsável auto-preenchido:** `registrarCorretiva` usa `resolveUserId(session.user.email)` — Técnico não escolhe o responsável
- **Editar frequência não reagenda:** decisão explícita — preventiva existente não é alterada; documentado na UI com texto explicativo
- **`priority` nullable no Prisma:** tratado com guard `c.priority ? PRIORITY_MAP[c.priority] : fallback`
- **Acesso ao `/tecnico/equipamentos`:** middleware bloqueia MANAGER (rota `/tecnico/*` → TECHNICIAN); MANAGER acessa equipamentos quando Fase 10 criar rota no gestor

## ✅ Fase 6 — Análises laboratoriais — CONCLUÍDA em 2026-05-21

### Critérios de aceite — todos validados ✅
1. pH=11 (acima do limite) → análise destacada em vermelho ✅
2. Preencher metade do formulário → fechar aba → reabrir → campos recuperados (localStorage) ✅
3. Gráfico exibe últimos 30 dias (expansível para 90) ✅
4. Aprovar análise → `approved_by` + `approved_at` preenchidos ✅

### Commits da Fase 6
- `<fase-6>` feat: fase 6 completa — análises laboratoriais, aprovação, gráfico Recharts

### Arquivos principais criados na Fase 6
- `src/app/tecnico/analises/actions.ts` — `registrarAnalise` (snapshots imutáveis + is_non_conformant) + `aprovarAnalise`
- `src/app/tecnico/analises/nova/page.tsx` — Server Component com dados para o formulário
- `src/app/tecnico/analises/nova/analysis-form.tsx` — Client Component: localStorage, highlight vermelho real-time
- `src/app/tecnico/analises/page.tsx` — Listagem paginada: badges não-conformidade + status aprovação
- `src/app/tecnico/analises/approve-button.tsx` — Client Component: `useTransition` + `aprovarAnalise`
- `src/app/tecnico/analises/historico/page.tsx` — Server Component: filtros por parâmetro e período
- `src/app/tecnico/analises/historico/analysis-chart.tsx` — Client Component Recharts: gráfico de linha com `ReferenceLine` para limites
- `src/lib/__tests__/analises.test.ts` — 7 testes Vitest (26 total passando)

### Padrões estabelecidos na Fase 6
- **Snapshots imutáveis:** `min_limit_applied` / `max_limit_applied` capturados no save — limites não retroagem (rastreabilidade CONAMA 430/2011)
- **`is_non_conformant` sempre boolean em análises** (nunca null — parâmetro e valor obrigatórios); usa `?? false` sobre `calcularNaoConformidade`
- **Aprovação:** `requireTechnicianOrManager()` guard; qualquer TECHNICIAN ou MANAGER aprova; `ApproveButton` com `useTransition` + `router.refresh()`
- **Gráfico Recharts:** Client Component isolado (`'use client'`); `ReferenceLine` amarela para limites; pontos vermelhos quando `isNonConformant`; página Server Component com filtros GET
- **Badge Gestor (não-conformidades):** pendência → Fase 10
- **Zod v4:** usar `error: 'mensagem'` em vez de `required_error`/`invalid_type_error` (mudança de API do Zod v4)
- **Recharts v3.8.1** instalado

## ✅ Fase 5 — Leituras de campo — CONCLUÍDA em 2026-05-21

### Critérios de aceite — todos validados ✅
1. Formulário funciona no Chrome DevTools modo celular (375px) ✅
2. Fecha aba no meio do formulário → reabre → dados estão lá (localStorage) ✅
3. Valor fora do limite → campo fica vermelho antes de submeter (Nível 1) ✅
4. Lista pagina corretamente (take/skip + count) ✅

### Commits da Fase 5
- `<fase-5>` feat: fase 5 completa — leituras de campo, localStorage, paginação, testes

### Arquivos principais criados na Fase 5
- `src/lib/readings-utils.ts` — `calcularNaoConformidade()` pura e testável
- `src/app/operador/leituras/actions.ts` — Server Action `registrarLeitura` (Zod + is_non_conformant + MANUAL origin)
- `src/app/operador/leituras/nova/page.tsx` — Server Component: busca pontos e parâmetros, renderiza form
- `src/app/operador/leituras/nova/reading-form.tsx` — Client Component: localStorage draft, highlight vermelho real-time
- `src/app/operador/leituras/page.tsx` — Listagem paginada (20/pág, badge "Fora do limite")
- `src/lib/__tests__/readings.test.ts` — 9 testes Vitest, 19 total passando

### Padrões estabelecidos na Fase 5
- **localStorage draft:** chave `reading_draft`; `useState mounted` impede salvar estado vazio antes de hidratar
- **Redirect pós-submit:** Server Action retorna `{ success: true }`; Client Component limpa draft e chama `router.push()`
- **Não-conformidade Nível 1:** borda vermelha + texto "Fora do limite CONAMA: X – Y unidade" em tempo real no cliente
- **Não-conformidade Nível 2 (badge no dashboard):** pendência → Fase 10
- **Listagem mobile:** cards em vez de tabela (melhor leitura a 375px); borda vermelha no card quando `is_non_conformant = true`
- **Parâmetro opcional:** quando `parameter_id = null`, campos valor/unidade somem; `is_non_conformant = null`
- **`shift_instance_id = null`:** associação ao turno ativo implementada na Fase 9
- **`recorded_at` editável:** `datetime-local` pré-preenchido com now(), operador pode ajustar

## ✅ Fase 3 — Schema completo + seed de dados operacionais — CONCLUÍDA em 2026-05-20

### Critérios de aceite — todos validados ✅
1. Schema Prisma com 21 tabelas aplicado via migration ✅ (`20260520130427_add_full_schema`)
2. `npx prisma validate` sem erros ✅
3. Seed operacional executado e validado no Prisma Studio ✅

### Commits da Fase 3 (2 commits)
- `<bloco-a>` feat: schema Prisma completo (21 tabelas) + enums TypeScript + migration
- `<bloco-b>` feat: seed operacional completo (8 params CONAMA, 3 pontos, 3 turnos, 6 categorias)

### Dados de seed disponíveis para desenvolvimento
- **Usuários:** admin@solentis.local (MANAGER, must_change_password=true), tecnico@solentis.local (TECHNICIAN), operador@solentis.local (OPERATOR)
- **Parâmetros CONAMA (8):** pH, DBO5, DQO, Nitrogênio Amoniacal, Fósforo Total, Sólidos Suspensos, Coliformes Termotolerantes, Turbidez
- **Métodos de análise (3):** Colorimetria, Gravimetria, Titulação
- **Categorias de equipamento (6):** Bombas, Aeradores, Filtros, Medidores, Dosadores, Estruturas Civis
- **Pontos de coleta (3):** Entrada ETE, Reator Biológico, Saída Final
- **Turnos (3):** Manhã (06-14h), Tarde (14-22h), Noite (22-06h, crosses_midnight=true)
- **Prazos de ocorrência:** CRITICAL=24h, HIGH=72h, MEDIUM=168h, LOW=720h

## ✅ Fase 10 — Dashboards — CONCLUÍDA em 2026-05-26

### Critérios de aceite — todos validados ✅
1. Operador vê widget turno ativo (verde se aberto, "Nenhum turno ativo" se não) ✅
2. Operador vê contagem de leituras do dia (próprio usuário) ✅
3. Técnico tem 4 widgets: preventivas vencidas, n.c. em aberto, análises p/ aprovar, corretivas ✅
4. Gestor tem KPIs + alertas + gráfico n.c. por parâmetro (seletor 7/30/90d) + severidades ✅
5. Badge vermelho quando há n.c. em aberto (Técnico + Gestor) ✅
6. Todas as queries do Gestor usam `count`/`groupBy` — nenhum `findMany` sem `take` ✅
7. `seed-demo.ts` gera 629 registros de 6 meses; dashboards carregam sem timeout ✅

### Commit
- `513f625` feat: fase 10 — dashboards completos por perfil

### Arquivos alterados/criados
- `src/app/operador/dashboard/page.tsx` — +turno ativo, +leituras do dia, grid 2-col
- `src/app/tecnico/dashboard/page.tsx` — +widget não-conformidades, grid 2×2
- `src/app/gestor/dashboard/page.tsx` — refactor completo: KPIs + alertas + gráficos + navegação
- `src/app/gestor/dashboard/nonconform-chart.tsx` — BarChart Recharts (Client Component)
- `prisma/seed-demo.ts` — seed separado com 6 meses de dados operacionais

### Padrões estabelecidos na Fase 10
- **Seletor de período via searchParams:** `?dias=7|30|90` no dashboard do Gestor; Server Component lê o param e filtra a query de `groupBy`
- **groupBy com parâmetros:** `prisma.analysis.groupBy({ by: ['parameter_id'], _count: { id: true } })` + join manual com `parameterNames`
- **Ocorrências por severidade:** `groupBy(['severity'])` → `Map<severity, count>` → 4 stat-cards com cores fixas por severidade
- **seed-demo.ts separado:** ~20% dos valores fora do limite para gerar n.c. realistas; ~60% das análises aprovadas; executar com `npx tsx prisma/seed-demo.ts`
- **Preventivas no seed-demo:** puladas automaticamente se não houver equipamentos no banco (equipamentos criados via UI na Fase 7)

### 📍 Próximo passo ao retomar (após Fase 10)
~~Fase 11 — Auditoria (UI + filtros), testes dos 13 cenários críticos, hardening, backup/restore.~~ CONCLUÍDA.

## ✅ Fase 11 — Auditoria, Testes e Hardening — CONCLUÍDA em 2026-05-26

### Critérios de aceite — todos validados ✅
1. `logAudit()` centralizado em `src/lib/audit.ts` — aceita PrismaClient e transaction client ✅
2. Audit log integrado em 5 fluxos críticos: usuários, parâmetros, ocorrências (criar/resolver), passagem de turno ✅
3. UI `/gestor/auditoria` com filtros (usuário, entidade, período) e paginação (25/pág) ✅
4. 35 testes Vitest cobrindo 10 dos 13 cenários críticos do briefing (3 são testes manuais) ✅
5. Script `scripts/backup.ts` + checklist de restore + RUNBOOK atualizado com testes manuais ✅
6. Security review: zero `console.*`, zero stack traces expostos, zero XSS vectors ✅

### Sub-passos concluídos
- **A** — `src/lib/audit.ts` — helper `logAudit()` com tipo `Pick<PrismaClient, 'auditLog'>` para uso em transações
- **B** — Integração audit em: `gestor/usuarios/actions.ts`, `gestor/parametros/actions.ts`, `tecnico/ocorrencias/actions.ts`, `operador/ocorrencias/actions.ts`, `gestor/turnos/instancias/actions.ts`
- **C** — `src/app/gestor/auditoria/page.tsx` — Server Component com filtros GET, tabela paginada, before/after expansível via `<details>`
- **D** — `src/lib/__tests__/fase11-criticos.test.ts` — 35 testes Vitest (cenários 3, 5–13)
- **E** — `scripts/backup.ts` + RUNBOOK seções 2.2–2.4 + seção 6 (testes manuais cenários 1, 2, 4)
- **F** — Security review: sem console.*, sem stack traces, sem dangerouslySetInnerHTML, todas as 19 Server Actions têm Zod

### Commits da Fase 11
- `<audit-helper>` feat: fase 11A — helper logAudit() centralizado
- `<audit-integration>` feat: fase 11B — audit log integrado em mutações críticas
- `<audit-ui>` feat: fase 11C — UI de auditoria com filtros, paginação e diff expansível
- `e36b4d4` test: fase 11D — 35 testes para os 13 cenários críticos do briefing
- `5abf39d` feat: fase 11E — script de backup SQLite + restore documentado no RUNBOOK

### 📍 Próximo passo ao retomar
~~Fase 12 — Polish mobile: touch targets h-12, atributos de teclado mobile, tratamento de erro de rede offline.~~ CONCLUÍDA.

## ✅ Feature extra — Controle de Estoque de Produtos Químicos — CONCLUÍDA em 2026-05-26

### Critérios de aceite — todos validados ✅
1. Gestor cadastra produto com estoque mínimo; aparece na listagem ✅
2. Gestor/Técnico registra entrada → estoque calculado atualiza ✅
3. Operador registra saída maior que estoque → salvo com aviso âmbar "estoque ficará negativo" ✅
4. Operador faz contagem física → divergência (físico − calculado) exibida em tempo real no form ✅
5. Calculado < mínimo OU físico < mínimo → badge "ESTOQUE BAIXO" animado na listagem ✅
6. Widget de alerta no dashboard do Gestor (link direto para /gestor/produtos-quimicos) ✅
7. Widget de alerta no dashboard do Operador (link direto para /operador/estoque) ✅
8. Histórico unificado (entradas, saídas, contagens) ordenado por data no detalhe do produto ✅
9. 17 testes Vitest (76 total passando) ✅

### Commit
- `129b0ab` feat: estoque de produtos químicos — schema, CRUD, movimentação, alertas

### Arquivos principais criados
- `prisma/schema.prisma` — 4 modelos: `ChemicalProduct`, `ChemicalStockEntry`, `ChemicalStockExit`, `ChemicalStockCount`
- `migrations/20260526011115_add_chemical_stock` — migration aplicada
- `src/types/index.ts` — `CHEMICAL_UNITS_PRESET`, `ChemicalUnitPreset`, `CHEMICAL_UNIT_OPTIONS`
- `src/lib/stock-utils.ts` — `calcularEstoqueAtual`, `estaAbaixoMinimo`, `calcularDivergencia`, `formatarQuantidade`
- `src/app/gestor/produtos-quimicos/` — listagem, CRUD, formulário de entrada (Gestor)
- `src/app/tecnico/estoque/` — listagem + formulário de entrada (Técnico; importa action do Gestor)
- `src/app/operador/estoque/` — listagem, registrar saída (com aviso de negativo), contagem física
- `src/lib/__tests__/estoque.test.ts` — 17 testes das 4 funções puras

### Padrões estabelecidos
- **Estoque calculado:** `sum(entries) - sum(exits)` — computado na query, nunca persistido
- **Estoque físico:** última `ChemicalStockCount` por produto — sem histórico de "estoque corrente"
- **Alerta duplo:** `calculado < min_stock OR (físico != null AND físico < min_stock)` — pior dos dois
- **Saída negativa permitida:** action calcula stock antes, salva sempre, retorna `{ success, warning }` se negativo; form exibe aviso âmbar com botão "Entendido"
- **Unidade "outro":** `unit_select === 'outro'` → usa `unit_custom`; validação no servidor rejeita se ambos vazios
- **Técnico importa action do Gestor:** `@/app/gestor/produtos-quimicos/actions` — mesmo padrão das ShiftTasks
- **Widgets assíncronos:** dashboard Gestor convertido de componente estático para Server Component async
- **`_sum` aggregate:** `registrarSaida` usa `prisma.chemicalStockEntry.aggregate({ _sum })` — sem `findMany` para calcular stock

## ✅ Feature extra — Tarefas por Turno — CONCLUÍDA em 2026-05-25

### Critérios de aceite — todos validados ✅
1. Gestor/Técnico atribui tarefa a operador específico (ou "qualquer") numa instância de turno ✅
2. Operador vê tarefas pendentes com badge ambar no card do turno ativo ✅
3. Ao concluir, pode anexar até 3 fotos (`<input multiple>`, JPG/PNG/WebP, máx 5 MB cada) ✅
4. Tarefas não concluídas aparecem automaticamente no checklist da passagem de turno ✅
5. Acessar `/api/shift-task-photos/[id]` sem sessão → 401 ✅

### Commit
- `a63e740` feat: tarefas por turno — schema, CRUD, UI operador mobile-first, integração handover

### Arquivos principais criados
- `prisma/schema.prisma` — modelos `ShiftTask` + `ShiftTaskPhoto` (2 tabelas, migration `add_shift_tasks`)
- `src/app/api/shift-task-photos/[id]/route.ts` — GET autenticado por ID de foto
- `src/app/gestor/turnos/instancias/[id]/task-actions.ts` — `atribuirTarefa` + `removerTarefa` (MANAGER ou TECHNICIAN)
- `src/app/gestor/turnos/instancias/[id]/task-form.tsx` — Client Component: lista + formulário inline de criação
- `src/app/gestor/turnos/instancias/[id]/page.tsx` — seção Tarefas adicionada (barra X/Y concluídas)
- `src/app/tecnico/turnos/instancias/page.tsx` — lista de instâncias ativas para o Técnico
- `src/app/tecnico/turnos/instancias/[id]/page.tsx` + `tecnico-task-form.tsx` — gerenciamento de tarefas pelo Técnico
- `src/app/operador/turnos/actions.ts` — `concluirTarefa` (upload múltiplo) + `pularTarefa`; `iniciarPassagem` atualizado
- `src/app/operador/turnos/[id]/tarefas/page.tsx` — lista mobile-first com barra de progresso
- `src/app/operador/turnos/[id]/tarefas/task-card.tsx` — card expansível: botões h-12, form de conclusão com upload
- `src/app/operador/turnos/page.tsx` — badge "X tarefa(s) pendente(s)" + botão "Ver tarefas" nos cards de turno
- `src/app/operador/turnos/[id]/passagem/page.tsx` — widget de tarefas pendentes no resumo do turno

### Padrões estabelecidos
- **Tarefas por instância (não por template):** cada `ShiftTask` pertence a um `shift_instance_id` — sem recorrência automática no MVP
- **Técnico importa actions do path do Gestor:** `@/app/gestor/turnos/instancias/[id]/task-actions` — decisão explícita de arquitetura
- **Upload múltiplo no mobile:** `<input type="file" multiple accept="image/...">` — operador seleciona várias da galeria de uma vez
- **Fotos salvas antes da transação:** `fs.writeFile` fora do `$transaction`, `createMany` para registros dentro — evita BLOBs no SQLite
- **Até 3 fotos por tarefa:** validação `task.photos.length + files.length > 3` considera fotos já existentes
- **SKIPPED não bloqueia passagem:** apenas status `PENDING` entra no `checklist_data` do handover
- **`revalidatePath` duplo:** `[instanceId]/tarefas` + `/operador/turnos` — garante re-render na página atual e no index
- **Integração handover retrocompatível:** `pending_tasks_count` e `pending_tasks[]` adicionados ao JSON do `checklist_data`; código antigo que parseia o campo ignora campos desconhecidos

## Descobertas durante a retomada (Fase 1 final — 2026-05-13)

### shadcn/ui v4.7 — sistema de presets (novo em Dez/2025)
- A versão 4.7 introduziu presets que agrupam style + fonte + ícones + radius em conjunto
- **Preset escolhido: Nova** — compacto, Lucide icons embutidos, fonte Geist, ideal para dashboards técnicos
- O preset Nova força `baseColor: "neutral"` — não pergunta essa escolha ao usuário
- **Paleta neutral aceita** (em vez de slate original): ambas são cinza-neutro; a customização definitiva para azul-petróleo será via CSS variables nas Fases 4–5, quando houver mais telas para calibrar o tom
- **Component library: Radix** — anos de maturidade, padrão histórico, primitivos acessíveis (WCAG)
- shadcn inclui `Button` automaticamente no preset Nova (não precisa de `npx shadcn add button` depois)
- Tailwind v4 detectado automaticamente; config aplicada em `globals.css` (sem `tailwind.config.ts`)
- CSS variables em formato `oklch()` — mais preciso que hex/hsl para dark mode

### Padrão do componente Button (para reuso nas próximas fases)
- Usa `cva` (class-variance-authority) para variantes
- Usa `Slot` do Radix para polimorfismo (`asChild`)
- Usa `cn()` de `src/lib/utils.ts` para merge de classes
- Variantes disponíveis: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
- Tamanhos: `xs`, `sm`, `default`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`

## Padrões para próximas fases

### Prisma v5 — versão adotada (downgrade deliberado em 2026-05-15)
- **Prisma v5.22.0 adotado** — downgrade do v7 feito porque v7 exige Driver Adapter obrigatório para SQLite, incompatível com a simplicidade do MVP
- Upgrade para v6/v7 será reavaliado quando migrarmos para PostgreSQL (pós-MVP)
- **Sem `prisma.config.ts`** — não existe no v5; URL do banco fica em `url = env("DATABASE_URL")` no `schema.prisma`
- **Import do cliente Prisma — SEMPRE assim em todo o código futuro:**
  ```ts
  // ✅ CORRETO (Prisma v5 — cliente em node_modules/@prisma/client)
  import { PrismaClient } from '@prisma/client'
  ```
- Rodar `npx prisma generate` após cada clone ou alteração de schema

### Enums no Prisma v5 + SQLite
- **Prisma v5 + SQLite não suporta enums nativos** — todos os enums são `String` no schema
- Segurança de tipos garantida via `src/types/index.ts` (TypeScript types/const objects)
- Padrão de uso:
  ```ts
  import type { Role } from '@/types'
  import { ROLES } from '@/types'
  // ROLES.OPERATOR, ROLES.TECHNICIAN, ROLES.MANAGER
  ```
- Quando migrar para PostgreSQL (pós-MVP): converter os campos `String` de volta para enums Prisma nativos

### Json no Prisma v5 + SQLite
- **Prisma v5.22.0 + SQLite não suporta o tipo `Json`** — descoberto na Fase 3
- Todos os campos JSON são armazenados como `String` no schema e serializados com `JSON.stringify()` / `JSON.parse()` na aplicação
- Campos afetados: `Reading.metadata_origin`, `Analysis.metadata_origin`, `ShiftHandover.checklist_data`, `AuditLog.before`, `AuditLog.after`
- Quando migrar para PostgreSQL (pós-MVP): converter para tipo `Json` nativo do Prisma

### Armadilha resolvida — `.env*` no `.gitignore`
- O `.gitignore` usava o wildcard `.env*` que cobria também o `.env.example`
- **Corrigido em 2026-05-14:** adicionado `!.env.example` logo abaixo de `.env*`
- `.env.example` agora entra no Git normalmente ✅

## ✅ Fase 12 — Polish Mobile — CONCLUÍDA em 2026-05-29

### Critérios de aceite — todos validados ✅
1. Bottom nav fixo com 5 itens para Operador (Dashboard, Leituras, Turnos, Ocorrências, Estoque) ✅
2. Bottom nav fixo com 5 itens para Técnico (Dashboard, Análises, Equip., Ocorrências, Turnos) ✅
3. Header unificado "Solentis + badge de perfil + botão de logout" via layout compartilhado ✅
4. Zero headers duplicados em todas as 21 páginas do Operador e 14 do Técnico ✅
5. `inputMode="decimal"` em todos os campos numéricos (leituras, análises, estoque) ✅
6. `autoComplete="off"` em textareas técnicos (descrição de ocorrência, observação de leitura) ✅
7. `navigator.onLine` no `onSubmit` dos 3 formulários críticos do Operador com mensagem âmbar ✅
8. Touch targets mínimos: botões inline → h-10 (40px); botões primários → h-12/h-14 (48–56px) ✅

### Sub-passos concluídos
- **A** — Layout compartilhado Operador (`src/app/operador/layout.tsx`) + `OperadorBottomNav`; headers removidos de 11 páginas do Operador
- **B** — Layout compartilhado Técnico (`src/app/tecnico/layout.tsx`) + `TecnicoBottomNav`; headers removidos de 14 páginas do Técnico
- **C** — `inputMode="decimal"` nos campos de quantidade de estoque (saída, contagem, entrada); `autoComplete="off"` nos textareas técnicos
- **D** — `navigator.onLine` no `onSubmit` de leitura-form, occurrence-form e exit-form com mensagem de erro âmbar inline
- **E** — Touch targets: approve-button h-7→h-10, conclude/status/toggle-button h-8→h-10, tecnico-task-form h-9→h-12

### Commits da Fase 12
- `126b68f` feat: fase 12A-D — bottom nav Operador e Técnico + polish mobile
- `c4a9626` feat: fase 12E — touch targets mínimos nos botões inline do Técnico

### Arquivos principais criados/alterados
- `src/app/operador/layout.tsx` — novo layout compartilhado (auth + header + bottom nav + pb-16)
- `src/app/tecnico/layout.tsx` — novo layout compartilhado para o Técnico (badge azul "Técnico")
- `src/components/operador/bottom-nav.tsx` — OperadorBottomNav (5 itens, active state via usePathname)
- `src/components/tecnico/bottom-nav.tsx` — TecnicoBottomNav (5 itens: Dashboard/Análises/Equip./Ocorrências/Turnos)

### Padrões estabelecidos na Fase 12
- **Layout + bottom nav:** `pb-16` no wrapper de conteúdo para não ficar atrás da nav fixada em `bottom-0`
- **Active state na bottom nav:** `pathname === href || pathname.startsWith(href + '/')` — cobre sub-rotas
- **`navigator.onLine` pattern:** `onSubmit={(e) => { if (!navigator.onLine) { e.preventDefault(); setOfflineError(true) }}}` — simples e sem dependência de service worker
- **Touch targets:** botões inline em lista → h-10 (40px mínimo); botões de submit de formulários → h-12 ou h-14

### 📍 MVP CONCLUÍDO
Todas as 12 fases planejadas foram implementadas e testadas. O sistema está pronto para uso.
Próximos passos (pós-MVP): ver seção "Pendências futuras" abaixo.

## Como retomar
Próxima sessão: usuário dirá "vamos continuar". Você deve:
1. Ler BRIEFING.md e este CLAUDE.md COMPLETOS antes de qualquer coisa
2. Confirmar com o usuário que entendeu o contexto
3. Seguir para o item pendente (ver Status Atual acima)
4. ESPERAR OK do usuário entre cada letra (e, f, g) — regra do briefing
5. Trabalhar em incrementos pequenos: explica → faz → mostra → espera OK

## Convenções acordadas
- Commits em português, padrão Conventional Commits (feat:/fix:/docs:/refactor:/test:)
- Esperar aprovação entre fases
- Atualizar CLAUDE.md ao fim de cada fase concluída
- Manter um /docs/RUNBOOK.md com comandos úteis (criar a partir da fase 1)

## Princípios de qualidade (adicionados durante o planejamento)
- "Backup não testado não é backup" — toda fase de backup exige teste explícito de restore
- Auto-save em localStorage obrigatório em TODO formulário longo (Leituras, Análises, Ocorrências)
- Queries de dashboard sempre por agregação (`count`/`groupBy`), nunca `findMany` sem `take`
- "Nada com histórico operacional é hard-deletado — apenas desativado (soft-delete) ou anonimizado (LGPD)"
- "Dinheiro nunca em Float — sempre Decimal"

## Pendências futuras (fora do MVP)
- **Fase 12 — Logo/imagem Solentis:** Adicionar logo nas telas de autenticação (/login, /trocar-senha) e nos headers dos dashboards. Atualmente exibe apenas o texto "Solentis".
- **Pós-MVP — OCR/IA para laudos laboratoriais:** Leitura automática de laudos em PDF/imagem via OCR ou IA (Caminho B). Fora do escopo do MVP; avaliar na v1.0.
- **Migração de middleware para proxy:** Next.js 16 deprecou o arquivo `middleware.ts`; migrar para a convenção de proxy quando houver documentação estável.
- **Pós-MVP — Notificação Nível 3 (push/email de não-conformidade):** Envio automático de push notification ou e-mail quando uma leitura não-conforme é registrada. Requer integração com serviço externo (ex: Resend, FCM). Avaliar na v1.0.
- **Pós-MVP — Abertura automática de turno no login:** Quando Operador faz login, perguntar ou abrir automaticamente um turno; avaliar UX com operadores reais.
- **Pós-MVP — Repensar fluxo de turno e passagem:** Revisar o fluxo de abertura/fechamento de turno e checklist de passagem com base no feedback dos operadores em campo.
- **Pós-MVP — Resumo do turno anterior para o entrante:** Ao abrir um turno, Operador vê resumo do que o turno anterior registrou (leituras, ocorrências, tarefas concluídas).


# SOLENTIS — Relatório de Handoff Técnico
### Documento de transferência de contexto para colaboração entre IAs
**Última atualização:** sessão de correção de bugs (Onda 1 concluída)
**Destino:** Antigravity / IA colaboradora
**Autor do projeto:** Vitor — Engenheiro Ambiental, desenvolvedor iniciante

---

## COMO USAR ESTE DOCUMENTO

Este é o documento-mãe de contexto do projeto Solentis. Ele existe para que **qualquer IA** possa entrar no projeto sem quebrar o que já foi construído. Antes de propor ou executar QUALQUER alteração, leia as seções 1 a 6. As **regras invioláveis** estão na seção 3 — violá-las causa retrabalho ou quebra do sistema.

Princípio de colaboração: o autor (Vitor) é iniciante em programação. Explique decisões em linguagem acessível, trabalhe em incrementos pequenos e versionáveis, e NUNCA aplique grandes mudanças sem mostrar o diff antes.

---

## 1. DE ONDE VIEMOS — o que é o Solentis

### 1.1 O problema real
Estações de Tratamento de Efluentes (ETEs) de pequeno e médio porte no Brasil controlam sua operação em papel ou planilhas soltas. Isso dificulta:
- Comprovar conformidade com a **Resolução CONAMA nº 430/2011** (limites de lançamento de efluentes)
- Rastrear quem mediu o quê, quando, e sob qual limite legal vigente
- Auditar alterações e passagens de turno
- Tomar decisão baseada em dados

### 1.2 A solução
**Solentis** é uma aplicação web mobile-first que digitaliza o ciclo operacional completo de uma ETE, com a conformidade CONAMA como motor de design (não como relatório acoplado no fim). O contexto real de uso é a operação de uma fábrica de ARLA 32 (gestão do tratamento de efluentes industriais).

### 1.3 Os 3 perfis de usuário
| Perfil | Responsabilidade | Acesso |
|---|---|---|
| **OPERATOR** | Leituras de campo, ocorrências in loco, operação de turnos, saída/contagem de estoque | Cria e edita o que é seu |
| **TECHNICIAN** | Análises laboratoriais, equipamentos, manutenções, resolução de ocorrências, entrada de estoque | Cria e edita o técnico |
| **MANAGER (Gestor)** | Configuração, cadastros de referência, KPIs, auditoria | Vê tudo (inclusive telas de operador/técnico); escreve só no que é dele |

**Regra de ouro de permissão:** MANAGER tem acesso de LEITURA às rotas `/operador/*` e `/tecnico/*` (para monitoramento), mas operações de ESCRITA permanecem restritas ao perfil dono.

---

## 2. ONDE ESTAMOS — estado atual do código

### 2.1 Status geral (no fim da Onda 1)
```
✅ Fases 0 a 12 — completas e commitadas
✅ 2 features extras — Tarefas por Turno + Estoque Químico
✅ Onda 1 de bugs — 6 bugs críticos corrigidos
✅ 111 testes automatizados passando (Vitest)
✅ TypeScript estrito — zero erros
✅ Working tree limpo
```

### 2.2 Localização e como rodar
```
Pasta:    C:\Users\Vitor\projetos\meu-projeto  (Windows, pt-BR)
Subir:    npm run dev           → localhost:3000
Reset DB: npx prisma migrate reset   (recria seed)
Dados demo: npx tsx prisma/seed-demo.ts   (6 meses de dados p/ gráficos)
Testes:   npx vitest run
Tipos:    npx tsc --noEmit
```

### 2.3 Credenciais seed
```
admin@solentis.local    / Admin@123     (MANAGER)
tecnico@solentis.local  / Tecnico@123   (TECHNICIAN)
operador@solentis.local / Operador@123  (OPERATOR)
```

---

## 3. REGRAS INVIOLÁVEIS — leia antes de tocar no código

> Estas decisões foram tomadas com motivo. Reverter qualquer uma SEM um plano de migração explícito quebra o sistema.

### 3.1 Prisma v5.22.0 — NÃO atualizar para v7
O Prisma foi **deliberadamente fixado na v5.22.0**. A v7 é incompatível com a configuração SQLite simples usada aqui. Se sugerir update, PARE — exige plano de migração de banco completo.

### 3.2 SQLite não tem tipo Json nem enum nativo
Consequências obrigatórias no código:
- Campos que seriam JSON são armazenados como **String serializada** (5 campos no schema). Serializar/desserializar na aplicação.
- Enums são implementados como **String + constantes TypeScript** em `src/types/index.ts`. Nunca usar `enum` nativo do Prisma.

### 3.3 Status OVERDUE / TIMED_OUT é computado em query
Não há job em segundo plano. Vencimento de prazo de ocorrência e timeout de passagem de turno são avaliados **na própria query de leitura**, comparando com a data atual. Não criar cron para isso sem discutir.

### 3.4 Sessão JWT é compartilhada entre abas
Comportamento normal de cookie HTTP, NÃO é bug. Para testar múltiplos perfis: usar **janelas anônimas separadas** ou perfis diferentes do navegador. Documentado na seção 7 do RUNBOOK. Por isso, CADA `page.tsx` valida o role da sessão — não confiar só no middleware.

### 3.5 Snapshots imutáveis de limites legais
Ao registrar uma análise laboratorial, os limites mínimo/máximo vigentes são **copiados para a própria análise** (`min_limit_applied`, `max_limit_applied`). Atualizar o limite depois NÃO altera análises antigas. Isso é exigência de rastreabilidade temporal da CONAMA. Nunca "normalizar" isso para buscar o limite atual via FK.

### 3.6 Protocolo de trabalho com o autor
- Uma alteração / aprovação por vez. NÃO usar "allow all edits".
- `tsc --noEmit` antes de cada commit.
- Conventional Commits em **português**.
- Pausar em arquivos `actions.ts` para revisão manual; diffs visuais podem ser aprovados direto.
- `CLAUDE.md` é a memória viva do projeto — manter atualizado.

---

## 4. STACK TÉCNICA COMPLETA

| Camada | Tecnologia | Observação |
|---|---|---|
| Framework | Next.js 15 (Turbopack) | App Router, React Server Components |
| Linguagem | TypeScript (modo estrito) | terceira linha de defesa contra bugs |
| UI | Tailwind CSS v4 + shadcn/ui | tema escuro (slate-950/900/800) |
| ORM | Prisma 5.22.0 | fixo — ver regra 3.1 |
| Banco | SQLite (dev) | preparado p/ PostgreSQL em produção |
| Auth | NextAuth v5 | JWT, bcrypt 12 rounds |
| Validação | Zod | cliente + servidor, em todas as Server Actions |
| Testes | Vitest | 111 testes |
| Gráficos | Recharts | com ReferenceLine nos limites legais |

---

## 5. ARQUITETURA E MÓDULOS

### 5.1 Banco — 21 tabelas em 5 domínios
```
IDENTIDADE      tenants, usuários, sessões
CONFIGURAÇÃO    parâmetros (+ histórico de versões), métodos, pontos de coleta,
                turnos, categorias de equipamento, prazos por severidade
EXECUÇÃO        leituras, análises, equipamentos, manutenções (prev. + corret.),
                ocorrências (+ fotos), instâncias de turno, passagens,
                tarefas por turno (+ fotos)
ESTOQUE         produtos químicos, entradas, saídas, contagens físicas
RASTREABILIDADE log de auditoria, histórico de versões de parâmetros
```

### 5.2 Os 13 módulos funcionais
1. **Leituras de campo** (operador) — mobile, detecção imediata de não-conformidade ao digitar (campo fica vermelho), draft em localStorage
2. **Análises laboratoriais** (técnico) — snapshots imutáveis, fluxo de aprovação, gráfico de tendência
3. **Equipamentos + manutenções** — preventiva auto-agenda a próxima via `$transaction`; corretiva com prioridade
4. **Ocorrências** — severidade → prazo (CRITICAL 24h / HIGH 72h / MEDIUM 168h / LOW 720h), foto até 5MB, resolução pelo técnico
5. **Turnos** — abertura + passagem em 2 etapas (sainte → entrante), checklist automático, timeout lazy, guard sainte≠entrante
6. **Tarefas por turno** (extra) — gestor/técnico atribui, operador conclui com até 3 fotos
7. **Estoque químico** (extra) — entrada/saída/contagem, estoque calculado vs físico, alerta duplo
8. **Dashboards** — um por perfil (operador, técnico, gestor com KPIs + BarChart)
9. **Configurações** (gestor) — 6 CRUDs
10. **Usuários** (gestor)
11. **Auditoria** (gestor) — log com estado anterior/posterior, filtros
12. **Troca de senha obrigatória** no 1º acesso
13. **Autenticação** — login, rate limiting, middleware por perfil

### 5.3 Estrutura de rotas (resumo)
```
/login, /trocar-senha, /acesso-negado
/operador/{dashboard, leituras, leituras/nova, turnos, turnos/abrir,
          turnos/[id]/tarefas, ocorrencias, ocorrencias/nova, estoque, ...}
/tecnico/{dashboard, analises, analises/historico, equipamentos,
          manutencoes, ocorrencias, turnos/instancias, turnos/instancias/[id], ...}
/gestor/{dashboard, usuarios, parametros, metodos, categorias,
         pontos-de-coleta, turnos, turnos/instancias, prazos-ocorrencia,
         produtos-quimicos, auditoria, ...}
```

---

## 6. O QUE ACABOU DE SER FEITO — Onda 1 (correção de bugs)

Seis bugs encontrados em teste de uso real, todos corrigidos com commit individual:

| # | Bug | Causa-raiz | Correção | Commit |
|---|---|---|---|---|
| 1 | `/tecnico/turnos` dava 404 | href incompleto no TecnicoBottomNav | apontado p/ `/tecnico/turnos/instancias` | `50a9301` |
| 2 | "Turnos" do Gestor dava 404 | mesma raiz do Bug 1 (gestor acessa rota do técnico) + double-active no sidebar | corrigido + `excludePrefix` no sidebar | `72528e0` |
| 3 | Header duplicado em abrir turno | já resolvido na Fase 12; achado extra: título "Create Next App" | título → "Solentis" | `cad94e0` |
| 4 | Botão "Sair" do técnico dava erro | `signOut({redirectTo})` não propaga cookie em Server Action | `signOut({redirect:false})` + `redirect('/login')` | `832a277` |
| 5 | Operador via turnos fechados, gestor via aberto | `date: today` na query do operador escondia turno noturno aberto ontem | removido filtro de data, filtra só por status | `0cefed3` |
| 6 | Sessões "se misturando" entre perfis | (a) limitação JWT entre abas — documentada; (b) guards `role !==` mais restritivos que o layout, expulsando MANAGER | guards corrigidos p/ incluir MANAGER + redirect p/ `/acesso-negado` + RUNBOOK seção 7 | `998cbb3` |

---

## 7. PARA ONDE VAMOS — roadmap

### 7.1 CONCLUÍDA — Onda 2 (UX de navegação)
Etapas A–F foram concluídas:
- **A** — componente `BackButton` reutilizável (href + label, fallback router.back)
- **B** — logo "Solentis" clicável → dashboard do perfil
- **C** — botão voltar nas telas internas do operador
- **D** — botão voltar nas telas internas do técnico
- **E** — botão voltar nas telas internas do gestor
- **F** — auditar botão "Sair" presente em todas as telas

### 7.2 PRÓXIMA — Onda 3 (mudanças de fluxo / regras de negócio)
- Técnico também registrar **saída** de produtos químicos (hoje só operador) — facilita ajustes de estoque
- Técnico **e** Gestor também registrarem ocorrências (hoje só operador)
- Atribuir tarefa a um turno **sem precisar abrir o turno** (pré-agendamento / pré-datado) → tornar o fluxo de tarefas contínuo e confiável
- Repensar o uso de "ocorrências" (definir melhor o propósito)
- Estoque: mostrar **quem registrou** cada movimento (rastreabilidade visual)

### 7.3 DEPOIS — Onda 4 (pós-MVP, features grandes)
- **Leitura de laudos com IA** (PROTÓTIPO JÁ FEITO — ver seção 8): anexa PDF do laboratório → IA extrai parâmetros → tabela de conformidade + gráfico → registro "Análise Efluentes DD/MM/AAAA". Estimativa caiu de 15-25h para 8-12h graças ao protótipo.
- Abertura automática de turno no login do operador
- Resumo do turno anterior para o operador entrante
- Notificações push/email para não-conformidade (severidade alta)
- PWA (instalação no dispositivo, offline parcial)
- DBO5 tratado como "último resultado com data" (não tempo real)
- Deploy (Vercel/Railway, ~R$50-80/mês + domínio) → migração SQLite → PostgreSQL
- **Sensores online** (DBO, OD, pH) — pesquisa de prazo LONGO; DBO exige 5 dias de incubação, é desafio técnico, não implementação imediata

### 7.4 Validação obrigatória antes de "produção"
O sistema é um **protótipo funcional**. Antes de uso real: validação em campo numa ETE parceira por pelo menos 3 meses, com feedback dos 3 perfis. NÃO está pronto para produção até Ondas 1-3 + QA completo.

---

## 8. ATIVOS PARALELOS (fora do código, mas do projeto)

### 8.1 Protótipo de leitura de laudos com IA
Arquivo React `solentis-laudos-ia.jsx` — protótipo funcional da feature da Onda 4. Usa a API Claude (model `claude-sonnet-4-6`) para extrair parâmetros de PDF/texto de laudo, comparar com CONAMA e gerar tabela + gráfico. Prompt de extração e lógica de conformidade já calibrados. Serve como especificação pronta para implementação.

### 8.2 Trabalho técnico AESabesp 2026
Artigo completo (`Solentis-AESabesp-2026-1afase.docx`) submetido ao Prêmio Jovem Profissional do 37º Encontro Técnico AESabesp. 10 páginas, resumo 190 palavras, 30 referências, 5 figuras. 1ª fase é anônima (sem nome de autor). Posiciona o sistema honestamente como protótipo. Não interfere no código, mas descreve o projeto com precisão técnica.

### 8.3 Logo (em criação)
Identidade visual sendo gerada: combinação da letra "S" com gota d'água, paleta azul (água/confiança), para integrar no header do app, favicon e ícone PWA.

---

## 9. CHECKLIST PARA A IA COLABORADORA

Antes de propor qualquer mudança, confirme:
- [ ] Li as regras invioláveis (seção 3)?
- [ ] A mudança respeita Prisma v5 (String p/ enum/JSON)?
- [ ] Server Actions novas têm Zod + guard de role?
- [ ] Queries filtram por `tenant_id`?
- [ ] Há `revalidatePath` após mutações?
- [ ] Snapshots de limite legal preservados (não trocar por FK ao limite atual)?
- [ ] `tsc --noEmit` limpo + testes verdes?
- [ ] Commit em português, atômico, com mensagem descritiva?
- [ ] CLAUDE.md atualizado se mudou arquitetura?
- [ ] Mostrei o diff ao autor antes de aplicar mudança grande?

---

*Fim do relatório de handoff. Mantenha este documento atualizado ao concluir cada Onda.*


# SOLENTIS — Relatório de Handoff Técnico
### Documento de transferência de contexto para colaboração entre IAs
**Última atualização:** sessão de correção de bugs (Onda 1 concluída)
**Destino:** Antigravity / IA colaboradora
**Autor do projeto:** Vitor — Engenheiro Ambiental, desenvolvedor iniciante

---

## COMO USAR ESTE DOCUMENTO

Este é o documento-mãe de contexto do projeto Solentis. Ele existe para que **qualquer IA** possa entrar no projeto sem quebrar o que já foi construído. Antes de propor ou executar QUALQUER alteração, leia as seções 1 a 6. As **regras invioláveis** estão na seção 3 — violá-las causa retrabalho ou quebra do sistema.

Princípio de colaboração: o autor (Vitor) é iniciante em programação. Explique decisões em linguagem acessível, trabalhe em incrementos pequenos e versionáveis, e NUNCA aplique grandes mudanças sem mostrar o diff antes.

---

## 1. DE ONDE VIEMOS — o que é o Solentis

### 1.1 O problema real
Estações de Tratamento de Efluentes (ETEs) de pequeno e médio porte no Brasil controlam sua operação em papel ou planilhas soltas. Isso dificulta:
- Comprovar conformidade com a **Resolução CONAMA nº 430/2011** (limites de lançamento de efluentes)
- Rastrear quem mediu o quê, quando, e sob qual limite legal vigente
- Auditar alterações e passagens de turno
- Tomar decisão baseada em dados

### 1.2 A solução
**Solentis** é uma aplicação web mobile-first que digitaliza o ciclo operacional completo de uma ETE, com a conformidade CONAMA como motor de design (não como relatório acoplado no fim). O contexto real de uso é a operação de uma fábrica de ARLA 32 (gestão do tratamento de efluentes industriais).

### 1.3 Os 3 perfis de usuário
| Perfil | Responsabilidade | Acesso |
|---|---|---|
| **OPERATOR** | Leituras de campo, ocorrências in loco, operação de turnos, saída/contagem de estoque | Cria e edita o que é seu |
| **TECHNICIAN** | Análises laboratoriais, equipamentos, manutenções, resolução de ocorrências, entrada de estoque | Cria e edita o técnico |
| **MANAGER (Gestor)** | Configuração, cadastros de referência, KPIs, auditoria | Vê tudo (inclusive telas de operador/técnico); escreve só no que é dele |

**Regra de ouro de permissão:** MANAGER tem acesso de LEITURA às rotas `/operador/*` e `/tecnico/*` (para monitoramento), mas operações de ESCRITA permanecem restritas ao perfil dono.

---

## 2. ONDE ESTAMOS — estado atual do código

### 2.1 Status geral (no fim da Onda 1)
```
✅ Fases 0 a 12 — completas e commitadas
✅ 2 features extras — Tarefas por Turno + Estoque Químico
✅ Onda 1 de bugs — 6 bugs críticos corrigidos
✅ 111 testes automatizados passando (Vitest)
✅ TypeScript estrito — zero erros
✅ Working tree limpo
```

### 2.2 Localização e como rodar
```
Pasta:    C:\Users\Vitor\projetos\meu-projeto  (Windows, pt-BR)
Subir:    npm run dev           → localhost:3000
Reset DB: npx prisma migrate reset   (recria seed)
Dados demo: npx tsx prisma/seed-demo.ts   (6 meses de dados p/ gráficos)
Testes:   npx vitest run
Tipos:    npx tsc --noEmit
```

### 2.3 Credenciais seed
```
admin@solentis.local    / Admin@123     (MANAGER)
tecnico@solentis.local  / Tecnico@123   (TECHNICIAN)
operador@solentis.local / Operador@123  (OPERATOR)
```

---

## 3. REGRAS INVIOLÁVEIS — leia antes de tocar no código

> Estas decisões foram tomadas com motivo. Reverter qualquer uma SEM um plano de migração explícito quebra o sistema.

### 3.1 Prisma v5.22.0 — NÃO atualizar para v7
O Prisma foi **deliberadamente fixado na v5.22.0**. A v7 é incompatível com a configuração SQLite simples usada aqui. Se sugerir update, PARE — exige plano de migração de banco completo.

### 3.2 SQLite não tem tipo Json nem enum nativo
Consequências obrigatórias no código:
- Campos que seriam JSON são armazenados como **String serializada** (5 campos no schema). Serializar/desserializar na aplicação.
- Enums são implementados como **String + constantes TypeScript** em `src/types/index.ts`. Nunca usar `enum` nativo do Prisma.

### 3.3 Status OVERDUE / TIMED_OUT é computado em query
Não há job em segundo plano. Vencimento de prazo de ocorrência e timeout de passagem de turno são avaliados **na própria query de leitura**, comparando com a data atual. Não criar cron para isso sem discutir.

### 3.4 Sessão JWT é compartilhada entre abas
Comportamento normal de cookie HTTP, NÃO é bug. Para testar múltiplos perfis: usar **janelas anônimas separadas** ou perfis diferentes do navegador. Documentado na seção 7 do RUNBOOK. Por isso, CADA `page.tsx` valida o role da sessão — não confiar só no middleware.

### 3.5 Snapshots imutáveis de limites legais
Ao registrar uma análise laboratorial, os limites mínimo/máximo vigentes são **copiados para a própria análise** (`min_limit_applied`, `max_limit_applied`). Atualizar o limite depois NÃO altera análises antigas. Isso é exigência de rastreabilidade temporal da CONAMA. Nunca "normalizar" isso para buscar o limite atual via FK.

### 3.6 Protocolo de trabalho com o autor
- Uma alteração / aprovação por vez. NÃO usar "allow all edits".
- `tsc --noEmit` antes de cada commit.
- Conventional Commits em **português**.
- Pausar em arquivos `actions.ts` para revisão manual; diffs visuais podem ser aprovados direto.
- `CLAUDE.md` é a memória viva do projeto — manter atualizado.

---

## 4. STACK TÉCNICA COMPLETA

| Camada | Tecnologia | Observação |
|---|---|---|
| Framework | Next.js 15 (Turbopack) | App Router, React Server Components |
| Linguagem | TypeScript (modo estrito) | terceira linha de defesa contra bugs |
| UI | Tailwind CSS v4 + shadcn/ui | tema escuro (slate-950/900/800) |
| ORM | Prisma 5.22.0 | fixo — ver regra 3.1 |
| Banco | SQLite (dev) | preparado p/ PostgreSQL em produção |
| Auth | NextAuth v5 | JWT, bcrypt 12 rounds |
| Validação | Zod | cliente + servidor, em todas as Server Actions |
| Testes | Vitest | 111 testes |
| Gráficos | Recharts | com ReferenceLine nos limites legais |

---

## 5. ARQUITETURA E MÓDULOS

### 5.1 Banco — 21 tabelas em 5 domínios
```
IDENTIDADE      tenants, usuários, sessões
CONFIGURAÇÃO    parâmetros (+ histórico de versões), métodos, pontos de coleta,
                turnos, categorias de equipamento, prazos por severidade
EXECUÇÃO        leituras, análises, equipamentos, manutenções (prev. + corret.),
                ocorrências (+ fotos), instâncias de turno, passagens,
                tarefas por turno (+ fotos)
ESTOQUE         produtos químicos, entradas, saídas, contagens físicas
RASTREABILIDADE log de auditoria, histórico de versões de parâmetros
```

### 5.2 Os 13 módulos funcionais
1. **Leituras de campo** (operador) — mobile, detecção imediata de não-conformidade ao digitar (campo fica vermelho), draft em localStorage
2. **Análises laboratoriais** (técnico) — snapshots imutáveis, fluxo de aprovação, gráfico de tendência
3. **Equipamentos + manutenções** — preventiva auto-agenda a próxima via `$transaction`; corretiva com prioridade
4. **Ocorrências** — severidade → prazo (CRITICAL 24h / HIGH 72h / MEDIUM 168h / LOW 720h), foto até 5MB, resolução pelo técnico
5. **Turnos** — abertura + passagem em 2 etapas (sainte → entrante), checklist automático, timeout lazy, guard sainte≠entrante
6. **Tarefas por turno** (extra) — gestor/técnico atribui, operador conclui com até 3 fotos
7. **Estoque químico** (extra) — entrada/saída/contagem, estoque calculado vs físico, alerta duplo
8. **Dashboards** — um por perfil (operador, técnico, gestor com KPIs + BarChart)
9. **Configurações** (gestor) — 6 CRUDs
10. **Usuários** (gestor)
11. **Auditoria** (gestor) — log com estado anterior/posterior, filtros
12. **Troca de senha obrigatória** no 1º acesso
13. **Autenticação** — login, rate limiting, middleware por perfil

### 5.3 Estrutura de rotas (resumo)
```
/login, /trocar-senha, /acesso-negado
/operador/{dashboard, leituras, leituras/nova, turnos, turnos/abrir,
          turnos/[id]/tarefas, ocorrencias, ocorrencias/nova, estoque, ...}
/tecnico/{dashboard, analises, analises/historico, equipamentos,
          manutencoes, ocorrencias, turnos/instancias, turnos/instancias/[id], ...}
/gestor/{dashboard, usuarios, parametros, metodos, categorias,
         pontos-de-coleta, turnos, turnos/instancias, prazos-ocorrencia,
         produtos-quimicos, auditoria, ...}
```

---

## 6. O QUE ACABOU DE SER FEITO — Onda 1 (correção de bugs)

Seis bugs encontrados em teste de uso real, todos corrigidos com commit individual:

| # | Bug | Causa-raiz | Correção | Commit |
|---|---|---|---|---|
| 1 | `/tecnico/turnos` dava 404 | href incompleto no TecnicoBottomNav | apontado p/ `/tecnico/turnos/instancias` | `50a9301` |
| 2 | "Turnos" do Gestor dava 404 | mesma raiz do Bug 1 (gestor acessa rota do técnico) + double-active no sidebar | corrigido + `excludePrefix` no sidebar | `72528e0` |
| 3 | Header duplicado em abrir turno | já resolvido na Fase 12; achado extra: título "Create Next App" | título → "Solentis" | `cad94e0` |
| 4 | Botão "Sair" do técnico dava erro | `signOut({redirectTo})` não propaga cookie em Server Action | `signOut({redirect:false})` + `redirect('/login')` | `832a277` |
| 5 | Operador via turnos fechados, gestor via aberto | `date: today` na query do operador escondia turno noturno aberto ontem | removido filtro de data, filtra só por status | `0cefed3` |
| 6 | Sessões "se misturando" entre perfis | (a) limitação JWT entre abas — documentada; (b) guards `role !==` mais restritivos que o layout, expulsando MANAGER | guards corrigidos p/ incluir MANAGER + redirect p/ `/acesso-negado` + RUNBOOK seção 7 | `998cbb3` |

---

## 7. PARA ONDE VAMOS — roadmap

### 7.1 CONCLUÍDA — Onda 2 (UX de navegação)
Etapas A–F foram concluídas:
- **A** — componente `BackButton` reutilizável (href + label, fallback router.back)
- **B** — logo "Solentis" clicável → dashboard do perfil
- **C** — botão voltar nas telas internas do operador
- **D** — botão voltar nas telas internas do técnico
- **E** — botão voltar nas telas internas do gestor
- **F** — auditar botão "Sair" presente em todas as telas

### 7.2 PRÓXIMA — Onda 3 (mudanças de fluxo / regras de negócio)
- Técnico também registrar **saída** de produtos químicos (hoje só operador) — facilita ajustes de estoque
- Técnico **e** Gestor também registrarem ocorrências (hoje só operador)
- Atribuir tarefa a um turno **sem precisar abrir o turno** (pré-agendamento / pré-datado) → tornar o fluxo de tarefas contínuo e confiável
- Repensar o uso de "ocorrências" (definir melhor o propósito)
- Estoque: mostrar **quem registrou** cada movimento (rastreabilidade visual)

### 7.3 DEPOIS — Onda 4 (pós-MVP, features grandes)
- **Leitura de laudos com IA** (PROTÓTIPO JÁ FEITO — ver seção 8): anexa PDF do laboratório → IA extrai parâmetros → tabela de conformidade + gráfico → registro "Análise Efluentes DD/MM/AAAA". Estimativa caiu de 15-25h para 8-12h graças ao protótipo.
- Abertura automática de turno no login do operador
- Resumo do turno anterior para o operador entrante
- Notificações push/email para não-conformidade (severidade alta)
- PWA (instalação no dispositivo, offline parcial)
- DBO5 tratado como "último resultado com data" (não tempo real)
- Deploy (Vercel/Railway, ~R$50-80/mês + domínio) → migração SQLite → PostgreSQL
- **Sensores online** (DBO, OD, pH) — pesquisa de prazo LONGO; DBO exige 5 dias de incubação, é desafio técnico, não implementação imediata

### 7.4 Validação obrigatória antes de "produção"
O sistema é um **protótipo funcional**. Antes de uso real: validação em campo numa ETE parceira por pelo menos 3 meses, com feedback dos 3 perfis. NÃO está pronto para produção até Ondas 1-3 + QA completo.

---

## 8. ATIVOS PARALELOS (fora do código, mas do projeto)

### 8.1 Protótipo de leitura de laudos com IA
Arquivo React `solentis-laudos-ia.jsx` — protótipo funcional da feature da Onda 4. Usa a API Claude (model `claude-sonnet-4-6`) para extrair parâmetros de PDF/texto de laudo, comparar com CONAMA e gerar tabela + gráfico. Prompt de extração e lógica de conformidade já calibrados. Serve como especificação pronta para implementação.

### 8.2 Trabalho técnico AESabesp 2026
Artigo completo (`Solentis-AESabesp-2026-1afase.docx`) submetido ao Prêmio Jovem Profissional do 37º Encontro Técnico AESabesp. 10 páginas, resumo 190 palavras, 30 referências, 5 figuras. 1ª fase é anônima (sem nome de autor). Posiciona o sistema honestamente como protótipo. Não interfere no código, mas descreve o projeto com precisão técnica.

### 8.3 Logo (em criação)
Identidade visual sendo gerada: combinação da letra "S" com gota d'água, paleta azul (água/confiança), para integrar no header do app, favicon e ícone PWA.

---

## 9. CHECKLIST PARA A IA COLABORADORA

Antes de propor qualquer mudança, confirme:
- [ ] Li as regras invioláveis (seção 3)?
- [ ] A mudança respeita Prisma v5 (String p/ enum/JSON)?
- [ ] Server Actions novas têm Zod + guard de role?
- [ ] Queries filtram por `tenant_id`?
- [ ] Há `revalidatePath` após mutações?
- [ ] Snapshots de limite legal preservados (não trocar por FK ao limite atual)?
- [ ] `tsc --noEmit` limpo + testes verdes?
- [ ] Commit em português, atômico, com mensagem descritiva?
- [ ] CLAUDE.md atualizado se mudou arquitetura?
- [ ] Mostrei o diff ao autor antes de aplicar mudança grande?

---

*Fim do relatório de handoff. Mantenha este documento atualizado ao concluir cada Onda.*

```

---
## CONFIGURAÇÃO DO PROJETO

### `package.json`
```json
{
  "name": "meu-projeto",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
  },
  "prisma": {
    "seed": "tsx prisma/seed.ts"
  },
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^1.14.0",
    "next": "16.2.6",
    "next-auth": "^5.0.0-beta.31",
    "radix-ui": "^1.4.3",
    "react": "19.2.4",
    "react-dom": "19.2.4",
    "recharts": "^3.8.1",
    "shadcn": "^4.7.0",
    "tailwind-merge": "^3.6.0",
    "tw-animate-css": "^1.4.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@prisma/client": "^5.22.0",
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@types/bcryptjs": "^2.4.6",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@vitejs/plugin-react": "^6.0.2",
    "dotenv": "^17.4.2",
    "eslint": "^9",
    "eslint-config-next": "16.2.6",
    "jsdom": "^29.1.1",
    "playwright": "^1.60.0",
    "prisma": "^5.22.0",
    "tailwindcss": "^4",
    "tsx": "^4.22.0",
    "typescript": "^5",
    "vitest": "^4.1.6"
  }
}

```

### `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": [
    "next-env.d.ts",
    "**/*.ts",
    "**/*.tsx",
    ".next/types/**/*.ts",
    ".next/dev/types/**/*.ts",
    "**/*.mts"
  ],
  "exclude": ["node_modules"]
}

```

### `next.config.ts`
```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Suporta upload de fotos de até 5 MB (+ overhead do multipart)
      bodySizeLimit: '6mb',
    },
  },
};

export default nextConfig;

```

### `.env.example`
```
# ==============================================================
# Solentis — variáveis de ambiente
# Copie este arquivo para .env e preencha os valores.
# NUNCA commite o arquivo .env — ele contém segredos.
# ==============================================================

# Banco de dados (SQLite em desenvolvimento)
# Em produção, substitua pela URL do seu banco (PostgreSQL, etc.)
DATABASE_URL="file:./dev.db"

# Desativa telemetria do Next.js
NEXT_TELEMETRY_DISABLED=1

# Segredo para assinar sessões NextAuth (mínimo 32 caracteres)
# Gere um valor seguro com: openssl rand -base64 32
NEXTAUTH_SECRET=troque-por-um-segredo-longo-e-aleatorio

# URL base da aplicação (sem barra final)
NEXTAUTH_URL=http://localhost:3000

```

### `vitest.config.ts`
```ts
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

```

---
## BANCO DE DADOS

### `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────────────────────────────────────
// a) Identidade & Autenticação
// ─────────────────────────────────────────────────────────────────────────────

model Tenant {
  id         String   @id @default(cuid())
  name       String
  slug       String   @unique
  is_active  Boolean  @default(true)
  created_at DateTime @default(now())

  users                   User[]
  sessions                Session[]
  login_attempts          LoginAttempt[]
  quality_parameters      QualityParameter[]
  analysis_methods        AnalysisMethod[]
  equipment_categories    EquipmentCategory[]
  collection_points       CollectionPoint[]
  shifts                  Shift[]
  equipment               Equipment[]
  readings                Reading[]
  analyses                Analysis[]
  preventive_maintenances PreventiveMaintenance[]
  corrective_maintenances CorrectiveMaintenance[]
  occurrences             Occurrence[]
  occurrence_photos       OccurrencePhoto[]
  shift_instances         ShiftInstance[]
  shift_handovers         ShiftHandover[]
  shift_tasks             ShiftTask[]
  shift_task_photos       ShiftTaskPhoto[]
  chemical_products       ChemicalProduct[]
  chemical_stock_entries  ChemicalStockEntry[]
  chemical_stock_exits    ChemicalStockExit[]
  chemical_stock_counts   ChemicalStockCount[]

  @@map("tenants")
}

model User {
  id                   String    @id @default(cuid())
  tenant_id            String
  email                String
  password_hash        String
  name                 String
  role                 String
  must_change_password Boolean   @default(true)
  is_active            Boolean   @default(true)
  last_login_at        DateTime?
  created_at           DateTime  @default(now())
  updated_at           DateTime  @updatedAt
  created_by           String?

  // — identidade
  tenant        Tenant  @relation(fields: [tenant_id], references: [id])
  creator       User?   @relation("CreatedBy", fields: [created_by], references: [id])
  created_users User[]  @relation("CreatedBy")
  sessions      Session[]

  // — configuração (1 FK por model → sem nome de relação)
  quality_parameters        QualityParameter[]
  severity_defaults_updated OccurrenceSeverityDefault[]
  parameter_histories       ParameterHistory[]

  // — operação (1 FK por model → sem nome de relação)
  equipment              Equipment[]
  readings               Reading[]
  preventive_completions PreventiveMaintenance[]
  corrective_assignments CorrectiveMaintenance[]
  occurrence_photos      OccurrencePhoto[]
  shift_instances        ShiftInstance[]
  audit_logs             AuditLog[]

  // — relações nomeadas (múltiplas FKs do mesmo model apontando para User)
  analyses_recorded       Analysis[]      @relation("AnalysisRecorder")
  analyses_approved       Analysis[]      @relation("AnalysisApprover")
  occurrences_reported    Occurrence[]    @relation("OccurrenceReporter")
  occurrences_responsible Occurrence[]    @relation("OccurrenceResponsible")
  occurrences_resolved    Occurrence[]    @relation("OccurrenceResolver")
  handovers_outgoing      ShiftHandover[] @relation("HandoverOutgoing")
  handovers_incoming      ShiftHandover[] @relation("HandoverIncoming")
  tasks_assigned          ShiftTask[]     @relation("TaskAssignee")
  tasks_created           ShiftTask[]     @relation("TaskCreator")
  tasks_completed         ShiftTask[]     @relation("TaskCompleter")
  task_photos_uploaded    ShiftTaskPhoto[]
  chemical_products       ChemicalProduct[]
  chemical_stock_entries  ChemicalStockEntry[]
  chemical_stock_exits    ChemicalStockExit[]
  chemical_stock_counts   ChemicalStockCount[]

  @@unique([tenant_id, email])
  @@index([tenant_id, role, is_active])
  @@index([created_at])
  @@map("users")
}

model LoginAttempt {
  id           String   @id @default(cuid())
  tenant_id    String
  email        String
  ip_address   String?
  success      Boolean
  attempted_at DateTime @default(now())

  tenant Tenant @relation(fields: [tenant_id], references: [id])

  @@index([tenant_id, email, attempted_at])
  @@map("login_attempts")
}

// Incluída no schema conforme modelo de dados; não utilizada pelo NextAuth JWT (strategy = "jwt")
model Session {
  id            String   @id
  tenant_id     String
  session_token String   @unique
  user_id       String
  expires       DateTime

  tenant Tenant @relation(fields: [tenant_id], references: [id])
  user   User   @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("sessions")
}

// ─────────────────────────────────────────────────────────────────────────────
// b) Configuração
// ─────────────────────────────────────────────────────────────────────────────

model QualityParameter {
  id              String   @id @default(cuid())
  tenant_id       String
  name            String
  unit            String
  min_limit       Float?
  max_limit       Float?
  legal_reference String?
  effective_date  DateTime
  is_active       Boolean  @default(true)
  created_at      DateTime @default(now())
  updated_at      DateTime @updatedAt
  created_by      String

  tenant  Tenant @relation(fields: [tenant_id], references: [id])
  creator User   @relation(fields: [created_by], references: [id])

  readings Reading[]
  analyses Analysis[]
  history  ParameterHistory[]

  @@index([tenant_id, is_active])
  @@index([created_at])
  @@map("quality_parameters")
}

model ParameterHistory {
  id                    String    @id @default(cuid())
  parameter_id          String
  min_limit_before      Float?
  max_limit_before      Float?
  min_limit_after       Float?
  max_limit_after       Float?
  effective_date_before DateTime?
  effective_date_after  DateTime
  changed_by            String
  changed_at            DateTime  @default(now())
  reason                String?

  parameter QualityParameter @relation(fields: [parameter_id], references: [id])
  changer   User             @relation(fields: [changed_by], references: [id])

  @@index([parameter_id, changed_at])
  @@map("parameter_history")
}

model AnalysisMethod {
  id          String   @id @default(cuid())
  tenant_id   String
  name        String
  description String?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())

  tenant   Tenant     @relation(fields: [tenant_id], references: [id])
  analyses Analysis[]

  @@unique([tenant_id, name])
  @@map("analysis_methods")
}

model EquipmentCategory {
  id          String   @id @default(cuid())
  tenant_id   String
  name        String
  description String?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())

  tenant    Tenant      @relation(fields: [tenant_id], references: [id])
  equipment Equipment[]

  @@unique([tenant_id, name])
  @@map("equipment_categories")
}

model CollectionPoint {
  id          String   @id @default(cuid())
  tenant_id   String
  name        String
  location    String?
  description String?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())

  tenant   Tenant     @relation(fields: [tenant_id], references: [id])
  readings Reading[]
  analyses Analysis[]

  @@index([tenant_id])
  @@map("collection_points")
}

model Shift {
  id                       String   @id @default(cuid())
  tenant_id                String
  name                     String
  start_time               String
  end_time                 String
  crosses_midnight         Boolean  @default(false)
  handover_timeout_minutes Int      @default(120)
  is_active                Boolean  @default(true)
  created_at               DateTime @default(now())

  tenant          Tenant          @relation(fields: [tenant_id], references: [id])
  shift_instances ShiftInstance[]

  @@index([tenant_id])
  @@map("shifts")
}

// 4 linhas fixas (uma por severidade) — PK é o próprio severity; sem tenant_id (global)
model OccurrenceSeverityDefault {
  severity       String   @id
  deadline_hours Int
  updated_at     DateTime @updatedAt
  updated_by     String

  updater User @relation(fields: [updated_by], references: [id])

  @@map("occurrence_severity_defaults")
}

// ─────────────────────────────────────────────────────────────────────────────
// c) Operação
// ─────────────────────────────────────────────────────────────────────────────

model Equipment {
  id                        String    @id @default(cuid())
  tenant_id                 String
  name                      String
  category_id               String
  serial_number             String?
  location                  String?
  installation_date         DateTime?
  preventive_frequency_days Int
  is_active                 Boolean   @default(true)
  created_at                DateTime  @default(now())
  created_by                String

  tenant                  Tenant                  @relation(fields: [tenant_id], references: [id])
  category                EquipmentCategory       @relation(fields: [category_id], references: [id])
  creator                 User                    @relation(fields: [created_by], references: [id])
  preventive_maintenances PreventiveMaintenance[]
  corrective_maintenances CorrectiveMaintenance[]

  @@index([tenant_id, category_id])
  @@map("equipment")
}

model ShiftInstance {
  id         String    @id @default(cuid())
  tenant_id  String
  shift_id   String
  date       DateTime
  opened_by  String
  opened_at  DateTime  @default(now())
  closed_at  DateTime?
  status     String    @default("OPEN")
  created_at DateTime  @default(now())

  tenant      Tenant         @relation(fields: [tenant_id], references: [id])
  shift       Shift          @relation(fields: [shift_id], references: [id])
  opener      User           @relation(fields: [opened_by], references: [id])
  readings    Reading[]
  handover    ShiftHandover?
  shift_tasks ShiftTask[]

  @@index([tenant_id, shift_id, date])
  @@index([opened_by])
  @@map("shift_instances")
}

model Reading {
  id                  String    @id @default(cuid())
  tenant_id           String
  collection_point_id String
  parameter_id        String?
  shift_instance_id   String?
  value               Float?
  unit                String?
  notes               String?
  is_non_conformant   Boolean?
  origin              String    @default("MANUAL")
  metadata_origin     String?   // JSON serializado: {device_id, topic, qos} — reservado para sensores (v2.0)
  recorded_by         String
  recorded_at         DateTime
  created_at          DateTime  @default(now())

  tenant           Tenant            @relation(fields: [tenant_id], references: [id])
  collection_point CollectionPoint   @relation(fields: [collection_point_id], references: [id])
  parameter        QualityParameter? @relation(fields: [parameter_id], references: [id])
  shift_instance   ShiftInstance?    @relation(fields: [shift_instance_id], references: [id])
  recorder         User              @relation(fields: [recorded_by], references: [id])

  @@index([tenant_id, recorded_at])
  @@index([collection_point_id])
  @@index([parameter_id])
  @@index([shift_instance_id])
  @@index([tenant_id, is_non_conformant, created_at])
  @@map("readings")
}

model Analysis {
  id                  String    @id @default(cuid())
  tenant_id           String
  collection_point_id String
  parameter_id        String
  method_id           String
  value               Float
  unit                String
  min_limit_applied   Float?
  max_limit_applied   Float?
  report_text         String?
  is_non_conformant   Boolean
  approved_by         String?
  approved_at         DateTime?
  origin              String    @default("MANUAL")
  metadata_origin     String?   // JSON serializado — reservado para sensores (v2.0)
  collected_at        DateTime
  recorded_by         String
  created_at          DateTime  @default(now())

  tenant           Tenant           @relation(fields: [tenant_id], references: [id])
  collection_point CollectionPoint  @relation(fields: [collection_point_id], references: [id])
  parameter        QualityParameter @relation(fields: [parameter_id], references: [id])
  method           AnalysisMethod   @relation(fields: [method_id], references: [id])
  recorder         User             @relation("AnalysisRecorder", fields: [recorded_by], references: [id])
  approver         User?            @relation("AnalysisApprover", fields: [approved_by], references: [id])

  @@index([tenant_id, parameter_id, collected_at])
  @@index([tenant_id, is_non_conformant, approved_by])
  @@index([collection_point_id])
  @@index([recorded_by])
  @@index([collected_at])
  @@map("analyses")
}

model PreventiveMaintenance {
  id             String    @id @default(cuid())
  tenant_id      String
  equipment_id   String
  scheduled_date DateTime
  completed_date DateTime?
  completed_by   String?
  notes          String?
  status         String    @default("SCHEDULED")
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt

  tenant    Tenant    @relation(fields: [tenant_id], references: [id])
  equipment Equipment @relation(fields: [equipment_id], references: [id])
  completer User?     @relation(fields: [completed_by], references: [id])

  @@index([equipment_id, scheduled_date, status])
  @@index([tenant_id, status])
  @@map("preventive_maintenances")
}

model CorrectiveMaintenance {
  id             String    @id @default(cuid())
  tenant_id      String
  equipment_id   String
  description    String
  responsible_id String
  priority       String?   @default("MEDIUM")
  start_date     DateTime
  end_date       DateTime?
  status         String    @default("IN_PROGRESS")
  estimated_cost Decimal?
  actual_cost    Decimal?
  notes          String?
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt

  tenant      Tenant    @relation(fields: [tenant_id], references: [id])
  equipment   Equipment @relation(fields: [equipment_id], references: [id])
  responsible User      @relation(fields: [responsible_id], references: [id])

  @@index([equipment_id, status])
  @@index([tenant_id, priority, status])
  @@map("corrective_maintenances")
}

model Occurrence {
  id             String    @id @default(cuid())
  tenant_id      String
  description    String
  severity       String
  status         String    @default("OPEN")
  deadline          DateTime
  resolved_at       DateTime?
  resolved_by       String?
  resolution_notes  String?
  responsible_id    String?
  reported_by       String
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt

  tenant      Tenant          @relation(fields: [tenant_id], references: [id])
  reporter    User            @relation("OccurrenceReporter",    fields: [reported_by],    references: [id])
  responsible User?           @relation("OccurrenceResponsible", fields: [responsible_id], references: [id])
  resolver    User?           @relation("OccurrenceResolver",    fields: [resolved_by],    references: [id])
  photos      OccurrencePhoto[]

  @@index([tenant_id, severity, status])
  @@index([deadline])
  @@index([reported_by])
  @@map("occurrences")
}

model OccurrencePhoto {
  id            String   @id @default(cuid())
  tenant_id     String
  occurrence_id String
  filename      String
  original_name String
  mime_type     String
  size_bytes    Int
  uploaded_by   String
  uploaded_at   DateTime @default(now())

  tenant     Tenant     @relation(fields: [tenant_id], references: [id])
  occurrence Occurrence @relation(fields: [occurrence_id], references: [id], onDelete: Cascade)
  uploader   User       @relation(fields: [uploaded_by], references: [id])

  @@index([occurrence_id])
  @@map("occurrence_photos")
}

// ─────────────────────────────────────────────────────────────────────────────
// d) Fluxo de Turno
// ─────────────────────────────────────────────────────────────────────────────

model ShiftHandover {
  id                    String    @id @default(cuid())
  tenant_id             String
  shift_instance_id     String    @unique
  outgoing_user_id      String
  incoming_user_id      String?
  checklist_data        String    // JSON serializado: {readings_done, open_occurrences, pending_items}
  outgoing_observations String?
  handover_at           DateTime
  timeout_at            DateTime
  incoming_observations String?
  confirmed_at          DateTime?
  status                String    @default("PENDING")
  created_at            DateTime  @default(now())

  tenant         Tenant        @relation(fields: [tenant_id], references: [id])
  shift_instance ShiftInstance @relation(fields: [shift_instance_id], references: [id], onDelete: Cascade)
  outgoing_user  User          @relation("HandoverOutgoing", fields: [outgoing_user_id], references: [id])
  incoming_user  User?         @relation("HandoverIncoming", fields: [incoming_user_id], references: [id])

  @@index([status, timeout_at])
  @@map("shift_handovers")
}

model ShiftTask {
  id                String    @id @default(cuid())
  tenant_id         String
  shift_instance_id String
  title             String
  description       String?
  assigned_to_id    String?
  created_by        String
  created_at        DateTime  @default(now())
  completed_at      DateTime?
  completed_by      String?
  completion_notes  String?
  status            String    @default("PENDING")

  tenant         Tenant          @relation(fields: [tenant_id], references: [id])
  shift_instance ShiftInstance   @relation(fields: [shift_instance_id], references: [id], onDelete: Cascade)
  assignee       User?           @relation("TaskAssignee", fields: [assigned_to_id], references: [id])
  creator        User            @relation("TaskCreator", fields: [created_by], references: [id])
  completer      User?           @relation("TaskCompleter", fields: [completed_by], references: [id])
  photos         ShiftTaskPhoto[]

  @@index([shift_instance_id, status])
  @@index([tenant_id, assigned_to_id, status])
  @@map("shift_tasks")
}

model ShiftTaskPhoto {
  id            String   @id @default(cuid())
  tenant_id     String
  task_id       String
  filename      String
  original_name String
  mime_type     String
  size_bytes    Int
  uploaded_by   String
  uploaded_at   DateTime @default(now())

  tenant   Tenant    @relation(fields: [tenant_id], references: [id])
  task     ShiftTask @relation(fields: [task_id], references: [id], onDelete: Cascade)
  uploader User      @relation(fields: [uploaded_by], references: [id])

  @@index([task_id])
  @@map("shift_task_photos")
}

// ─────────────────────────────────────────────────────────────────────────────
// f) Estoque de Produtos Químicos
// ─────────────────────────────────────────────────────────────────────────────

model ChemicalProduct {
  id          String   @id @default(cuid())
  tenant_id   String
  name        String
  unit        String
  min_stock   Float
  description String?
  is_active   Boolean  @default(true)
  created_by  String
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  tenant  Tenant @relation(fields: [tenant_id], references: [id])
  creator User   @relation(fields: [created_by], references: [id])

  entries ChemicalStockEntry[]
  exits   ChemicalStockExit[]
  counts  ChemicalStockCount[]

  @@index([tenant_id, is_active])
  @@map("chemical_products")
}

model ChemicalStockEntry {
  id             String   @id @default(cuid())
  tenant_id      String
  product_id     String
  quantity       Float
  supplier       String?
  invoice_number String?
  notes          String?
  received_at    DateTime
  recorded_by    String
  created_at     DateTime @default(now())

  tenant   Tenant          @relation(fields: [tenant_id], references: [id])
  product  ChemicalProduct @relation(fields: [product_id], references: [id])
  recorder User            @relation(fields: [recorded_by], references: [id])

  @@index([tenant_id, product_id, received_at])
  @@map("chemical_stock_entries")
}

model ChemicalStockExit {
  id          String   @id @default(cuid())
  tenant_id   String
  product_id  String
  quantity    Float
  notes       String?
  used_at     DateTime
  recorded_by String
  created_at  DateTime @default(now())

  tenant   Tenant          @relation(fields: [tenant_id], references: [id])
  product  ChemicalProduct @relation(fields: [product_id], references: [id])
  recorder User            @relation(fields: [recorded_by], references: [id])

  @@index([tenant_id, product_id, used_at])
  @@map("chemical_stock_exits")
}

model ChemicalStockCount {
  id               String   @id @default(cuid())
  tenant_id        String
  product_id       String
  counted_quantity Float
  notes            String?
  counted_at       DateTime
  recorded_by      String
  created_at       DateTime @default(now())

  tenant   Tenant          @relation(fields: [tenant_id], references: [id])
  product  ChemicalProduct @relation(fields: [product_id], references: [id])
  recorder User            @relation(fields: [recorded_by], references: [id])

  @@index([tenant_id, product_id, counted_at])
  @@map("chemical_stock_counts")
}

// ─────────────────────────────────────────────────────────────────────────────
// e) Rastreabilidade
// ─────────────────────────────────────────────────────────────────────────────

// Sem tenant_id — contexto recuperado via record_id + table_name
model AuditLog {
  id            String   @id @default(cuid())
  user_id       String?
  table_name    String
  record_id     String
  action        String
  before        String?   // JSON serializado — estado anterior do registro (null em CREATE)
  after         String?   // JSON serializado — estado posterior do registro (null em DELETE)
  ip_address    String?
  justification String?
  timestamp     DateTime @default(now())

  user User? @relation(fields: [user_id], references: [id])

  @@index([table_name, record_id])
  @@index([user_id, timestamp])
  @@index([timestamp])
  @@map("audit_logs")
}

```

### `prisma/seed.ts`
```ts
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/password'

const prisma = new PrismaClient()

async function main() {
  // ── Tenant ────────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default', name: 'Solentis', slug: 'solentis', is_active: true },
  })
  console.log(`Tenant: ${tenant.name}`)

  // ── Usuários (hashes em paralelo) ─────────────────────────────────────────
  const [adminHash, tecnicoHash, operadorHash] = await Promise.all([
    hashPassword('Admin@123'),
    hashPassword('Tecnico@123'),
    hashPassword('Operador@123'),
  ])

  const admin = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: 'default', email: 'admin@solentis.local' } },
    update: {},
    create: {
      tenant_id: 'default',
      email: 'admin@solentis.local',
      password_hash: adminHash,
      name: 'Administrador',
      role: 'MANAGER',
      must_change_password: true,
      is_active: true,
    },
  })
  console.log(`Usuario: ${admin.email} (${admin.role})`)

  const tecnico = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: 'default', email: 'tecnico@solentis.local' } },
    update: {},
    create: {
      tenant_id: 'default',
      email: 'tecnico@solentis.local',
      password_hash: tecnicoHash,
      name: 'Tecnico Padrao',
      role: 'TECHNICIAN',
      must_change_password: false,
      is_active: true,
      created_by: admin.id,
    },
  })
  console.log(`Usuario: ${tecnico.email} (${tecnico.role})`)

  const operador = await prisma.user.upsert({
    where: { tenant_id_email: { tenant_id: 'default', email: 'operador@solentis.local' } },
    update: {},
    create: {
      tenant_id: 'default',
      email: 'operador@solentis.local',
      password_hash: operadorHash,
      name: 'Operador Padrao',
      role: 'OPERATOR',
      must_change_password: false,
      is_active: true,
      created_by: admin.id,
    },
  })
  console.log(`Usuario: ${operador.email} (${operador.role})`)

  // ── Parâmetros de qualidade CONAMA ────────────────────────────────────────
  const effectiveDate = new Date('2025-01-01T00:00:00.000Z')

  const qualityParams = [
    { id: 'seed-param-ph',          name: 'pH',                         unit: 'adimensional', min_limit: 5.0,  max_limit: 9.0   },
    { id: 'seed-param-dbo',         name: 'DBO5',                       unit: 'mg/L',         min_limit: null, max_limit: 60.0  },
    { id: 'seed-param-dqo',         name: 'DQO',                        unit: 'mg/L',         min_limit: null, max_limit: 200.0 },
    { id: 'seed-param-n-amoniacal', name: 'Nitrogenio Amoniacal',       unit: 'mg/L',         min_limit: null, max_limit: 20.0  },
    { id: 'seed-param-fosforo',     name: 'Fosforo Total',              unit: 'mg/L',         min_limit: null, max_limit: 1.0   },
    { id: 'seed-param-ss',          name: 'Solidos Suspensos',          unit: 'mg/L',         min_limit: null, max_limit: 100.0 },
    { id: 'seed-param-coliformes',  name: 'Coliformes Termotolerantes', unit: 'NMP/100mL',    min_limit: null, max_limit: 1000.0},
    { id: 'seed-param-turbidez',    name: 'Turbidez',                   unit: 'NTU',          min_limit: null, max_limit: 100.0 },
  ]

  for (const param of qualityParams) {
    await prisma.qualityParameter.upsert({
      where: { id: param.id },
      update: {},
      create: {
        id: param.id,
        tenant_id: 'default',
        name: param.name,
        unit: param.unit,
        min_limit: param.min_limit,
        max_limit: param.max_limit,
        legal_reference: 'CONAMA 430/2011 Art. 16',
        effective_date: effectiveDate,
        is_active: true,
        created_by: admin.id,
      },
    })
  }
  console.log(`Parametros CONAMA: ${qualityParams.length}`)

  // ── Métodos de análise ────────────────────────────────────────────────────
  const analysisMethods = [
    { id: 'seed-method-colorimetria', name: 'Colorimetria', description: 'Metodo colorimetrico para determinacao de compostos em solucao' },
    { id: 'seed-method-gravimetria',  name: 'Gravimetria',  description: 'Metodo gravimetrico para determinacao de solidos e residuos' },
    { id: 'seed-method-titulacao',    name: 'Titulacao',    description: 'Metodo volumetrico por titulacao para alcalinidade e dureza' },
  ]

  for (const method of analysisMethods) {
    await prisma.analysisMethod.upsert({
      where: { tenant_id_name: { tenant_id: 'default', name: method.name } },
      update: {},
      create: {
        id: method.id,
        tenant_id: 'default',
        name: method.name,
        description: method.description,
        is_active: true,
      },
    })
  }
  console.log(`Metodos de analise: ${analysisMethods.length}`)

  // ── Categorias de equipamento ─────────────────────────────────────────────
  const equipmentCategories = [
    { id: 'seed-cat-bombas',     name: 'Bombas',           description: 'Bombas de recalque e submersas' },
    { id: 'seed-cat-aeradores',  name: 'Aeradores',        description: 'Aeradores superficiais e difusores' },
    { id: 'seed-cat-filtros',    name: 'Filtros',          description: 'Filtros de areia, carvao ativado e membranas' },
    { id: 'seed-cat-medidores',  name: 'Medidores',        description: 'Medidores de vazao, pH, OD e turbidez' },
    { id: 'seed-cat-dosadores',  name: 'Dosadores',        description: 'Bombas dosadoras de cloro, coagulante e floculante' },
    { id: 'seed-cat-estruturas', name: 'Estruturas Civis', description: 'Tanques, calhas e decantadores' },
  ]

  for (const cat of equipmentCategories) {
    await prisma.equipmentCategory.upsert({
      where: { tenant_id_name: { tenant_id: 'default', name: cat.name } },
      update: {},
      create: {
        id: cat.id,
        tenant_id: 'default',
        name: cat.name,
        description: cat.description,
        is_active: true,
      },
    })
  }
  console.log(`Categorias de equipamento: ${equipmentCategories.length}`)

  // ── Pontos de coleta ──────────────────────────────────────────────────────
  const collectionPoints = [
    { id: 'seed-cp-entrada', name: 'Entrada ETE',      location: 'Calha Parshall - entrada',      description: 'Efluente bruto antes de qualquer tratamento' },
    { id: 'seed-cp-reator',  name: 'Reator Biologico', location: 'Tanque de aeracao - saida',     description: 'Efluente apos tratamento biologico aerobio' },
    { id: 'seed-cp-saida',   name: 'Saida Final',      location: 'Calha de saida - apos filtros', description: 'Efluente tratado lancado no corpo receptor' },
  ]

  for (const cp of collectionPoints) {
    await prisma.collectionPoint.upsert({
      where: { id: cp.id },
      update: {},
      create: {
        id: cp.id,
        tenant_id: 'default',
        name: cp.name,
        location: cp.location,
        description: cp.description,
        is_active: true,
      },
    })
  }
  console.log(`Pontos de coleta: ${collectionPoints.length}`)

  // ── Turnos ────────────────────────────────────────────────────────────────
  const shifts = [
    { id: 'seed-shift-manha', name: 'Manha', start_time: '06:00', end_time: '14:00', crosses_midnight: false },
    { id: 'seed-shift-tarde', name: 'Tarde', start_time: '14:00', end_time: '22:00', crosses_midnight: false },
    { id: 'seed-shift-noite', name: 'Noite', start_time: '22:00', end_time: '06:00', crosses_midnight: true  },
  ]

  for (const shift of shifts) {
    await prisma.shift.upsert({
      where: { id: shift.id },
      update: {},
      create: {
        id: shift.id,
        tenant_id: 'default',
        name: shift.name,
        start_time: shift.start_time,
        end_time: shift.end_time,
        crosses_midnight: shift.crosses_midnight,
        handover_timeout_minutes: 120,
        is_active: true,
      },
    })
  }
  console.log(`Turnos: ${shifts.length} (Manha, Tarde, Noite)`)

  // ── Prazos padrão de ocorrência (4 linhas fixas) ──────────────────────────
  const severityDefaults = [
    { severity: 'CRITICAL', deadline_hours: 24  },
    { severity: 'HIGH',     deadline_hours: 72  },
    { severity: 'MEDIUM',   deadline_hours: 168 },
    { severity: 'LOW',      deadline_hours: 720 },
  ]

  for (const sd of severityDefaults) {
    await prisma.occurrenceSeverityDefault.upsert({
      where: { severity: sd.severity },
      update: {},
      create: {
        severity: sd.severity,
        deadline_hours: sd.deadline_hours,
        updated_by: admin.id,
      },
    })
  }
  console.log(`Prazos de ocorrencia: CRITICAL=24h, HIGH=72h, MEDIUM=168h, LOW=720h`)

  // ── Produtos químicos ─────────────────────────────────────────────────────
  const chemicalProducts = [
    { id: 'seed-chem-cloro-gran',    name: 'Cloro Granulado',       unit: 'kg',   min_stock: 20,  description: 'Hipoclorito de calcio granulado 65% - desinfeccao' },
    { id: 'seed-chem-hipoclorito',   name: 'Hipoclorito de Sodio',  unit: 'L',    min_stock: 50,  description: 'Solucao 12% - desinfeccao do efluente final' },
    { id: 'seed-chem-cal',           name: 'Cal Hidratada',         unit: 'saco', min_stock: 5,   description: 'Saco 20 kg - correcao de pH e precipitacao de fosforo' },
    { id: 'seed-chem-sulfato-al',    name: 'Sulfato de Aluminio',   unit: 'kg',   min_stock: 100, description: 'Coagulante primario para remocao de turbidez e SST' },
    { id: 'seed-chem-polimero',      name: 'Polimero Cationico',    unit: 'kg',   min_stock: 10,  description: 'Floculante auxiliar para desaguamento do lodo' },
  ]

  for (const product of chemicalProducts) {
    await prisma.chemicalProduct.upsert({
      where: { id: product.id },
      update: {},
      create: {
        id: product.id,
        tenant_id: 'default',
        name: product.name,
        unit: product.unit,
        min_stock: product.min_stock,
        description: product.description,
        is_active: true,
        created_by: admin.id,
      },
    })
  }
  console.log(`Produtos quimicos: ${chemicalProducts.length}`)

  console.log('\nSeed concluido com sucesso.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

```

### `prisma/seed-demo.ts`
```ts
/**
 * Seed de demonstração: gera ~6 meses de dados operacionais realistas.
 * Uso: npx tsx prisma/seed-demo.ts
 * Pré-requisito: npx prisma db seed (seed principal) já executado.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const TENANT_ID = 'default'

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000)
}

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1))
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function main() {
  console.log('Carregando dados base...')

  const [users, params, methods, points, shifts, equipment, products] = await Promise.all([
    prisma.user.findMany({ where: { tenant_id: TENANT_ID } }),
    prisma.qualityParameter.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.analysisMethod.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.collectionPoint.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.shift.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.equipment.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
    prisma.chemicalProduct.findMany({ where: { tenant_id: TENANT_ID, is_active: true } }),
  ])

  const operators   = users.filter((u) => u.role === 'OPERATOR')
  const technicians = users.filter((u) => u.role === 'TECHNICIAN')
  const managers    = users.filter((u) => u.role === 'MANAGER')
  const allUsers    = users

  if (operators.length === 0 || technicians.length === 0) {
    console.error('Rode npx prisma db seed antes deste script.')
    process.exit(1)
  }

  // ── Leituras (180 dias × ~2/dia) ─────────────────────────────────────────
  console.log('Gerando leituras de campo...')
  const readingsData = []
  for (let day = 180; day >= 0; day--) {
    const count = randomInt(1, 4)
    for (let i = 0; i < count; i++) {
      const param = randomItem(params)
      const point = randomItem(points)
      const op    = randomItem(operators)
      const base  = param.max_limit ?? 10
      // ~20% dos valores fora do limite para gerar não-conformidades
      const outOfRange = Math.random() < 0.2
      const value = outOfRange
        ? base * randomBetween(1.1, 1.5)
        : base * randomBetween(0.3, 0.95)

      const isNonConformant =
        (param.max_limit !== null && value > param.max_limit) ||
        (param.min_limit !== null && value < param.min_limit)

      readingsData.push({
        tenant_id:           TENANT_ID,
        collection_point_id: point.id,
        parameter_id:        param.id,
        value,
        unit:                param.unit,
        is_non_conformant:   isNonConformant,
        origin:              'MANUAL',
        recorded_by:         op.id,
        recorded_at:         daysAgo(day),
        created_at:          daysAgo(day),
      })
    }
  }
  await prisma.reading.createMany({ data: readingsData })
  console.log(`  ${readingsData.length} leituras criadas`)

  // ── Análises (180 dias × ~1/dia) ─────────────────────────────────────────
  console.log('Gerando análises laboratoriais...')
  const analysesData = []
  for (let day = 180; day >= 0; day--) {
    if (Math.random() < 0.4) continue // ~60% dos dias têm análise
    const param  = randomItem(params)
    const method = randomItem(methods)
    const point  = randomItem(points)
    const tech   = randomItem(technicians)
    const base   = param.max_limit ?? 10
    const outOfRange = Math.random() < 0.25
    const value  = outOfRange
      ? base * randomBetween(1.1, 1.6)
      : base * randomBetween(0.2, 0.95)

    const isNonConformant =
      (param.max_limit !== null && value > param.max_limit) ||
      (param.min_limit !== null && value < param.min_limit)

    // ~70% das análises são aprovadas
    const approved = Math.random() < 0.7
    const approver = approved ? randomItem([...technicians, ...managers]) : null

    analysesData.push({
      tenant_id:           TENANT_ID,
      collection_point_id: point.id,
      parameter_id:        param.id,
      method_id:           method.id,
      value,
      unit:                param.unit,
      min_limit_applied:   param.min_limit,
      max_limit_applied:   param.max_limit,
      is_non_conformant:   isNonConformant,
      approved_by:         approver?.id ?? null,
      approved_at:         approver ? daysAgo(day) : null,
      origin:              'MANUAL',
      collected_at:        daysAgo(day),
      recorded_by:         tech.id,
      created_at:          daysAgo(day),
    })
  }
  await prisma.analysis.createMany({ data: analysesData })
  console.log(`  ${analysesData.length} análises criadas`)

  // ── Ocorrências (1 por semana nos últimos 6 meses) ────────────────────────
  console.log('Gerando ocorrências...')
  const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
  const statuses   = ['OPEN', 'IN_PROGRESS', 'RESOLVED']

  const severityDefaults = await prisma.occurrenceSeverityDefault.findMany()
  const deadlineMap = new Map(severityDefaults.map((s) => [s.severity, s.deadline_hours]))

  const occurrencesData = []
  for (let week = 24; week >= 0; week--) {
    const count = randomInt(1, 3)
    for (let i = 0; i < count; i++) {
      const sev        = randomItem(severities)
      const op         = randomItem(operators)
      const deadlineH  = deadlineMap.get(sev) ?? 72
      const createdAt  = daysAgo(week * 7 + randomInt(0, 6))
      const deadline   = new Date(createdAt.getTime() + deadlineH * 60 * 60 * 1000)
      const isResolved = Math.random() < 0.6
      const status     = isResolved ? 'RESOLVED' : randomItem(['OPEN', 'IN_PROGRESS'])

      occurrencesData.push({
        tenant_id:        TENANT_ID,
        description:      `Ocorrência de demonstração — ${sev} — semana ${week}`,
        severity:         sev,
        status,
        deadline,
        resolved_at:      isResolved ? new Date(deadline.getTime() + randomInt(-12, 48) * 60 * 60 * 1000) : null,
        resolved_by:      isResolved ? randomItem([...technicians, ...managers]).id : null,
        resolution_notes: isResolved ? 'Problema identificado e corrigido conforme procedimento.' : null,
        reported_by:      op.id,
        created_at:       createdAt,
        updated_at:       createdAt,
      })
    }
  }
  await prisma.occurrence.createMany({ data: occurrencesData })
  console.log(`  ${occurrencesData.length} ocorrências criadas`)

  // ── Manutenções preventivas concluídas ───────────────────────────────────
  console.log('Gerando preventivas concluídas...')
  if (equipment.length > 0) {
    const preventivas = []
    for (const eq of equipment) {
      // Simula 3-6 preventivas concluídas nos últimos 6 meses
      const count = randomInt(2, 5)
      for (let i = count; i >= 1; i--) {
        const scheduledDaysAgo = i * Math.floor(180 / count)
        const tech = randomItem(technicians)
        preventivas.push({
          tenant_id:      TENANT_ID,
          equipment_id:   eq.id,
          scheduled_date: daysAgo(scheduledDaysAgo + 2),
          completed_date: daysAgo(scheduledDaysAgo),
          completed_by:   tech.id,
          status:         'COMPLETED',
          notes:          'Preventiva realizada conforme plano de manutenção.',
          created_at:     daysAgo(scheduledDaysAgo + 5),
          updated_at:     daysAgo(scheduledDaysAgo),
        })
      }
    }
    await prisma.preventiveMaintenance.createMany({ data: preventivas })
    console.log(`  ${preventivas.length} preventivas concluídas criadas`)
  }

  // ── Movimentação de estoque ───────────────────────────────────────────────
  console.log('Gerando movimentação de estoque...')
  if (products.length > 0) {
    const entries = []
    const exits   = []

    for (const product of products) {
      const manager = randomItem(managers)
      const op      = randomItem(operators)

      // 3-6 entradas (compras) ao longo dos 6 meses
      const entryCount = randomInt(3, 6)
      for (let i = 0; i < entryCount; i++) {
        entries.push({
          tenant_id:     TENANT_ID,
          product_id:    product.id,
          quantity:      randomBetween(20, 100),
          supplier:      'Fornecedor Demo Ltda.',
          invoice_number: `NF-${10000 + randomInt(0, 9999)}`,
          received_at:   daysAgo(randomInt(5, 175)),
          recorded_by:   manager.id,
          created_at:    daysAgo(randomInt(5, 175)),
        })
      }

      // ~1 saída por semana
      for (let week = 24; week >= 1; week--) {
        if (Math.random() < 0.6) {
          exits.push({
            tenant_id:   TENANT_ID,
            product_id:  product.id,
            quantity:    randomBetween(0.5, 8),
            notes:       'Uso operacional semanal.',
            used_at:     daysAgo(week * 7 + randomInt(0, 4)),
            recorded_by: op.id,
            created_at:  daysAgo(week * 7 + randomInt(0, 4)),
          })
        }
      }
    }

    await prisma.chemicalStockEntry.createMany({ data: entries })
    await prisma.chemicalStockExit.createMany({ data: exits })
    console.log(`  ${entries.length} entradas + ${exits.length} saídas de estoque criadas`)
  }

  const totalRecords =
    readingsData.length + analysesData.length + occurrencesData.length

  console.log(`\nSeed-demo concluído. ~${totalRecords} registros operacionais criados.`)
  console.log('Execute "npm run dev" e acesse /gestor/dashboard para ver os dados.')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())

```

---
## TYPES E UTILS GLOBAIS

### `src/types/index.ts`
```ts
// Enums do domínio — definidos em TypeScript porque Prisma v5 + SQLite não suporta enums nativos.
// O banco armazena como String; a aplicação garante os valores válidos via estes tipos.

// ─── Identidade ───────────────────────────────────────────────────────────────

export type Role = 'OPERATOR' | 'TECHNICIAN' | 'MANAGER'

export const ROLES = {
  OPERATOR:   'OPERATOR',
  TECHNICIAN: 'TECHNICIAN',
  MANAGER:    'MANAGER',
} as const satisfies Record<Role, Role>

// ─── Operação ─────────────────────────────────────────────────────────────────

export type DataOrigin = 'MANUAL' | 'SENSOR' | 'IMPORT'

export const DATA_ORIGINS = {
  MANUAL: 'MANUAL',
  SENSOR: 'SENSOR',
  IMPORT: 'IMPORT',
} as const satisfies Record<DataOrigin, DataOrigin>

// ─── Ocorrências ──────────────────────────────────────────────────────────────

export type OccurrenceSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export const OCCURRENCE_SEVERITIES = {
  LOW:      'LOW',
  MEDIUM:   'MEDIUM',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
} as const satisfies Record<OccurrenceSeverity, OccurrenceSeverity>

export type OccurrenceStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

export const OCCURRENCE_STATUSES = {
  OPEN:        'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED:    'RESOLVED',
} as const satisfies Record<OccurrenceStatus, OccurrenceStatus>

// ─── Manutenções ──────────────────────────────────────────────────────────────

// Preventiva usa: SCHEDULED / COMPLETED / OVERDUE
// Corretiva usa: IN_PROGRESS / COMPLETED / CANCELLED
export type MaintenanceStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'OVERDUE'
  | 'CANCELLED'

export const MAINTENANCE_STATUSES = {
  SCHEDULED:   'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED:   'COMPLETED',
  OVERDUE:     'OVERDUE',
  CANCELLED:   'CANCELLED',
} as const satisfies Record<MaintenanceStatus, MaintenanceStatus>

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export const PRIORITIES = {
  LOW:      'LOW',
  MEDIUM:   'MEDIUM',
  HIGH:     'HIGH',
  CRITICAL: 'CRITICAL',
} as const satisfies Record<Priority, Priority>

// ─── Turnos ───────────────────────────────────────────────────────────────────

export type ShiftInstanceStatus = 'OPEN' | 'HANDOVER_PENDING' | 'CLOSED'

export const SHIFT_INSTANCE_STATUSES = {
  OPEN:             'OPEN',
  HANDOVER_PENDING: 'HANDOVER_PENDING',
  CLOSED:           'CLOSED',
} as const satisfies Record<ShiftInstanceStatus, ShiftInstanceStatus>

export type HandoverStatus = 'PENDING' | 'CONFIRMED' | 'TIMED_OUT'

export const HANDOVER_STATUSES = {
  PENDING:   'PENDING',
  CONFIRMED: 'CONFIRMED',
  TIMED_OUT: 'TIMED_OUT',
} as const satisfies Record<HandoverStatus, HandoverStatus>

// ─── Estoque de Produtos Químicos ─────────────────────────────────────────────

export const CHEMICAL_UNITS_PRESET = [
  'kg', 'g', 'L', 'mL', 'unidade', 'saco', 'galão', 'tambor',
] as const

export type ChemicalUnitPreset = typeof CHEMICAL_UNITS_PRESET[number]

// Usado no select da UI: os presets + opção "Outro" para texto livre
export const CHEMICAL_UNIT_OPTIONS = [
  ...CHEMICAL_UNITS_PRESET.map((u) => ({ value: u, label: u })),
  { value: 'outro', label: 'Outro...' },
] as const

// ─── Rastreabilidade ──────────────────────────────────────────────────────────

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

export const AUDIT_ACTIONS = {
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
} as const satisfies Record<AuditAction, AuditAction>

```

### `src/lib/utils.ts`
```ts
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

```

### `src/lib/prisma.ts`
```ts
import { PrismaClient } from '@prisma/client'

// Evita múltiplas instâncias do PrismaClient em desenvolvimento (hot reload do Next.js)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

```

### `src/lib/auth.ts`
```ts
import NextAuth, { type DefaultSession } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/password'
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_MAX_ATTEMPTS,
  SESSION_MAX_AGE_DEFAULT,
  isRateLimited,
  getSessionMaxAge,
} from '@/lib/auth-utils'

// ─── Augmentação de tipos do NextAuth ────────────────────────────────────────
declare module 'next-auth' {
  interface User {
    role: string
    mustChangePassword: boolean
    tenantId: string
  }
  interface Session {
    user: {
      role: string
      mustChangePassword: boolean
      tenantId: string
    } & DefaultSession['user']
  }
}

declare module '@auth/core/jwt' {
  interface JWT {
    role: string
    mustChangePassword: boolean
    tenantId: string
  }
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const TENANT_ID = 'default'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── Configuração NextAuth ────────────────────────────────────────────────────
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null

        const { email, password } = parsed.data

        // Verifica rate limit ANTES de consultar o usuário
        // (evita que atacante contorne o bloqueio explorando timing de resposta)
        const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
        const recentFailures = await prisma.loginAttempt.count({
          where: {
            tenant_id: TENANT_ID,
            email,
            success: false,
            attempted_at: { gte: windowStart },
          },
        })

        if (isRateLimited(recentFailures)) {
          throw new Error('RATE_LIMITED')
        }

        const user = await prisma.user.findFirst({
          where: { email, is_active: true },
        })

        // Sempre verifica a senha (mesmo que usuário não exista) para evitar
        // ataque de enumeração de e-mails por diferença de tempo de resposta
        const isValid = user
          ? await verifyPassword(password, user.password_hash)
          : false

        // Registra a tentativa independente do resultado
        await prisma.loginAttempt.create({
          data: {
            tenant_id: TENANT_ID,
            email,
            success: isValid,
          },
        })

        if (!user || !isValid) return null

        await prisma.user.update({
          where: { id: user.id },
          data: { last_login_at: new Date() },
        })

        return {
          id:                  user.id,
          email:               user.email,
          name:                user.name,
          role:                user.role,
          mustChangePassword:  user.must_change_password,
          tenantId:            user.tenant_id,
        }
      },
    }),
  ],

  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role               = user.role
        token.mustChangePassword = user.mustChangePassword
        token.tenantId           = user.tenantId

        // Timeout de sessão diferente por perfil
        token.exp = Math.floor(Date.now() / 1000) + getSessionMaxAge(user.role)
      }
      return token
    },
    session({ session, token }) {
      session.user.role               = token.role
      session.user.mustChangePassword = token.mustChangePassword
      session.user.tenantId           = token.tenantId
      return session
    },
  },

  pages: {
    signIn: '/login',
  },

  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE_DEFAULT,
  },
})

```

### `src/lib/auth-utils.ts`
```ts
export const RATE_LIMIT_MAX_ATTEMPTS  = 5
export const RATE_LIMIT_WINDOW_MS     = 15 * 60 * 1000 // 15 minutos
export const SESSION_MAX_AGE_OPERATOR = 30 * 60         // 30 min em segundos
export const SESSION_MAX_AGE_DEFAULT  = 60 * 60         // 60 min em segundos

export const ROLE_PREFIXES: Record<string, string> = {
  '/gestor':   'MANAGER',
  '/tecnico':  'TECHNICIAN',
  '/operador': 'OPERATOR',
}

export function isRateLimited(recentFailures: number): boolean {
  return recentFailures >= RATE_LIMIT_MAX_ATTEMPTS
}

export function getSessionMaxAge(role: string): number {
  return role === 'OPERATOR' ? SESSION_MAX_AGE_OPERATOR : SESSION_MAX_AGE_DEFAULT
}

export function getDashboardRoute(role: string): string {
  switch (role) {
    case 'MANAGER':    return '/gestor/dashboard'
    case 'TECHNICIAN': return '/tecnico/dashboard'
    case 'OPERATOR':   return '/operador/dashboard'
    default:           return '/login'
  }
}

export function isRouteAllowedForRole(pathname: string, userRole: string): boolean {
  for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIXES)) {
    if (pathname.startsWith(prefix)) {
      return userRole === requiredRole
    }
  }
  return true
}

```

### `src/lib/password.ts`
```ts
import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

```

### `src/lib/audit.ts`
```ts
import { PrismaClient } from '@prisma/client'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

// Aceita PrismaClient direto ou um transaction client (ambos expõem auditLog)
type AuditClient = Pick<PrismaClient, 'auditLog'>

export interface LogAuditParams {
  userId:         string | null
  action:         AuditAction
  tableName:      string
  recordId:       string
  before?:        Record<string, unknown> | null
  after?:         Record<string, unknown> | null
  justification?: string | null
}

/**
 * Grava um registro de auditoria.
 * Chamar dentro de $transaction quando a mutação principal também está numa transação,
 * ou com `prisma` diretamente quando a mutação é simples.
 */
export async function logAudit(
  client: AuditClient,
  params: LogAuditParams,
): Promise<void> {
  const { userId, action, tableName, recordId, before, after, justification } = params
  await client.auditLog.create({
    data: {
      user_id:       userId       ?? null,
      action,
      table_name:    tableName,
      record_id:     recordId,
      before:        before  != null ? JSON.stringify(before)  : null,
      after:         after   != null ? JSON.stringify(after)   : null,
      justification: justification  ?? null,
    },
  })
}

```

### `src/lib/readings-utils.ts`
```ts
// Calcula is_non_conformant para uma leitura de campo.
// Retorna null quando não há valor (leitura observacional sem parâmetro).
// Retorna false quando nenhum limite está definido para o parâmetro.
export function calcularNaoConformidade(
  value:    number | null,
  minLimit: number | null,
  maxLimit: number | null,
): boolean | null {
  if (value === null) return null
  const below = minLimit !== null && value < minLimit
  const above = maxLimit !== null && value > maxLimit
  return below || above
}

```

### `src/lib/equipment-utils.ts`
```ts
export function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

export function isOverdue(scheduledDate: Date, today: Date): boolean {
  const t = new Date(today)
  t.setHours(0, 0, 0, 0)
  const s = new Date(scheduledDate)
  s.setHours(0, 0, 0, 0)
  return s < t
}

```

### `src/lib/occurrence-utils.ts`
```ts
// Prazos em horas por severidade — espelha occurrence_severity_defaults do seed
export const DEADLINE_HOURS: Record<string, number> = {
  CRITICAL: 24,
  HIGH:     72,
  MEDIUM:   168,
  LOW:      720,
}

export function calcularDeadline(severity: string, createdAt: Date): Date {
  const hours = DEADLINE_HOURS[severity] ?? 168
  return new Date(createdAt.getTime() + hours * 60 * 60 * 1000)
}

export function isPrazoVencido(deadline: Date, now: Date): boolean {
  return deadline < now
}

export function isMimeTypeValido(mimeType: string): boolean {
  return ['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)
}

```

### `src/lib/stock-utils.ts`
```ts
export function calcularEstoqueAtual(totalEntradas: number, totalSaidas: number): number {
  return totalEntradas - totalSaidas
}

export function estaAbaixoMinimo(
  estoqueCalculado: number,
  estoqueFisico: number | null,
  minStock: number,
): boolean {
  return estoqueCalculado < minStock || (estoqueFisico !== null && estoqueFisico < minStock)
}

export function calcularDivergencia(
  estoqueCalculado: number,
  estoqueFisico: number | null,
): number | null {
  if (estoqueFisico === null) return null
  return estoqueFisico - estoqueCalculado
}

export function formatarQuantidade(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)
}

```

### `src/middleware.ts`
```ts
import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { ROLE_PREFIXES, getDashboardRoute } from '@/lib/auth-utils'

export default auth((req) => {
  const { pathname } = req.nextUrl
  const session = req.auth

  // Rotas públicas: login e troca de senha não exigem sessão
  if (pathname.startsWith('/login')) {
    // Usuário já autenticado não precisa ver a página de login
    if (session) {
      const dest = session.user.mustChangePassword
        ? '/trocar-senha'
        : getDashboardRoute(session.user.role)
      return NextResponse.redirect(new URL(dest, req.url))
    }
    return NextResponse.next()
  }

  // Rota de troca de senha: exige sessão (qualquer perfil)
  if (pathname.startsWith('/trocar-senha')) {
    if (!session) return redirectToLogin(req)
    return NextResponse.next()
  }

  // Todas as demais rotas protegidas exigem sessão
  if (!session) return redirectToLogin(req)

  // Usuário com senha provisória só pode acessar /trocar-senha
  if (session.user.mustChangePassword) {
    return NextResponse.redirect(new URL('/trocar-senha', req.url))
  }

  // Verifica permissão por prefixo de rota
  for (const [prefix, requiredRole] of Object.entries(ROLE_PREFIXES)) {
    if (pathname.startsWith(prefix)) {
      if (session.user.role !== requiredRole && session.user.role !== 'MANAGER') {
        return NextResponse.redirect(new URL('/acesso-negado', req.url))
      }
      break
    }
  }

  return NextResponse.next()
})

function redirectToLogin(req: NextRequest) {
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname)
  return NextResponse.redirect(loginUrl)
}

// Aplica o middleware a todas as rotas exceto assets estáticos e API do NextAuth
export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}

```

---
## ROOT LAYOUT E GLOBALS

### `src/app/layout.tsx`
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Solentis",
  description: "Sistema de gestão de Estação de Tratamento de Efluentes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

```

### `src/app/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getDashboardRoute } from '@/lib/auth-utils'

export default async function Home() {
  const session = await auth()
  if (!session) redirect('/login')
  if (session.user.mustChangePassword) redirect('/trocar-senha')
  redirect(getDashboardRoute(session.user.role))
}

```

### `src/app/globals.css`
```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --radius: 0.625rem;
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
  --chart-1: oklch(0.87 0 0);
  --chart-2: oklch(0.556 0 0);
  --chart-3: oklch(0.439 0 0);
  --chart-4: oklch(0.371 0 0);
  --chart-5: oklch(0.269 0 0);
  --sidebar: oklch(0.205 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.488 0.243 264.376);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.556 0 0);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```

---
## PÁGINAS DE AUTENTICAÇÃO

### `src/app/(auth)/layout.tsx`
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      {children}
    </main>
  )
}

```

### `src/app/(auth)/login/actions.ts`
```ts
'use server'

import { signIn } from '@/lib/auth'
import { AuthError } from 'next-auth'
import { z } from 'zod'

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

export type LoginState = {
  error?: string
}

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email:    formData.get('email'),
    password: formData.get('password'),
  })

  if (!parsed.success) {
    return { error: 'Preencha e-mail e senha.' }
  }

  try {
    await signIn('credentials', {
      email:       parsed.data.email,
      password:    parsed.data.password,
      redirectTo:  '/',
    })
  } catch (err) {
    if (err instanceof AuthError) {
      switch (err.type) {
        case 'CredentialsSignin':
          return { error: 'E-mail ou senha incorretos.' }
        case 'CallbackRouteError':
          // Rate limit ou conta inativa — mensagem do authorize()
          return { error: err.cause?.err?.message ?? 'Acesso bloqueado temporariamente.' }
        default:
          return { error: 'Erro ao tentar entrar. Tente novamente.' }
      }
    }
    // signIn lança NEXT_REDIRECT internamente — relançar para o Next processar
    throw err
  }

  return {}
}

```

### `src/app/(auth)/login/page.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { loginAction, type LoginState } from './actions'

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState)

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo / título */}
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Solentis</h1>
        <p className="text-sm text-slate-400">Sistema de Gestão de ETE</p>
      </div>

      {/* Card do formulário */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg space-y-5">
        <h2 className="text-lg font-semibold text-slate-100">Entrar</h2>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-300">
              E-mail
            </label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="seu@email.com"
              required
              disabled={isPending}
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-slate-300">
              Senha
            </label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              required
              disabled={isPending}
              className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
            />
          </div>

          {/* Mensagem de erro */}
          {state.error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
          >
            {isPending ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-slate-600">
        Solentis © {new Date().getFullYear()}
      </p>
    </div>
  )
}

```

### `src/app/(auth)/trocar-senha/actions.ts`
```ts
'use server'

import { auth, signIn } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { z } from 'zod'

const Schema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Deve conter letra maiúscula')
      .regex(/[a-z]/, 'Deve conter letra minúscula')
      .regex(/[0-9]/, 'Deve conter número'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  })

export type TrocarSenhaState = {
  error?: string
  fieldErrors?: Record<string, string[]>
}

export async function trocarSenhaAction(
  _prev: TrocarSenhaState,
  formData: FormData,
): Promise<TrocarSenhaState> {
  const session = await auth()

  if (!session?.user?.email) {
    return { error: 'Sessão inválida. Faça login novamente.' }
  }

  const parsed = Schema.safeParse({
    newPassword:     formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    const flat = parsed.error.flatten()
    return { fieldErrors: flat.fieldErrors as Record<string, string[]> }
  }

  const passwordHash = await hashPassword(parsed.data.newPassword)

  await prisma.user.update({
    where: {
      tenant_id_email: {
        tenant_id: session.user.tenantId,
        email:     session.user.email,
      },
    },
    data: {
      password_hash:        passwordHash,
      must_change_password: false,
    },
  })

  // Re-autentica com a nova senha → JWT novo com mustChangePassword=false
  await signIn('credentials', {
    email:      session.user.email,
    password:   parsed.data.newPassword,
    redirectTo: getDashboard(session.user.role),
  })

  return {}
}

function getDashboard(role: string): string {
  switch (role) {
    case 'MANAGER':    return '/gestor/dashboard'
    case 'TECHNICIAN': return '/tecnico/dashboard'
    case 'OPERATOR':   return '/operador/dashboard'
    default:           return '/login'
  }
}

```

### `src/app/(auth)/trocar-senha/page.tsx`
```tsx
'use client'

import { useActionState, useState } from 'react'
import { Eye, EyeOff, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { trocarSenhaAction, type TrocarSenhaState } from './actions'

const initialState: TrocarSenhaState = {}

const REQUIREMENTS = [
  { label: 'Mínimo 8 caracteres',  test: (v: string) => v.length >= 8 },
  { label: 'Letra maiúscula',       test: (v: string) => /[A-Z]/.test(v) },
  { label: 'Letra minúscula',       test: (v: string) => /[a-z]/.test(v) },
  { label: 'Número',                test: (v: string) => /[0-9]/.test(v) },
]

export default function TrocarSenhaPage() {
  const [state, formAction, isPending] = useActionState(trocarSenhaAction, initialState)
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Logo */}
      <div className="text-center space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-slate-100">Solentis</h1>
        <p className="text-sm text-slate-400">Sistema de Gestão de ETE</p>
      </div>

      {/* Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-lg space-y-5">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-slate-100">Criar nova senha</h2>
          <p className="text-xs text-slate-400">
            Crie uma senha segura para continuar acessando o sistema.
          </p>
        </div>

        <form action={formAction} className="space-y-4">
          {/* Nova senha */}
          <div className="space-y-1.5">
            <label htmlFor="newPassword" className="text-sm font-medium text-slate-300">
              Nova senha
            </label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                required
                disabled={isPending}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {state.fieldErrors?.newPassword && (
              <p className="text-xs text-red-400">{state.fieldErrors.newPassword[0]}</p>
            )}
          </div>

          {/* Checklist de requisitos (aparece ao digitar) */}
          {password.length > 0 && (
            <ul className="space-y-1 pl-0.5">
              {REQUIREMENTS.map((req) => {
                const ok = req.test(password)
                return (
                  <li
                    key={req.label}
                    className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? 'text-green-400' : 'text-slate-500'}`}
                  >
                    {ok ? <Check size={12} /> : <X size={12} />}
                    {req.label}
                  </li>
                )
              })}
            </ul>
          )}

          {/* Confirmar senha */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-sm font-medium text-slate-300">
              Confirmar senha
            </label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                required
                disabled={isPending}
                className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {state.fieldErrors?.confirmPassword && (
              <p className="text-xs text-red-400">{state.fieldErrors.confirmPassword[0]}</p>
            )}
          </div>

          {/* Erro geral */}
          {state.error && (
            <p className="text-sm text-red-400 bg-red-950/40 border border-red-800/50 rounded-md px-3 py-2">
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
          >
            {isPending ? 'Salvando…' : 'Salvar nova senha'}
          </Button>
        </form>
      </div>

      <p className="text-center text-xs text-slate-600">
        Solentis © {new Date().getFullYear()}
      </p>
    </div>
  )
}

```

### `src/app/api/auth/[...nextauth]/route.ts`
```ts
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers

```

---
## COMPONENTES GLOBAIS

### `src/components/back-button.tsx`
```tsx
'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  href?: string
  label?: string
}

export function BackButton({ href, label = 'Voltar' }: BackButtonProps) {
  const router = useRouter()

  if (href) {
    return (
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 h-11 px-1 text-sm text-muted-foreground hover:text-slate-200 transition-colors"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        {label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="inline-flex items-center gap-1.5 h-11 px-1 text-sm text-muted-foreground hover:text-slate-200 transition-colors"
    >
      <ArrowLeft size={16} strokeWidth={1.75} />
      {label}
    </button>
  )
}

```

### `src/components/sign-out-button.tsx`
```tsx
import { signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  async function action() {
    'use server'
    await signOut({ redirect: false })
    redirect('/login')
  }

  return (
    <form action={action}>
      <Button type="submit" variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
        Sair
      </Button>
    </form>
  )
}

```

### `src/components/gestor/sidebar.tsx`
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

type NavItem =
  | { type: 'link'; label: string; href: string; excludePrefix?: string }
  | { type: 'section'; label: string }

const NAV: NavItem[] = [
  { type: 'link',    label: 'Dashboard',           href: '/gestor/dashboard' },
  { type: 'link',    label: 'Usuários',             href: '/gestor/usuarios' },
  { type: 'section', label: 'Configurações' },
  { type: 'link',    label: 'Parâmetros',           href: '/gestor/parametros' },
  { type: 'link',    label: 'Métodos de Análise',   href: '/gestor/metodos' },
  { type: 'link',    label: 'Categorias',           href: '/gestor/categorias' },
  { type: 'link',    label: 'Pontos de Coleta',     href: '/gestor/pontos-de-coleta' },
  { type: 'link',    label: 'Turnos',               href: '/gestor/turnos', excludePrefix: '/gestor/turnos/instancias' },
  { type: 'link',    label: 'Instâncias de Turno',  href: '/gestor/turnos/instancias' },
  { type: 'link',    label: 'Prazos de Ocorrência', href: '/gestor/prazos-ocorrencia' },
  { type: 'section', label: 'Estoque' },
  { type: 'link',    label: 'Produtos Químicos',   href: '/gestor/produtos-quimicos' },
  { type: 'section', label: 'Sistema' },
  { type: 'link',    label: 'Auditoria',            href: '/gestor/auditoria' },
]

export function GestorSidebar() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 p-3 py-4">
      {NAV.map((item, i) => {
        if (item.type === 'section') {
          return (
            <p
              key={i}
              className="px-3 pt-5 pb-1 text-xs font-medium uppercase tracking-wider text-slate-500"
            >
              {item.label}
            </p>
          )
        }
        const isActive =
          (pathname === item.href || pathname.startsWith(item.href + '/')) &&
          (!item.excludePrefix || !pathname.startsWith(item.excludePrefix))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm transition-colors ${
              isActive
                ? 'bg-slate-800 font-medium text-slate-100'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

```

### `src/components/operador/bottom-nav.tsx`
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Droplets, Clock, AlertTriangle, Package } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href:  string
  label: string
  icon:  LucideIcon
}

const NAV: NavItem[] = [
  { href: '/operador/dashboard',   label: 'Dashboard',   icon: LayoutDashboard },
  { href: '/operador/leituras',    label: 'Leituras',    icon: Droplets        },
  { href: '/operador/turnos',      label: 'Turnos',      icon: Clock           },
  { href: '/operador/ocorrencias', label: 'Ocorrências', icon: AlertTriangle   },
  { href: '/operador/estoque',     label: 'Estoque',     icon: Package         },
]

export function OperadorBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-900 border-t border-slate-800"
      aria-label="Navegação principal"
    >
      <ul className="flex h-14">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 transition-colors',
                  isActive
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300',
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span
                  className={cn(
                    'text-[10px] leading-none font-medium tracking-wide',
                    !isActive && 'text-slate-600',
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

```

### `src/components/tecnico/bottom-nav.tsx`
```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FlaskConical, Wrench, AlertTriangle, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type NavItem = {
  href:  string
  label: string
  icon:  LucideIcon
}

const NAV: NavItem[] = [
  { href: '/tecnico/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/tecnico/analises',     label: 'Análises',     icon: FlaskConical    },
  { href: '/tecnico/equipamentos', label: 'Equip.',       icon: Wrench          },
  { href: '/tecnico/ocorrencias',  label: 'Ocorrências',  icon: AlertTriangle   },
  { href: '/tecnico/turnos/instancias', label: 'Turnos', icon: Clock           },
]

export function TecnicoBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-slate-900 border-t border-slate-800"
      aria-label="Navegação principal"
    >
      <ul className="flex h-14">
        {NAV.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 border-t-2 transition-colors',
                  isActive
                    ? 'border-sky-400 text-sky-400'
                    : 'border-transparent text-slate-500 hover:text-slate-300',
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span
                  className={cn(
                    'text-[10px] leading-none font-medium tracking-wide',
                    !isActive && 'text-slate-600',
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

```

### `src/components/ui/button.tsx`
```tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }

```

### `src/components/ui/input.tsx`
```tsx
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = 'Input'

export { Input }

```

---
## PERFIL OPERADOR

### `src/app/operador/layout.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { OperadorBottomNav } from '@/components/operador/bottom-nav'

export default async function OperadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) {
    redirect('/acesso-negado')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/operador/dashboard" className="text-base font-bold tracking-tight hover:text-slate-300 transition-colors">Solentis</Link>
            <span className="rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              Operador
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Conteúdo — pb-16 para não ficar atrás da bottom nav */}
      <div className="pb-16">
        {children}
      </div>

      <OperadorBottomNav />
    </div>
  )
}

```

### `src/app/operador/dashboard/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const TENANT_ID = 'default'

export default async function OperadorDashboard() {
  const session = await auth()
  if (!session) redirect('/login')

  const userRecord = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email: session.user.email! } },
    select: { id: true },
  })

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [openOcorrencias, pendingHandovers, lowStockCount, leiturasDoDia, turnoAtivo, pendingTasksCount] =
    await Promise.all([
      userRecord
        ? prisma.occurrence.count({
            where: {
              tenant_id:   TENANT_ID,
              reported_by: userRecord.id,
              status:      { in: ['OPEN', 'IN_PROGRESS'] },
            },
          })
        : Promise.resolve(0),

      userRecord
        ? prisma.shiftHandover.count({
            where: {
              tenant_id:        TENANT_ID,
              status:           'PENDING',
              outgoing_user_id: { not: userRecord.id },
              shift_instance:   { date: today, status: 'HANDOVER_PENDING' },
            },
          })
        : Promise.resolve(0),

      // Produtos com estoque calculado abaixo do mínimo
      (async () => {
        const products = await prisma.chemicalProduct.findMany({
          where:  { tenant_id: TENANT_ID, is_active: true },
          select: { min_stock: true, entries: { select: { quantity: true } }, exits: { select: { quantity: true } } },
        })
        return products.filter((p) => {
          const calc = p.entries.reduce((s, e) => s + e.quantity, 0)
                     - p.exits.reduce((s, e) => s + e.quantity, 0)
          return calc < p.min_stock
        }).length
      })(),

      // Leituras registradas hoje por este operador
      userRecord
        ? prisma.reading.count({
            where: {
              tenant_id:   TENANT_ID,
              recorded_by: userRecord.id,
              recorded_at: { gte: today },
            },
          })
        : Promise.resolve(0),

      // Turno ativo aberto por este operador
      userRecord
        ? prisma.shiftInstance.findFirst({
            where:   { tenant_id: TENANT_ID, opened_by: userRecord.id, status: 'OPEN' },
            include: { shift: { select: { name: true, start_time: true, end_time: true } } },
            orderBy: { opened_at: 'desc' },
          })
        : Promise.resolve(null),

      // Tarefas pendentes no turno ativo deste operador
      userRecord
        ? prisma.shiftTask.count({
            where: {
              tenant_id:      TENANT_ID,
              status:         'PENDING',
              shift_instance: { opened_by: userRecord.id, status: 'OPEN' },
              OR: [{ assigned_to_id: userRecord.id }, { assigned_to_id: null }],
            },
          })
        : Promise.resolve(0),
    ])

  const SHORTCUTS = [
    { title: 'Leituras',       desc: 'Registrar leitura de campo',            href: '/operador/leituras'    },
    { title: 'Ocorrências',    desc: 'Registrar ou acompanhar ocorrências',   href: '/operador/ocorrencias' },
    { title: 'Turnos',         desc: 'Abrir, acompanhar e passar turno',      href: '/operador/turnos'      },
    { title: 'Estoque Químico', desc: 'Registrar saídas e contagens físicas', href: '/operador/estoque'     },
  ]

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {session.user.name?.split(' ')[0]}</h1>
          <p className="text-slate-400 text-sm mt-0.5">Painel do Operador</p>
        </div>

        {/* Passagens urgentes */}
        {pendingHandovers > 0 && (
          <Link
            href="/operador/turnos"
            className="block rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 hover:bg-amber-950/30 transition-colors animate-pulse"
          >
            <p className="text-2xl font-bold text-amber-400">{pendingHandovers}</p>
            <p className="text-xs text-amber-500 mt-1">
              {pendingHandovers === 1 ? 'Passagem de turno aguardando sua confirmação' : 'Passagens de turno aguardando sua confirmação'}
            </p>
          </Link>
        )}

        {/* Estoque baixo */}
        {lowStockCount > 0 && (
          <Link
            href="/operador/estoque"
            className="block rounded-xl border border-red-900/60 bg-red-950/20 p-4 hover:bg-red-950/30 transition-colors"
          >
            <p className="text-2xl font-bold text-red-400">{lowStockCount}</p>
            <p className="text-xs text-red-400/80 mt-1">
              {lowStockCount === 1 ? 'Produto com estoque abaixo do mínimo' : 'Produtos com estoque abaixo do mínimo'}
            </p>
          </Link>
        )}

        {/* Turno ativo */}
        {turnoAtivo ? (
          <Link
            href={`/operador/turnos/${turnoAtivo.id}`}
            className="block rounded-xl border border-green-800/60 bg-green-950/20 p-4 hover:bg-green-950/30 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-300">Turno ativo</p>
                <p className="text-lg font-bold text-green-400 mt-0.5">{turnoAtivo.shift.name}</p>
                <p className="text-xs text-green-600 mt-0.5">
                  {turnoAtivo.shift.start_time} – {turnoAtivo.shift.end_time} · Em andamento
                </p>
              </div>
              <span className="text-green-500 text-xl">→</span>
            </div>
          </Link>
        ) : (
          <Link
            href="/operador/turnos"
            className="block rounded-xl border border-slate-700 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
          >
            <p className="text-sm text-slate-500">Nenhum turno ativo</p>
            <p className="text-xs text-slate-600 mt-0.5">Toque para abrir um turno →</p>
          </Link>
        )}

        {/* Tarefas do turno */}
        {turnoAtivo ? (
          pendingTasksCount > 0 ? (
            <Link
              href={`/operador/turnos/${turnoAtivo.id}/tarefas`}
              className="block rounded-xl border border-amber-900/60 bg-amber-950/20 p-4 hover:bg-amber-950/30 transition-colors"
            >
              <p className="text-2xl font-bold text-amber-400">{pendingTasksCount}</p>
              <p className="text-xs text-amber-500 mt-1">
                {pendingTasksCount === 1 ? 'Tarefa pendente no turno atual' : 'Tarefas pendentes no turno atual'}
              </p>
            </Link>
          ) : (
            <Link
              href={`/operador/turnos/${turnoAtivo.id}/tarefas`}
              className="block rounded-xl border border-slate-700 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
            >
              <p className="text-sm text-slate-400">Nenhuma tarefa atribuída</p>
              <p className="text-xs text-slate-600 mt-0.5">Toque para ver tarefas do turno →</p>
            </Link>
          )
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <p className="text-sm text-slate-600">Tarefas do turno</p>
            <p className="text-xs text-slate-700 mt-0.5">Abra um turno primeiro</p>
          </div>
        )}

        {/* Leituras de hoje + Ocorrências em aberto */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/operador/leituras"
            className="rounded-xl border border-slate-700 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
          >
            <p className="text-2xl font-bold text-slate-100">{leiturasDoDia}</p>
            <p className="text-xs text-slate-500 mt-1">
              {leiturasDoDia === 1 ? 'Leitura hoje' : 'Leituras hoje'}
            </p>
          </Link>

          <Link
            href="/operador/ocorrencias"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              openOcorrencias > 0 ? 'border-amber-900/60 bg-amber-950/20' : 'border-slate-700 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', openOcorrencias > 0 ? 'text-amber-400' : 'text-slate-100'].join(' ')}>
              {openOcorrencias}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {openOcorrencias === 1 ? 'Ocorrência em aberto' : 'Ocorrências em aberto'}
            </p>
          </Link>
        </div>

        {/* Atalhos */}
        <div className="space-y-2 pt-2">
          <h2 className="text-sm font-medium text-slate-400">Atalhos</h2>
          <div className="grid grid-cols-2 gap-3">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
              >
                <p className="text-sm font-medium text-slate-200">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
    </main>
  )
}

```

### `src/app/operador/estoque/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { calcularEstoqueAtual } from '@/lib/stock-utils'

const TENANT_ID = 'default'

async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user.id
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const SaidaSchema = z.object({
  product_id: z.string().min(1, { error: 'Produto obrigatório' }),
  quantity:   z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Quantidade inválida' }).positive({ error: 'Quantidade deve ser maior que 0' }),
  ),
  notes:   z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  used_at: z.string().min(1, { error: 'Data obrigatória' }),
})

const ContagemSchema = z.object({
  product_id:       z.string().min(1, { error: 'Produto obrigatório' }),
  counted_quantity: z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Quantidade inválida' }).min(0, { error: 'Deve ser maior ou igual a 0' }),
  ),
  notes:      z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  counted_at: z.string().min(1, { error: 'Data obrigatória' }),
})

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function registrarSaida(_prev: unknown, formData: FormData) {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem registrar saídas.' }

  const parsed = SaidaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, quantity, notes, used_at } = parsed.data

  // Calcula estoque atual para verificar se ficará negativo
  const [entries, exits] = await Promise.all([
    prisma.chemicalStockEntry.aggregate({
      where: { tenant_id: TENANT_ID, product_id },
      _sum:  { quantity: true },
    }),
    prisma.chemicalStockExit.aggregate({
      where: { tenant_id: TENANT_ID, product_id },
      _sum:  { quantity: true },
    }),
  ])

  const estoqueAtual = calcularEstoqueAtual(
    entries._sum.quantity ?? 0,
    exits._sum.quantity   ?? 0,
  )

  const recorded_by = await resolveUserId(session.user.email!)

  await prisma.chemicalStockExit.create({
    data: {
      tenant_id: TENANT_ID,
      product_id,
      quantity,
      notes,
      used_at:    new Date(used_at),
      recorded_by,
    },
  })

  revalidatePath('/operador/estoque')
  revalidatePath(`/operador/estoque/${product_id}`)

  const novoEstoque = estoqueAtual - quantity
  if (novoEstoque < 0) {
    return {
      success: true,
      warning: `Atenção: estoque calculado ficou negativo (${novoEstoque.toFixed(2)}). Verifique se há entradas não registradas ou faça uma contagem física.`,
    }
  }

  return { success: true }
}

export async function registrarContagem(_prev: unknown, formData: FormData) {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem registrar contagens.' }

  const parsed = ContagemSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, counted_quantity, notes, counted_at } = parsed.data
  const recorded_by = await resolveUserId(session.user.email!)

  await prisma.chemicalStockCount.create({
    data: {
      tenant_id: TENANT_ID,
      product_id,
      counted_quantity,
      notes,
      counted_at:  new Date(counted_at),
      recorded_by,
    },
  })

  revalidatePath('/operador/estoque')
  revalidatePath(`/operador/estoque/${product_id}`)
  return { success: true }
}

```

### `src/app/operador/estoque/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { calcularEstoqueAtual, estaAbaixoMinimo, formatarQuantidade } from '@/lib/stock-utils'

const TENANT_ID = 'default'

export default async function OperadorEstoquePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const products = await prisma.chemicalProduct.findMany({
    where:   { tenant_id: TENANT_ID, is_active: true },
    orderBy: { name: 'asc' },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true, counted_at: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  return (
    <main className="px-4 py-6 max-w-lg mx-auto space-y-3">
        <h1 className="text-xl font-semibold">Estoque Químico</h1>
        {products.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-12">Nenhum produto cadastrado.</p>
        ) : (
          products.map((p) => {
            const totalEntradas = p.entries.reduce((s, e) => s + e.quantity, 0)
            const totalSaidas   = p.exits.reduce((s, e) => s + e.quantity, 0)
            const calculado     = calcularEstoqueAtual(totalEntradas, totalSaidas)
            const fisico        = p.counts[0]?.counted_quantity ?? null
            const alerta        = estaAbaixoMinimo(calculado, fisico, p.min_stock)
            const ultimaContagem = p.counts[0]?.counted_at

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-4 space-y-3 ${
                  alerta ? 'border-red-800/60 bg-slate-900' : 'border-slate-700 bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-100">{p.name}</span>
                      {alerta && (
                        <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                          ESTOQUE BAIXO
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-slate-400">
                      <span>
                        Calculado:{' '}
                        <span className={calculado < p.min_stock ? 'text-red-400 font-medium' : 'text-slate-200'}>
                          {formatarQuantidade(calculado)} {p.unit}
                        </span>
                      </span>
                      <span>
                        Físico:{' '}
                        <span className={fisico !== null && fisico < p.min_stock ? 'text-red-400 font-medium' : 'text-slate-200'}>
                          {fisico !== null ? `${formatarQuantidade(fisico)} ${p.unit}` : '—'}
                        </span>
                      </span>
                    </div>
                    {ultimaContagem && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Última contagem: {ultimaContagem.toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/operador/estoque/${p.id}/saida`}
                    className="flex-1 text-center rounded-lg bg-red-900/40 border border-red-800/60 py-2 text-sm font-medium text-red-300 hover:bg-red-900/60 transition-colors"
                  >
                    Registrar saída
                  </Link>
                  <Link
                    href={`/operador/estoque/${p.id}/contagem`}
                    className="flex-1 text-center rounded-lg bg-blue-900/30 border border-blue-800/50 py-2 text-sm font-medium text-blue-300 hover:bg-blue-900/50 transition-colors"
                  >
                    Contagem física
                  </Link>
                </div>
              </div>
            )
          })
        )}
    </main>
  )
}

```

### `src/app/operador/estoque/[id]/contagem/count-form.tsx`
```tsx
'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarContagem } from '../../actions'
import { calcularDivergencia, formatarQuantidade } from '@/lib/stock-utils'

type Props = {
  productId:        string
  unit:             string
  estoqueCalculado: number
}

export function CountForm({ productId, unit, estoqueCalculado }: Props) {
  const router      = useRouter()
  const [qty, setQty] = useState('')
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarContagem(prev, formData)
    if (result?.success) router.push('/operador/estoque')
    return result
  }, null)

  const qtyNum      = parseFloat(qty)
  const divergencia = !isNaN(qtyNum) && qty !== '' ? calcularDivergencia(estoqueCalculado, qtyNum) : null

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      {state?.error && (
        <p className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Quantidade contada ({unit}) *</label>
        <input
          name="counted_quantity"
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          required
          value={qty}
          onChange={(e) => setQty(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
        {divergencia !== null && (
          <p className={`text-xs font-medium ${
            divergencia === 0 ? 'text-green-400'
            : divergencia < 0  ? 'text-red-400'
            : 'text-amber-400'
          }`}>
            Divergência: {divergencia >= 0 ? '+' : ''}{formatarQuantidade(divergencia)} {unit}
            {divergencia === 0 && ' — em linha com o calculado'}
            {divergencia < 0  && ' — físico abaixo do calculado'}
            {divergencia > 0  && ' — físico acima do calculado'}
          </p>
        )}
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Data e hora da contagem *</label>
        <input
          name="counted_at"
          type="datetime-local"
          required
          defaultValue={defaultDate}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Observações</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Condições da contagem, responsável, local..."
        />
      </div>

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-lg bg-blue-700 py-3 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Registrando...' : 'Confirmar contagem'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/operador/estoque')}
          className="rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

```

### `src/app/operador/estoque/[id]/contagem/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { calcularEstoqueAtual, formatarQuantidade } from '@/lib/stock-utils'
import { CountForm } from './count-form'

const TENANT_ID = 'default'

export default async function ContagemPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where:   { id, tenant_id: TENANT_ID, is_active: true },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true, counted_at: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  if (!product) notFound()

  const calculado = calcularEstoqueAtual(
    product.entries.reduce((s, e) => s + e.quantity, 0),
    product.exits.reduce((s, e) => s + e.quantity, 0),
  )
  const ultimaContagem = product.counts[0] ?? null

  return (
    <main className="px-4 py-6 max-w-lg mx-auto space-y-5">
      <div>
        <BackButton href="/operador/estoque" label="Estoque" />
        <h1 className="text-base font-semibold mt-1">Contagem Física — {product.name}</h1>
      </div>
        <div className="rounded-lg bg-slate-800/50 px-4 py-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Estoque calculado</span>
            <span className="font-medium text-slate-100">{formatarQuantidade(calculado)} {product.unit}</span>
          </div>
          {ultimaContagem && (
            <div className="flex justify-between">
              <span className="text-slate-400">Última contagem</span>
              <span className="font-medium text-slate-100">
                {formatarQuantidade(ultimaContagem.counted_quantity)} {product.unit}
                <span className="text-slate-500 text-xs ml-2">
                  ({ultimaContagem.counted_at.toLocaleDateString('pt-BR')})
                </span>
              </span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500">
          Conte o estoque fisicamente e registre a quantidade real. A divergência em relação ao
          calculado será exibida para o Gestor.
        </p>

        <CountForm
          productId={product.id}
          unit={product.unit}
          estoqueCalculado={calculado}
        />
    </main>
  )
}

```

### `src/app/operador/estoque/[id]/saida/exit-form.tsx`
```tsx
'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarSaida } from '../../actions'

type Props = {
  productId:    string
  productName:  string
  unit:         string
  estoqueAtual: number
}

export function ExitForm({ productId, productName, unit, estoqueAtual }: Props) {
  const router  = useRouter()
  const [qty, setQty]             = useState('')
  const [offlineError, setOfflineError] = useState(false)
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarSaida(prev, formData)
    if (result?.success && !result?.warning) router.push('/operador/estoque')
    return result
  }, null)

  const qtyNum       = parseFloat(qty) || 0
  const ficaNegativo = qtyNum > 0 && qtyNum > estoqueAtual

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!navigator.onLine) {
          e.preventDefault()
          setOfflineError(true)
        }
      }}
      className="space-y-4"
    >
      <input type="hidden" name="product_id" value={productId} />

      {offlineError && (
        <p className="rounded-lg bg-amber-900/30 border border-amber-700/50 px-4 py-3 text-sm text-amber-300">
          Sem conexão. Verifique sua internet e tente novamente.
        </p>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-900/40 border border-red-700 px-4 py-3 text-sm text-red-300">
          {state.error}
        </p>
      )}

      {state?.warning && (
        <div className="rounded-lg bg-amber-900/30 border border-amber-700 px-4 py-3 space-y-3">
          <p className="text-sm text-amber-300">{state.warning}</p>
          <button
            type="button"
            onClick={() => router.push('/operador/estoque')}
            className="w-full rounded-lg bg-amber-700 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
          >
            Entendido — voltar ao estoque
          </button>
        </div>
      )}

      {!state?.warning && (
        <>
          <div className="space-y-1">
            <label className="text-sm text-slate-300">
              Quantidade usada ({unit}) *
            </label>
            <input
              name="quantity"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0"
            />
            {ficaNegativo && (
              <p className="text-xs text-amber-400">
                Atenção: quantidade maior que o estoque calculado ({estoqueAtual.toFixed(2)} {unit}).
                O registro será salvo mesmo assim.
              </p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Data e hora do uso *</label>
            <input
              name="used_at"
              type="datetime-local"
              required
              defaultValue={defaultDate}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-slate-300">Observações</label>
            <textarea
              name="notes"
              rows={2}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Onde foi usado, processo, turno..."
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-lg bg-red-700 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
            >
              {pending ? 'Registrando...' : 'Confirmar saída'}
            </button>
            <button
              type="button"
              onClick={() => router.push('/operador/estoque')}
              className="rounded-lg border border-slate-700 px-4 py-3 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </>
      )}
    </form>
  )
}

```

### `src/app/operador/estoque/[id]/saida/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { calcularEstoqueAtual, formatarQuantidade } from '@/lib/stock-utils'
import { ExitForm } from './exit-form'

const TENANT_ID = 'default'

export default async function SaidaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where:   { id, tenant_id: TENANT_ID, is_active: true },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
    },
  })

  if (!product) notFound()

  const calculado = calcularEstoqueAtual(
    product.entries.reduce((s, e) => s + e.quantity, 0),
    product.exits.reduce((s, e) => s + e.quantity, 0),
  )

  return (
    <main className="px-4 py-6 max-w-lg mx-auto">
      <div className="mb-4">
        <BackButton href="/operador/estoque" label="Estoque" />
        <h1 className="text-base font-semibold mt-1">Registrar Saída — {product.name}</h1>
      </div>
      <div className="rounded-lg bg-slate-800/50 px-4 py-3 mb-5 flex gap-6 text-sm">
          <div>
            <p className="text-xs text-slate-500">Estoque calculado</p>
            <p className={`font-semibold ${calculado < product.min_stock ? 'text-red-400' : 'text-slate-100'}`}>
              {formatarQuantidade(calculado)} {product.unit}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Mínimo</p>
            <p className="font-semibold text-slate-400">
              {formatarQuantidade(product.min_stock)} {product.unit}
            </p>
          </div>
        </div>
        <ExitForm
          productId={product.id}
          productName={product.name}
          unit={product.unit}
          estoqueAtual={calculado}
        />
    </main>
  )
}

```

### `src/app/operador/leituras/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { calcularNaoConformidade } from '@/lib/readings-utils'

const TENANT_ID = 'default'

async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

const LeituraSchema = z
  .object({
    collection_point_id: z.string().min(1, 'Selecione o ponto de coleta'),
    parameter_id: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().nullable(),
    ),
    value: z.preprocess(
      (v) => (v === '' || v == null ? null : Number(v)),
      z.number().nullable(),
    ),
    unit: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().nullable(),
    ),
    notes: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().max(1000, 'Observação deve ter no máximo 1000 caracteres').nullable(),
    ),
    recorded_at: z.string().min(1, 'Informe a data/hora da leitura'),
  })
  .refine((d) => d.parameter_id === null || d.value !== null, {
    message: 'Informe o valor medido',
    path: ['value'],
  })

export type LeituraFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Registrar leitura ────────────────────────────────────────────────────────

export async function registrarLeitura(
  _prev: LeituraFormState,
  formData: FormData,
): Promise<LeituraFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem registrar leituras.' }

  const parsed = LeituraSchema.safeParse({
    collection_point_id: formData.get('collection_point_id'),
    parameter_id:        formData.get('parameter_id'),
    value:               formData.get('value'),
    unit:                formData.get('unit'),
    notes:               formData.get('notes'),
    recorded_at:         formData.get('recorded_at'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  let isNonConformant: boolean | null = null
  let unit = parsed.data.unit

  if (parsed.data.parameter_id) {
    const param = await prisma.qualityParameter.findUnique({
      where:  { id: parsed.data.parameter_id },
      select: { min_limit: true, max_limit: true, unit: true },
    })
    if (param) {
      // Copia a unidade do parâmetro quando o formulário não enviou uma
      unit = unit ?? param.unit
      isNonConformant = calcularNaoConformidade(
        parsed.data.value,
        param.min_limit,
        param.max_limit,
      )
    }
  }

  await prisma.reading.create({
    data: {
      tenant_id:           TENANT_ID,
      collection_point_id: parsed.data.collection_point_id,
      parameter_id:        parsed.data.parameter_id,
      shift_instance_id:   null, // associado ao turno na Fase 9
      value:               parsed.data.value,
      unit,
      notes:               parsed.data.notes,
      is_non_conformant:   isNonConformant,
      origin:              'MANUAL',
      metadata_origin:     null,
      recorded_by:         userId,
      recorded_at:         new Date(parsed.data.recorded_at),
    },
  })

  revalidatePath('/operador/leituras')
  return { success: true }
}

```

### `src/app/operador/leituras/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const TENANT_ID = 'default'
const PAGE_SIZE = 20

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function LeituraListPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [readings, total] = await Promise.all([
    prisma.reading.findMany({
      where:   { tenant_id: TENANT_ID },
      include: {
        collection_point: { select: { name: true } },
        parameter:        { select: { name: true } },
      },
      orderBy: { recorded_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.reading.count({ where: { tenant_id: TENANT_ID } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Cabeçalho da listagem */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold">Leituras</h1>
            <p className="text-xs text-slate-400">{total} registro(s) no total</p>
          </div>
          <Link href="/operador/leituras/nova">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white">
              + Nova
            </Button>
          </Link>
        </div>

        {/* Lista de leituras */}
        {readings.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
            Nenhuma leitura registrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {readings.map((r) => (
              <div
                key={r.id}
                className={[
                  'rounded-xl border bg-slate-900 p-4 space-y-1.5',
                  r.is_non_conformant === true
                    ? 'border-red-900/60'
                    : 'border-slate-800',
                ].join(' ')}
              >
                {/* Linha superior: ponto + badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-100 leading-snug">
                      {r.collection_point.name}
                    </p>
                    <p className="text-xs text-slate-500">{formatDatetime(r.recorded_at)}</p>
                  </div>
                  {r.is_non_conformant === true && (
                    <span className="shrink-0 rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                      Fora do limite
                    </span>
                  )}
                </div>

                {/* Valor do parâmetro ou indicação de observação visual */}
                {r.parameter ? (
                  <p className="text-sm text-slate-300">
                    <span className="font-medium">{r.parameter.name}:</span>{' '}
                    {r.value !== null
                      ? `${r.value}${r.unit ? ` ${r.unit}` : ''}`
                      : '—'}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 italic">Observação visual</p>
                )}

                {/* Observação livre (truncada) */}
                {r.notes && (
                  <p className="text-xs text-slate-500 line-clamp-2">{r.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link
                href={`/operador/leituras?page=${page - 1}`}
                className="text-slate-400 hover:text-slate-200"
              >
                ← Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className="text-xs text-slate-600">
              Página {page} de {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/operador/leituras?page=${page + 1}`}
                className="text-slate-400 hover:text-slate-200"
              >
                Próxima →
              </Link>
            ) : (
              <span />
            )}
          </div>
        )}

        {/* Link de volta ao dashboard */}
        <div className="pt-2">
          <Link href="/operador/dashboard" className="text-xs text-slate-600 hover:text-slate-400">
            ← Voltar ao painel
          </Link>
        </div>
    </main>
  )
}

```

### `src/app/operador/leituras/nova/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ReadingForm } from './reading-form'

const TENANT_ID = 'default'

export default async function NovaLeituraPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [collectionPoints, parameters] = await Promise.all([
    prisma.collectionPoint.findMany({
      where:   { tenant_id: TENANT_ID, is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.qualityParameter.findMany({
      where:   { tenant_id: TENANT_ID, is_active: true },
      select:  { id: true, name: true, unit: true, min_limit: true, max_limit: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <BackButton href="/operador/leituras" label="Leituras" />
      <ReadingForm collectionPoints={collectionPoints} parameters={parameters} />
    </main>
  )
}

```

### `src/app/operador/leituras/nova/reading-form.tsx`
```tsx
'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registrarLeitura, type LeituraFormState } from '../actions'

const DRAFT_KEY = 'reading_draft'

type CollectionPoint = { id: string; name: string }
type Parameter = {
  id:        string
  name:      string
  unit:      string
  min_limit: number | null
  max_limit: number | null
}

type Props = {
  collectionPoints: CollectionPoint[]
  parameters:       Parameter[]
}

type Draft = {
  collection_point_id: string
  parameter_id:        string
  value:               string
  notes:               string
  recorded_at:         string
}

function formatDatetimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const initialState: LeituraFormState = {}

const SELECT_CLS =
  'w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2.5 text-sm ' +
  'focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50'

export function ReadingForm({ collectionPoints, parameters }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registrarLeitura, initialState)

  // Controle de hidratação: impede salvar rascunho com estado vazio antes de carregar o draft
  const [mounted, setMounted]     = useState(false)
  const [offlineError, setOfflineError] = useState(false)

  const [collectionPointId, setCollectionPointId] = useState('')
  const [parameterId, setParameterId]             = useState('')
  const [valueStr, setValueStr]                   = useState('')
  const [notes, setNotes]                         = useState('')
  const [recordedAt, setRecordedAt]               = useState('')

  // ── Carregar rascunho do localStorage na montagem ──────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const d = JSON.parse(raw) as Partial<Draft>
        setCollectionPointId(d.collection_point_id ?? '')
        setParameterId(d.parameter_id ?? '')
        setValueStr(d.value ?? '')
        setNotes(d.notes ?? '')
        setRecordedAt(d.recorded_at ?? formatDatetimeLocal(new Date()))
      } catch {
        setRecordedAt(formatDatetimeLocal(new Date()))
      }
    } else {
      setRecordedAt(formatDatetimeLocal(new Date()))
    }
    setMounted(true)
  }, [])

  // ── Salvar rascunho a cada alteração (só após montar) ──────────────────────
  useEffect(() => {
    if (!mounted) return
    const draft: Draft = {
      collection_point_id: collectionPointId,
      parameter_id:        parameterId,
      value:               valueStr,
      notes,
      recorded_at:         recordedAt,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [mounted, collectionPointId, parameterId, valueStr, notes, recordedAt])

  // ── Ao submeter com sucesso: limpar rascunho e redirecionar ────────────────
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/operador/leituras')
    }
  }, [state.success, router])

  // ── Parâmetro selecionado (para limites e unidade) ─────────────────────────
  const selectedParam = parameters.find((p) => p.id === parameterId) ?? null

  // Verificação de não-conformidade em tempo real (client-side)
  const nonConformant: boolean | null = (() => {
    if (!selectedParam || valueStr === '') return null
    const v = parseFloat(valueStr)
    if (isNaN(v)) return null
    const below = selectedParam.min_limit !== null && v < selectedParam.min_limit
    const above = selectedParam.max_limit !== null && v > selectedParam.max_limit
    return below || above
  })()

  const hasLimits = selectedParam
    ? selectedParam.min_limit !== null || selectedParam.max_limit !== null
    : false

  const limitLabel = selectedParam
    ? `${selectedParam.min_limit ?? '—'} – ${selectedParam.max_limit ?? '—'} ${selectedParam.unit}`
    : ''

  return (
    <div className="space-y-5">
      <Link href="/operador/leituras" className="inline-block text-sm text-slate-400 hover:text-slate-200">
        ← Voltar para leituras
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Nova leitura</h1>
        <p className="text-xs text-slate-400">Registre a leitura de campo do turno atual.</p>
      </div>

      <form
        action={formAction}
        onSubmit={(e) => {
          if (!navigator.onLine) {
            e.preventDefault()
            setOfflineError(true)
          }
        }}
        className="space-y-5"
      >
        {offlineError && (
          <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
            Sem conexão. Verifique sua internet e tente novamente.
          </p>
        )}

        {/* ── Ponto de coleta ───────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="collection_point_id" className="text-sm font-medium text-slate-300">
            Ponto de coleta
          </label>
          <select
            id="collection_point_id"
            name="collection_point_id"
            value={collectionPointId}
            onChange={(e) => setCollectionPointId(e.target.value)}
            disabled={isPending}
            required
            className={SELECT_CLS}
          >
            <option value="">Selecione o ponto…</option>
            {collectionPoints.map((cp) => (
              <option key={cp.id} value={cp.id}>{cp.name}</option>
            ))}
          </select>
          {state.fieldErrors?.collection_point_id && (
            <p className="text-xs text-red-400">{state.fieldErrors.collection_point_id[0]}</p>
          )}
        </div>

        {/* ── Parâmetro (opcional) ───────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="parameter_id" className="text-sm font-medium text-slate-300">
            Parâmetro{' '}
            <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <select
            id="parameter_id"
            name="parameter_id"
            value={parameterId}
            onChange={(e) => {
              setParameterId(e.target.value)
              setValueStr('')
            }}
            disabled={isPending}
            className={SELECT_CLS}
          >
            <option value="">Nenhum — observação visual</option>
            {parameters.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.unit})
              </option>
            ))}
          </select>
        </div>

        {/* ── Valor medido (visível só quando há parâmetro) ─────────────── */}
        {selectedParam && (
          <div className="space-y-1.5">
            <label htmlFor="value" className="text-sm font-medium text-slate-300">
              Valor medido
            </label>
            <div className="relative">
              <Input
                id="value"
                name="value"
                type="number"
                step="0.001"
                inputMode="decimal"
                placeholder="0,00"
                value={valueStr}
                onChange={(e) => setValueStr(e.target.value)}
                disabled={isPending}
                required
                className={[
                  'pr-16 bg-slate-800 text-slate-100 placeholder:text-slate-500',
                  nonConformant === true
                    ? 'border-red-600 focus-visible:ring-red-600'
                    : 'border-slate-700 focus-visible:ring-slate-500',
                ].join(' ')}
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
                {selectedParam.unit}
              </span>
            </div>

            {/* Faixa permitida / alerta de não-conformidade */}
            {hasLimits && (
              <p className={`text-xs ${nonConformant === true ? 'text-red-400' : 'text-slate-500'}`}>
                {nonConformant === true ? 'Fora do limite CONAMA: ' : 'Limite CONAMA: '}
                {limitLabel}
              </p>
            )}

            {state.fieldErrors?.value && (
              <p className="text-xs text-red-400">{state.fieldErrors.value[0]}</p>
            )}
          </div>
        )}

        {/* ── Observação ─────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-slate-300">
            Observação{' '}
            <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            autoComplete="off"
            placeholder="Ex: amostra coletada após chuva forte"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            className="w-full resize-none rounded-md border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
          />
          {state.fieldErrors?.notes && (
            <p className="text-xs text-red-400">{state.fieldErrors.notes[0]}</p>
          )}
        </div>

        {/* ── Data/hora da leitura ───────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="recorded_at" className="text-sm font-medium text-slate-300">
            Data/hora da leitura
          </label>
          <Input
            id="recorded_at"
            name="recorded_at"
            type="datetime-local"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            disabled={isPending}
            required
            className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
          />
          {state.fieldErrors?.recorded_at && (
            <p className="text-xs text-red-400">{state.fieldErrors.recorded_at[0]}</p>
          )}
        </div>

        {/* ── Erro geral ─────────────────────────────────────────────────── */}
        {state.error && (
          <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <Button
          type="submit"
          disabled={isPending}
          className="h-14 w-full bg-slate-100 text-slate-900 text-base hover:bg-white disabled:opacity-50"
        >
          {isPending ? 'Registrando…' : 'Registrar leitura'}
        </Button>
      </form>
    </div>
  )
}

```

### `src/app/operador/ocorrencias/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import path from 'path'
import fs from 'fs/promises'
import { logAudit } from '@/lib/audit'

const TENANT_ID      = 'default'
const ALLOWED_TYPES  = ['image/jpeg', 'image/png', 'image/webp']
const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB

async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const OcorrenciaSchema = z.object({
  description: z.string().min(5, 'Descreva a ocorrência em pelo menos 5 caracteres'),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    error: 'Selecione a severidade',
  }),
})

// ─── Form state types ─────────────────────────────────────────────────────────

export type OcorrenciaFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Registrar ocorrência ─────────────────────────────────────────────────────

export async function registrarOcorrencia(
  _prev: OcorrenciaFormState,
  formData: FormData,
): Promise<OcorrenciaFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem registrar ocorrências.' }

  const parsed = OcorrenciaSchema.safeParse({
    description: formData.get('description'),
    severity:    formData.get('severity'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  // Prazo calculado a partir da configuração de severidade
  const severityDefault = await prisma.occurrenceSeverityDefault.findUnique({
    where: { severity: parsed.data.severity },
  })
  if (!severityDefault) return { error: 'Configuração de prazo não encontrada. Contate o Gestor.' }

  const deadline = new Date(Date.now() + severityDefault.deadline_hours * 60 * 60 * 1000)

  // Trata foto (opcional)
  const photoFile = formData.get('photo') as File | null
  type PhotoPayload = {
    filename:      string
    original_name: string
    mime_type:     string
    size_bytes:    number
  }
  let photoPayload: PhotoPayload | null = null

  if (photoFile && photoFile.size > 0) {
    if (!ALLOWED_TYPES.includes(photoFile.type)) {
      return { fieldErrors: { photo: ['Formato inválido. Use JPG, PNG ou WEBP.'] } }
    }
    if (photoFile.size > MAX_FILE_BYTES) {
      return { fieldErrors: { photo: ['Arquivo muito grande. Máximo 5 MB.'] } }
    }

    const ext      = photoFile.type === 'image/jpeg' ? 'jpg' : photoFile.type.split('/')[1]
    const filename = `${crypto.randomUUID()}.${ext}`
    const dir      = path.join(process.cwd(), 'uploads', 'occurrences')

    await fs.mkdir(dir, { recursive: true })
    const buffer = Buffer.from(await photoFile.arrayBuffer())
    await fs.writeFile(path.join(dir, filename), buffer)

    photoPayload = {
      filename,
      original_name: photoFile.name,
      mime_type:     photoFile.type,
      size_bytes:    photoFile.size,
    }
  }

  // Cria ocorrência (+ foto + audit) em transação atômica
  await prisma.$transaction(async (tx) => {
    const occurrence = await tx.occurrence.create({
      data: {
        tenant_id:   TENANT_ID,
        description: parsed.data.description,
        severity:    parsed.data.severity,
        status:      'OPEN',
        deadline,
        reported_by: userId,
      },
    })

    if (photoPayload) {
      await tx.occurrencePhoto.create({
        data: {
          tenant_id:     TENANT_ID,
          occurrence_id: occurrence.id,
          filename:      photoPayload.filename,
          original_name: photoPayload.original_name,
          mime_type:     photoPayload.mime_type,
          size_bytes:    photoPayload.size_bytes,
          uploaded_by:   userId,
        },
      })
    }

    await logAudit(tx, {
      userId,
      action:    'CREATE',
      tableName: 'occurrences',
      recordId:  occurrence.id,
      after:     { description: parsed.data.description, severity: parsed.data.severity, status: 'OPEN', deadline },
    })
  })

  revalidatePath('/operador/ocorrencias')
  return { success: true }
}

```

### `src/app/operador/ocorrencias/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const TENANT_ID = 'default'
const PAGE_SIZE  = 20

const SEVERITY_LABEL: Record<string, string> = {
  LOW:      'Baixa',
  MEDIUM:   'Média',
  HIGH:     'Alta',
  CRITICAL: 'Crítica',
}

const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'bg-slate-800 text-slate-400 border-slate-700',
  MEDIUM:   'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH:     'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50',
}

const STATUS_LABEL: Record<string, string> = {
  OPEN:        'Aberta',
  IN_PROGRESS: 'Em andamento',
  RESOLVED:    'Resolvida',
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OcorrenciasOperadorPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const userId = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email: session.user.email! } },
    select: { id: true },
  })

  if (!userId) redirect('/login')

  const where = { tenant_id: TENANT_ID, reported_by: userId.id }

  const [ocorrencias, total] = await Promise.all([
    prisma.occurrence.findMany({
      where,
      include: {
        photos: { select: { id: true }, take: 1 },
      },
      orderBy: { created_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.occurrence.count({ where }),
  ])

  const now        = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Ocorrências</h1>
            <p className="text-xs text-slate-400">{total} registro(s)</p>
          </div>
          <Link href="/operador/ocorrencias/nova">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
              + Nova
            </Button>
          </Link>
        </div>

        {/* Lista */}
        {ocorrencias.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
            Nenhuma ocorrência registrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {ocorrencias.map((oc) => {
              const prazoVencido = oc.status !== 'RESOLVED' && new Date(oc.deadline) < now
              const hasPhoto     = oc.photos.length > 0

              return (
                <div
                  key={oc.id}
                  className={[
                    'rounded-xl border bg-slate-900 p-4 space-y-2',
                    prazoVencido ? 'border-red-900/60' : 'border-slate-800',
                  ].join(' ')}
                >
                  {/* Linha superior: badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[oc.severity] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                        {SEVERITY_LABEL[oc.severity] ?? oc.severity}
                      </span>
                      {prazoVencido && (
                        <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                          PRAZO VENCIDO
                        </span>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-slate-500">
                      {STATUS_LABEL[oc.status] ?? oc.status}
                    </span>
                  </div>

                  {/* Descrição */}
                  <p className="text-sm text-slate-200 line-clamp-2">{oc.description}</p>

                  {/* Rodapé: data + prazo + foto */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-600">
                    <span>{formatDatetime(oc.created_at)}</span>
                    <div className="flex items-center gap-2">
                      {hasPhoto && (
                        <Link
                          href={`/api/occurrences/${oc.id}/photo`}
                          target="_blank"
                          className="text-sky-500 hover:text-sky-400"
                        >
                          Ver foto
                        </Link>
                      )}
                      <span className={prazoVencido ? 'text-red-400' : ''}>
                        Prazo: {formatDatetime(oc.deadline)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link href={`/operador/ocorrencias?page=${page - 1}`} className="text-slate-400 hover:text-slate-200">
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link href={`/operador/ocorrencias?page=${page + 1}`} className="text-slate-400 hover:text-slate-200">
                Próxima →
              </Link>
            ) : <span />}
          </div>
        )}

      </main>
  )
}

```

### `src/app/operador/ocorrencias/nova/occurrence-form.tsx`
```tsx
'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarOcorrencia, type OcorrenciaFormState } from '../actions'
import { Button } from '@/components/ui/button'

const DRAFT_KEY = 'occurrence_draft'
const INITIAL: OcorrenciaFormState = {}

// Prazo sugerido por severidade (espelha occurrence_severity_defaults do seed)
const DEADLINE_LABEL: Record<string, string> = {
  CRITICAL: '24 horas',
  HIGH:     '72 horas',
  MEDIUM:   '168 horas (7 dias)',
  LOW:      '720 horas (30 dias)',
}

type Draft = { description: string; severity: string }
const EMPTY_DRAFT: Draft = { description: '', severity: '' }

export function OccurrenceForm() {
  const router   = useRouter()
  const formRef  = useRef<HTMLFormElement>(null)
  const [state, action, isPending] = useActionState(registrarOcorrencia, INITIAL)

  const [mounted,      setMounted]      = useState(false)
  const [draft,        setDraft]        = useState<Draft>(EMPTY_DRAFT)
  const [photoName,    setPhotoName]    = useState<string | null>(null)
  const [photoError,   setPhotoError]   = useState<string | null>(null)
  const [offlineError, setOfflineError] = useState(false)

  // Hidrata do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) setDraft(JSON.parse(saved) as Draft)
    } catch { /* ignora */ }
    setMounted(true)
  }, [])

  // Persiste no localStorage
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, mounted])

  // Navega após sucesso
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/operador/ocorrencias')
    }
  }, [state.success, router])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    if (!file) { setPhotoName(null); return }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setPhotoError('Formato inválido. Use JPG, PNG ou WEBP.')
      e.target.value = ''
      setPhotoName(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Arquivo muito grande. Máximo 5 MB.')
      e.target.value = ''
      setPhotoName(null)
      return
    }
    setPhotoName(file.name)
  }

  const photoFieldError = photoError ?? state.fieldErrors?.photo?.[0]

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        if (!navigator.onLine) {
          e.preventDefault()
          setOfflineError(true)
        }
      }}
      className="space-y-5"
    >
      {offlineError && (
        <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
          Sem conexão. Verifique sua internet e tente novamente.
        </p>
      )}
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Descrição */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-slate-300">
          Descrição da ocorrência *
        </label>
        <textarea
          id="description" name="description"
          rows={4}
          autoComplete="off"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Descreva o que aconteceu de forma clara e objetiva…"
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-400">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      {/* Severidade */}
      <div className="space-y-1.5">
        <label htmlFor="severity" className="text-sm font-medium text-slate-300">
          Severidade *
        </label>
        <select
          id="severity" name="severity"
          value={draft.severity}
          onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Selecione…</option>
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
        </select>
        {state.fieldErrors?.severity && (
          <p className="text-xs text-red-400">{state.fieldErrors.severity[0]}</p>
        )}
      </div>

      {/* Prazo sugerido (leitura) */}
      {draft.severity && (
        <div className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm">
          <span className="text-slate-500">Prazo para resolução: </span>
          <span className="text-slate-300 font-medium">{DEADLINE_LABEL[draft.severity]}</span>
          <span className="ml-1.5 text-xs text-slate-600">(definido pelo Gestor)</span>
        </div>
      )}

      {/* Foto */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Foto <span className="text-slate-500 font-normal">(opcional — JPG, PNG ou WEBP, máx. 5 MB)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer rounded-md border border-dashed border-slate-700 bg-slate-800/40 px-4 py-3 hover:bg-slate-800 transition-colors">
          <span className="text-xs text-slate-400 flex-1 truncate">
            {photoName ?? 'Toque para selecionar uma foto'}
          </span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="sr-only"
          />
          <span className="shrink-0 rounded px-2 py-1 text-xs bg-slate-700 text-slate-300">
            Escolher
          </span>
        </label>
        {photoFieldError && (
          <p className="text-xs text-red-400">{photoFieldError}</p>
        )}
        <p className="text-xs text-slate-600">
          Ao reabrir esta página o texto é recuperado, mas a foto precisa ser selecionada novamente.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-14 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50 text-base"
      >
        {isPending ? 'Registrando…' : 'Registrar ocorrência'}
      </Button>
    </form>
  )
}

```

### `src/app/operador/ocorrencias/nova/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { OccurrenceForm } from './occurrence-form'

export default async function NovaOcorrenciaPage() {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <div>
        <BackButton href="/operador/ocorrencias" label="Ocorrências" />
        <h1 className="text-xl font-semibold mt-1">Nova ocorrência</h1>
      </div>

      <OccurrenceForm />
    </main>
  )
}

```

### `src/app/operador/turnos/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import path from 'path'
import fs from 'fs/promises'
import { randomUUID } from 'crypto'
import { isMimeTypeValido } from '@/lib/occurrence-utils'

const TENANT_ID       = 'default'
const MAX_PHOTOS_TASK = 3
const MAX_FILE_SIZE   = 5 * 1024 * 1024 // 5 MB

// ─── Guards + helpers ─────────────────────────────────────────────────────────

async function requireOperator() {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// Normaliza para meia-noite local — data do calendário independe da hora
function normalizarData(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AbrirTurnoSchema = z.object({
  shift_id: z.string().min(1, 'Selecione o turno'),
})

const IniciarPassagemSchema = z.object({
  pending_items: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  outgoing_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

const ConfirmarPassagemSchema = z.object({
  incoming_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

const ConcluirTarefaSchema = z.object({
  completion_notes: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(500).nullable(),
  ),
})

// ─── Form state ───────────────────────────────────────────────────────────────

export type TurnoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Lazy timeout (chamado em Server Components ao renderizar a página) ────────
// Não é uma Server Action de formulário — é chamada direto no page.tsx

export async function aplicarTimeouts(): Promise<void> {
  const now = new Date()
  await prisma.shiftHandover.updateMany({
    where: {
      status:     'PENDING',
      timeout_at: { lt: now },
    },
    data: { status: 'TIMED_OUT' },
  })
}

// ─── Abrir turno ──────────────────────────────────────────────────────────────

export async function abrirTurno(
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem abrir turnos.' }

  const parsed = AbrirTurnoSchema.safeParse({
    shift_id: formData.get('shift_id'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const today = normalizarData(new Date())

  // Verifica que o turno configurado existe e pertence ao tenant
  const shift = await prisma.shift.findFirst({
    where:  { id: parsed.data.shift_id, tenant_id: TENANT_ID, is_active: true },
    select: { id: true },
  })
  if (!shift) return { error: 'Turno não encontrado.' }

  // Verificação de duplicado em transação (SQLite serializa escritas — seguro no MVP)
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.shiftInstance.findFirst({
      where: {
        tenant_id: TENANT_ID,
        shift_id:  parsed.data.shift_id,
        date:      today,
        status:    { in: ['OPEN', 'HANDOVER_PENDING'] },
      },
    })
    if (existing) {
      return { error: 'Já existe um turno aberto para este período.' } as TurnoFormState
    }

    await tx.shiftInstance.create({
      data: {
        tenant_id: TENANT_ID,
        shift_id:  parsed.data.shift_id,
        date:      today,
        opened_by: userId,
        opened_at: new Date(),
        status:    'OPEN',
      },
    })
    return null
  })

  if (result?.error) return result
  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Iniciar passagem (Etapa 1 — operador sainte) ─────────────────────────────

export async function iniciarPassagem(
  instanceId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem iniciar passagens.' }

  const parsed = IniciarPassagemSchema.safeParse({
    pending_items:         formData.get('pending_items'),
    outgoing_observations: formData.get('outgoing_observations'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const instance = await prisma.shiftInstance.findUnique({
    where:   { id: instanceId },
    include: {
      shift:    { select: { handover_timeout_minutes: true } },
      handover: { select: { id: true } },
    },
  })
  if (!instance || instance.tenant_id !== TENANT_ID) return { error: 'Turno não encontrado.' }
  if (instance.status !== 'OPEN')    return { error: 'Este turno não está aberto.' }
  if (instance.handover)             return { error: 'A passagem já foi iniciada.' }

  // Auto-captura do checklist: leituras, ocorrências abertas e tarefas pendentes
  const [readingsCount, openOccurrencesCount, pendingTasks] = await Promise.all([
    prisma.reading.count({
      where: { tenant_id: TENANT_ID, shift_instance_id: instanceId },
    }),
    prisma.occurrence.count({
      where: { tenant_id: TENANT_ID, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.shiftTask.findMany({
      where:  { tenant_id: TENANT_ID, shift_instance_id: instanceId, status: 'PENDING' },
      select: { title: true },
    }),
  ])

  const checklistData = JSON.stringify({
    readings_count:         readingsCount,
    open_occurrences_count: openOccurrencesCount,
    pending_items:          parsed.data.pending_items ?? '',
    pending_tasks_count:    pendingTasks.length,
    pending_tasks:          pendingTasks.map((t) => t.title),
  })

  const handoverAt = new Date()
  const timeoutAt  = new Date(
    handoverAt.getTime() + instance.shift.handover_timeout_minutes * 60 * 1000,
  )

  await prisma.$transaction(async (tx) => {
    await tx.shiftHandover.create({
      data: {
        tenant_id:             TENANT_ID,
        shift_instance_id:     instanceId,
        outgoing_user_id:      userId,
        checklist_data:        checklistData,
        outgoing_observations: parsed.data.outgoing_observations,
        handover_at:           handoverAt,
        timeout_at:            timeoutAt,
        status:                'PENDING',
      },
    })
    await tx.shiftInstance.update({
      where: { id: instanceId },
      data:  { status: 'HANDOVER_PENDING' },
    })
  })

  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Confirmar passagem (Etapa 2 — operador entrante) ─────────────────────────

export async function confirmarPassagem(
  handoverId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem confirmar passagens.' }

  const parsed = ConfirmarPassagemSchema.safeParse({
    incoming_observations: formData.get('incoming_observations'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const handover = await prisma.shiftHandover.findUnique({
    where:   { id: handoverId },
    include: { shift_instance: { select: { id: true, tenant_id: true } } },
  })
  if (!handover || handover.shift_instance.tenant_id !== TENANT_ID) {
    return { error: 'Passagem não encontrada.' }
  }
  if (handover.status !== 'PENDING') {
    return { error: 'Esta passagem já foi encerrada.' }
  }
  // Sainte não pode confirmar a própria passagem
  if (handover.outgoing_user_id === userId) {
    return { error: 'Quem iniciou a passagem não pode confirmá-la.' }
  }

  const now = new Date()

  await prisma.$transaction(async (tx) => {
    await tx.shiftHandover.update({
      where: { id: handoverId },
      data: {
        status:                'CONFIRMED',
        confirmed_at:          now,
        incoming_user_id:      userId,
        incoming_observations: parsed.data.incoming_observations,
      },
    })
    await tx.shiftInstance.update({
      where: { id: handover.shift_instance.id },
      data:  { status: 'CLOSED', closed_at: now },
    })
  })

  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Concluir tarefa ──────────────────────────────────────────────────────────

export async function concluirTarefa(
  taskId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return { error: 'Apenas operadores podem concluir tarefas.' }

  const parsed = ConcluirTarefaSchema.safeParse({
    completion_notes: formData.get('completion_notes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const task = await prisma.shiftTask.findFirst({
    where:   { id: taskId, tenant_id: TENANT_ID },
    include: {
      shift_instance: { select: { status: true } },
      photos:         { select: { id: true } },
    },
  })
  if (!task)                                   return { error: 'Tarefa não encontrada.' }
  if (task.status !== 'PENDING')               return { error: 'Esta tarefa já foi concluída ou pulada.' }
  if (task.shift_instance.status === 'CLOSED') return { error: 'O turno já foi encerrado.' }

  // Valida fotos (0–3 por tarefa; considera fotos já existentes)
  const files = (formData.getAll('photos') as File[]).filter((f) => f.size > 0)
  if (task.photos.length + files.length > MAX_PHOTOS_TASK) {
    return { error: `Máximo de ${MAX_PHOTOS_TASK} fotos por tarefa.` }
  }
  for (const file of files) {
    if (!isMimeTypeValido(file.type)) return { error: `Arquivo inválido: ${file.name}. Use JPG, PNG ou WebP.` }
    if (file.size > MAX_FILE_SIZE)    return { error: `${file.name} excede 5 MB.` }
  }

  // Salva arquivos em disco antes da transação — evita BLOBs no SQLite
  const photoRecords: { filename: string; original_name: string; mime_type: string; size_bytes: number }[] = []
  if (files.length > 0) {
    const uploadsDir = path.join(process.cwd(), 'uploads', 'tasks')
    await fs.mkdir(uploadsDir, { recursive: true })
    for (const file of files) {
      const ext      = file.name.split('.').pop() ?? 'bin'
      const filename = `${randomUUID()}.${ext}`
      await fs.writeFile(path.join(uploadsDir, filename), Buffer.from(await file.arrayBuffer()))
      photoRecords.push({ filename, original_name: file.name, mime_type: file.type, size_bytes: file.size })
    }
  }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.shiftTask.update({
      where: { id: taskId },
      data:  {
        status:           'DONE',
        completed_at:     now,
        completed_by:     userId,
        completion_notes: parsed.data.completion_notes,
      },
    })
    if (photoRecords.length > 0) {
      await tx.shiftTaskPhoto.createMany({
        data: photoRecords.map((p) => ({
          tenant_id:     TENANT_ID,
          task_id:       taskId,
          filename:      p.filename,
          original_name: p.original_name,
          mime_type:     p.mime_type,
          size_bytes:    p.size_bytes,
          uploaded_by:   userId,
          uploaded_at:   now,
        })),
      })
    }
  })

  revalidatePath(`/operador/turnos/${task.shift_instance_id}/tarefas`)
  revalidatePath('/operador/turnos')
  return { success: true }
}

// ─── Pular tarefa ─────────────────────────────────────────────────────────────

export async function pularTarefa(taskId: string): Promise<void> {
  const session = await requireOperator()
  if (session.user.role !== 'OPERATOR') return

  const task = await prisma.shiftTask.findFirst({
    where:   { id: taskId, tenant_id: TENANT_ID, status: 'PENDING' },
    include: { shift_instance: { select: { status: true } } },
  })
  if (!task || task.shift_instance.status === 'CLOSED') return

  await prisma.shiftTask.update({
    where: { id: taskId },
    data:  { status: 'SKIPPED' },
  })
  revalidatePath(`/operador/turnos/${task.shift_instance_id}/tarefas`)
  revalidatePath('/operador/turnos')
}

```

### `src/app/operador/turnos/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { aplicarTimeouts } from './actions'

const TENANT_ID = 'default'

const STATUS_LABEL: Record<string, string> = {
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Aguardando confirmação',
  CLOSED:           'Fechado',
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function TurnosPage() {
  const session = await auth()
  if (!session) redirect('/login')

  // Aplica timeouts pendentes de forma lazy
  await aplicarTimeouts()

  const userRecord = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email: session.user.email! } },
    select: { id: true },
  })
  if (!userRecord) redirect('/login')

  const userId = userRecord.id

  // Instâncias ativas (OPEN ou HANDOVER_PENDING) de qualquer data
  // Inclui turnos noturnos (crosses_midnight) abertos ontem e ainda não encerrados
  const activeInstances = await prisma.shiftInstance.findMany({
    where: {
      tenant_id: TENANT_ID,
      status:    { in: ['OPEN', 'HANDOVER_PENDING'] },
    },
    include: {
      shift:   { select: { name: true, start_time: true, end_time: true } },
      opener:  { select: { name: true } },
      handover: {
        select: {
          id:               true,
          status:           true,
          timeout_at:       true,
          outgoing_user_id: true,
          checklist_data:   true,
          outgoing_user:    { select: { name: true } },
        },
      },
      shift_tasks: {
        where:  { status: 'PENDING' },
        select: { id: true },
      },
    },
    orderBy: { opened_at: 'asc' },
  })

  // Handovers PENDING que este operador pode confirmar (ele não é o sainte)
  const pendingToConfirm = activeInstances.filter(
    (inst) =>
      inst.handover?.status === 'PENDING' &&
      inst.handover.outgoing_user_id !== userId,
  )

  // Turnos que eu abri (e ainda estão OPEN)
  const myOpenShifts = activeInstances.filter(
    (inst) => inst.status === 'OPEN' && inst.opened_by === userId,
  )

  // Turnos OPEN de outros — posso também iniciar passagem (qualquer operador pode)
  const otherOpenShifts = activeInstances.filter(
    (inst) => inst.status === 'OPEN' && inst.opened_by !== userId,
  )

  const now = new Date()

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Turnos</h1>
          <Link href="/operador/turnos/abrir">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
              + Abrir turno
            </Button>
          </Link>
        </div>

        {/* ─── Passagens aguardando minha confirmação ─── */}
        {pendingToConfirm.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-amber-400">Aguardando sua confirmação</h2>
            {pendingToConfirm.map((inst) => {
              const h        = inst.handover!
              const vencido  = new Date(h.timeout_at) < now
              let checklist: {
                readings_count?: number
                open_occurrences_count?: number
                pending_items?: string
                pending_tasks_count?: number
                pending_tasks?: string[]
              } = {}
              try { checklist = JSON.parse(h.checklist_data) } catch { /* ignora */ }

              return (
                <div
                  key={inst.id}
                  className={[
                    'rounded-xl border bg-slate-900 p-4 space-y-3',
                    vencido ? 'border-red-900/60' : 'border-amber-900/60',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{inst.shift.name}</p>
                      <p className="text-xs text-slate-500">
                        Sainte: {h.outgoing_user.name} · {formatTime(new Date(inst.opened_at))}
                      </p>
                    </div>
                    {vencido && (
                      <span className="rounded px-2 py-0.5 text-xs font-semibold bg-red-950/60 text-red-400 border border-red-900/50 animate-pulse">
                        TIMEOUT
                      </span>
                    )}
                  </div>

                  {/* Resumo do checklist */}
                  <div className="rounded-md bg-slate-800/60 px-3 py-2 text-xs text-slate-400 space-y-1">
                    <p>{checklist.readings_count ?? 0} leitura(s) no turno</p>
                    <p>{checklist.open_occurrences_count ?? 0} ocorrência(s) em aberto</p>
                    {(checklist.pending_tasks_count ?? 0) > 0 && (
                      <div className="pt-0.5">
                        <p className="text-amber-400 font-medium">
                          {checklist.pending_tasks_count} tarefa(s) não concluída(s):
                        </p>
                        <ul className="mt-0.5 space-y-0.5">
                          {(checklist.pending_tasks ?? []).map((title, i) => (
                            <li key={i} className="text-slate-300">• {title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {checklist.pending_items && (
                      <p className="text-slate-300">Pendências: {checklist.pending_items}</p>
                    )}
                  </div>

                  <p className="text-xs text-slate-600">
                    Prazo de confirmação: {formatDatetime(new Date(h.timeout_at))}
                  </p>

                  <Link href={`/operador/turnos/confirmar?handoverId=${h.id}`}>
                    <Button className="h-11 w-full bg-amber-900/60 text-amber-300 hover:bg-amber-900 border border-amber-900/50 text-sm">
                      Confirmar recebimento
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        )}

        {/* ─── Meus turnos abertos (posso iniciar passagem) ─── */}
        {myOpenShifts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-slate-400">Meu turno ativo</h2>
            {myOpenShifts.map((inst) => (
              <div key={inst.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{inst.shift.name}</p>
                    <p className="text-xs text-slate-500">
                      {inst.shift.start_time} – {inst.shift.end_time} · aberto às {formatTime(new Date(inst.opened_at))}
                    </p>
                  </div>
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                    {STATUS_LABEL[inst.status]}
                  </span>
                </div>
                {/* Badge de tarefas pendentes */}
                {inst.shift_tasks.length > 0 && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
                    <span className="text-xs text-amber-400">
                      {inst.shift_tasks.length} tarefa(s) pendente(s)
                    </span>
                    <Link href={`/operador/turnos/${inst.id}/tarefas`}>
                      <Button className="h-7 border border-amber-900/50 bg-amber-950/30 text-amber-300 hover:bg-amber-950/60 text-xs px-3">
                        Ver tarefas
                      </Button>
                    </Link>
                  </div>
                )}
                <Link href={`/operador/turnos/${inst.id}/passagem`}>
                  <Button className="h-10 w-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm">
                    Iniciar passagem de turno
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ─── Outros turnos abertos (outros operadores) ─── */}
        {otherOpenShifts.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-slate-400">Outros turnos ativos</h2>
            {otherOpenShifts.map((inst) => (
              <div key={inst.id} className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{inst.shift.name}</p>
                    <p className="text-xs text-slate-500">
                      Aberto por {inst.opener.name} às {formatTime(new Date(inst.opened_at))}
                    </p>
                  </div>
                  <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                    {STATUS_LABEL[inst.status]}
                  </span>
                </div>
                {inst.shift_tasks.length > 0 && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
                    <span className="text-xs text-amber-400">
                      {inst.shift_tasks.length} tarefa(s) pendente(s)
                    </span>
                    <Link href={`/operador/turnos/${inst.id}/tarefas`}>
                      <Button className="h-7 border border-amber-900/50 bg-amber-950/30 text-amber-300 hover:bg-amber-950/60 text-xs px-3">
                        Ver tarefas
                      </Button>
                    </Link>
                  </div>
                )}
                <Link href={`/operador/turnos/${inst.id}/passagem`}>
                  <Button className="h-10 w-full border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm">
                    Iniciar passagem deste turno
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* ─── Sem atividade ─── */}
        {activeInstances.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center space-y-3">
            <p className="text-sm text-slate-500">Nenhum turno ativo hoje.</p>
            <Link href="/operador/turnos/abrir">
              <Button className="bg-slate-100 text-slate-900 hover:bg-white text-sm h-10 px-6">
                Abrir turno
              </Button>
            </Link>
          </div>
        )}

      </main>
  )
}

```

### `src/app/operador/turnos/[id]/passagem/handover-form.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { iniciarPassagem } from '../../actions'
import type { TurnoFormState } from '../../actions'

const INITIAL: TurnoFormState = {}

export function HandoverForm({ instanceId }: { instanceId: string }) {
  const router = useRouter()
  const action = iniciarPassagem.bind(null, instanceId)
  const [state, formAction, isPending] = useActionState(action, INITIAL)

  useEffect(() => {
    if (state.success) router.push('/operador/turnos')
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Itens pendentes
          <span className="ml-1 text-slate-500 font-normal">(opcional)</span>
        </label>
        <textarea
          name="pending_items"
          rows={3}
          placeholder="Ex: Bomba B2 com vibração anormal, aguardando manutenção"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Observações do turno
          <span className="ml-1 text-slate-500 font-normal">(opcional)</span>
        </label>
        <textarea
          name="outgoing_observations"
          rows={3}
          placeholder="Informações relevantes para o próximo operador"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none resize-none"
        />
      </div>

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-amber-700 hover:bg-amber-600 text-white text-sm"
      >
        {isPending ? 'Iniciando passagem…' : 'Iniciar passagem de turno'}
      </Button>
    </form>
  )
}

```

### `src/app/operador/turnos/[id]/passagem/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { HandoverForm } from './handover-form'

const TENANT_ID = 'default'

export default async function PassagemPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const instance = await prisma.shiftInstance.findUnique({
    where: { id },
    include: {
      shift:   { select: { name: true, start_time: true, end_time: true } },
      opener:  { select: { name: true } },
      handover: { select: { id: true } },
      _count: {
        select: {
          readings: true,
        },
      },
    },
  })

  if (!instance || instance.tenant_id !== TENANT_ID) redirect('/operador/turnos')
  if (instance.status !== 'OPEN')  redirect('/operador/turnos')
  if (instance.handover)           redirect('/operador/turnos')

  const [openOccurrencesCount, pendingTasksCount] = await Promise.all([
    prisma.occurrence.count({
      where: { tenant_id: TENANT_ID, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.shiftTask.count({
      where: { tenant_id: TENANT_ID, shift_instance_id: id, status: 'PENDING' },
    }),
  ])

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <BackButton href="/operador/turnos" label="Turnos" />
        <div>
          <h1 className="text-xl font-semibold">Passagem de turno</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.name} · {instance.shift.start_time} – {instance.shift.end_time}
          </p>
        </div>

        {/* Resumo automático */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Resumo do turno</p>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className="text-2xl font-bold text-slate-100">{instance._count.readings}</p>
              <p className="text-xs text-slate-500">leitura(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={['text-2xl font-bold', openOccurrencesCount > 0 ? 'text-amber-400' : 'text-slate-100'].join(' ')}>
                {openOccurrencesCount}
              </p>
              <p className="text-xs text-slate-500">ocorrência(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={['text-2xl font-bold', pendingTasksCount > 0 ? 'text-red-400' : 'text-slate-100'].join(' ')}>
                {pendingTasksCount}
              </p>
              <p className="text-xs text-slate-500">tarefa(s) pend.</p>
            </div>
          </div>
          {pendingTasksCount > 0 && (
            <p className="text-xs text-red-400 text-center">
              Há tarefas não concluídas — elas aparecerão no checklist do próximo operador.
            </p>
          )}
        </div>

        <HandoverForm instanceId={id} />

    </main>
  )
}

```

### `src/app/operador/turnos/[id]/tarefas/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { TaskCard } from './task-card'

const TENANT_ID = 'default'

export default async function TarefasDoTurnoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || !['OPERATOR', 'MANAGER'].includes(session.user.role)) redirect('/acesso-negado')

  const { id } = await params

  const instance = await prisma.shiftInstance.findUnique({
    where: { id },
    include: {
      shift:      { select: { name: true, start_time: true, end_time: true } },
      shift_tasks: {
        include: {
          assignee:  { select: { id: true, name: true } },
          creator:   { select: { name: true } },
          completer: { select: { name: true } },
          photos:    { select: { id: true, original_name: true } },
        },
        orderBy: { created_at: 'asc' },
      },
    },
  })

  if (!instance || instance.tenant_id !== TENANT_ID) redirect('/operador/turnos')

  const total   = instance.shift_tasks.length
  const done    = instance.shift_tasks.filter((t) => t.status === 'DONE').length
  const pending = instance.shift_tasks.filter((t) => t.status === 'PENDING').length
  const isOpen  = instance.status !== 'CLOSED'

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <BackButton href="/operador/turnos" label="Turnos" />
        <div>
          <h1 className="text-xl font-semibold">Tarefas do turno</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.name} · {instance.shift.start_time} – {instance.shift.end_time}
          </p>
        </div>

        {/* Barra de progresso */}
        {total > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{done} de {total} concluída(s)</span>
              {pending > 0 && (
                <span className="text-amber-400">{pending} pendente(s)</span>
              )}
            </div>
            <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all"
                style={{ width: `${total > 0 ? Math.round((done / total) * 100) : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Lista de tarefas */}
        {total === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center">
            <p className="text-sm text-slate-500">Nenhuma tarefa atribuída a este turno.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {instance.shift_tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={{
                  id:               task.id,
                  title:            task.title,
                  description:      task.description,
                  status:           task.status,
                  assigned_to_id:   task.assigned_to_id,
                  assignee:         task.assignee,
                  creator:          task.creator,
                  completer:        task.completer,
                  completed_at:     task.completed_at,
                  completion_notes: task.completion_notes,
                  photos:           task.photos,
                }}
                isShiftOpen={isOpen}
              />
            ))}
          </div>
        )}

    </main>
  )
}

```

### `src/app/operador/turnos/[id]/tarefas/task-card.tsx`
```tsx
'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { concluirTarefa, pularTarefa, type TurnoFormState } from '../../actions'

const INITIAL: TurnoFormState = {}

type Photo = { id: string; original_name: string }
type Task = {
  id:               string
  title:            string
  description:      string | null
  status:           string
  assigned_to_id:   string | null
  assignee:         { id: string; name: string } | null
  creator:          { name: string }
  completer:        { name: string } | null
  completed_at:     Date | null
  completion_notes: string | null
  photos:           Photo[]
}

export function TaskCard({
  task,
  isShiftOpen,
}: {
  task:        Task
  isShiftOpen: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const boundAction = concluirTarefa.bind(null, task.id)
  const [state, formAction, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) setExpanded(false)
  }, [state.success])

  const isPendingStatus = task.status === 'PENDING'
  const isDone          = task.status === 'DONE'
  const isSkipped       = task.status === 'SKIPPED'
  const canAct          = isPendingStatus && isShiftOpen

  return (
    <div className={[
      'rounded-xl border bg-slate-900 overflow-hidden',
      isDone    ? 'border-green-900/50'  :
      isSkipped ? 'border-slate-800/40'  :
      expanded  ? 'border-emerald-700'   :
                  'border-slate-800',
    ].join(' ')}>

      {/* ─── Cabeçalho do card ─── */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {/* Ícone circular de status */}
          <div className={[
            'mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center',
            isDone    ? 'border-green-500 bg-green-500'   :
            isSkipped ? 'border-slate-600 bg-slate-700'   :
                        'border-slate-600 bg-transparent',
          ].join(' ')}>
            {isDone && (
              <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {isSkipped && (
              <svg className="h-2.5 w-2.5 text-slate-500" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className={['text-sm font-medium leading-snug', isDone || isSkipped ? 'text-slate-500' : 'text-slate-100'].join(' ')}>
              {task.title}
            </p>
            {task.description && (
              <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{task.description}</p>
            )}
            <p className="mt-1 text-xs text-slate-600">
              {task.assignee ? `Para: ${task.assignee.name}` : 'Qualquer operador'}
              {' · '}por {task.creator.name}
            </p>
          </div>
        </div>

        {/* Resumo de conclusão (DONE) */}
        {isDone && (
          <div className="ml-8 rounded-lg border border-green-900/30 bg-green-950/20 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-medium text-green-400">
              Concluída{task.completer ? ` por ${task.completer.name}` : ''}
            </p>
            {task.completion_notes && (
              <p className="text-xs text-slate-400 leading-relaxed">{task.completion_notes}</p>
            )}
            {task.photos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {task.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={`/api/shift-task-photos/${photo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-green-900/40 bg-green-950/40 px-2 py-0.5 text-xs text-green-400 hover:bg-green-950/70 transition-colors"
                  >
                    ↗ {photo.original_name}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Botões de ação (PENDING + turno aberto + form fechado) */}
        {canAct && !expanded && (
          <div className="ml-8 flex gap-2">
            <Button
              type="button"
              onClick={() => setExpanded(true)}
              className="h-12 flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium"
            >
              Concluir
            </Button>
            <form action={pularTarefa.bind(null, task.id)}>
              <Button
                type="submit"
                className="h-12 border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 text-sm px-5"
              >
                Pular
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* ─── Formulário de conclusão (expansível) ─── */}
      {expanded && canAct && (
        <form action={formAction} className="border-t border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <textarea
            name="completion_notes"
            rows={3}
            placeholder="Observações (opcional)"
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
          />

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400">
              Fotos comprovação{' '}
              <span className="font-normal text-slate-600">até 3 · opcional</span>
            </label>
            <input
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-400
                file:mr-3 file:rounded-md file:border-0 file:bg-emerald-900/60 file:px-3 file:py-1.5
                file:text-xs file:text-emerald-300 file:font-medium focus:outline-none"
            />
            <p className="text-xs text-slate-600">JPG, PNG ou WebP · máx. 5 MB cada</p>
          </div>

          {state.error && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
              {state.error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setExpanded(false)}
              className="h-12 border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 text-sm px-5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-12 flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium"
            >
              {isPending ? 'Salvando…' : 'Confirmar conclusão'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

```

### `src/app/operador/turnos/abrir/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ShiftForm } from './shift-form'

const TENANT_ID = 'default'

export default async function AbrirTurnoPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const shifts = await prisma.shift.findMany({
    where:   { tenant_id: TENANT_ID, is_active: true },
    select:  { id: true, name: true, start_time: true, end_time: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <div>
        <BackButton href="/operador/turnos" label="Turnos" />
        <h1 className="text-xl font-semibold mt-1">Abrir turno</h1>
      </div>

      {shifts.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 py-12 text-center space-y-2">
          <p className="text-sm text-slate-500">Nenhum turno configurado.</p>
          <p className="text-xs text-slate-600">Peça ao gestor para cadastrar os turnos.</p>
        </div>
      ) : (
        <ShiftForm shifts={shifts} />
      )}
    </main>
  )
}

```

### `src/app/operador/turnos/abrir/shift-form.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { abrirTurno } from '../actions'
import type { TurnoFormState } from '../actions'

type Shift = { id: string; name: string; start_time: string; end_time: string }

const INITIAL: TurnoFormState = {}

export function ShiftForm({ shifts }: { shifts: Shift[] }) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(abrirTurno, INITIAL)

  useEffect(() => {
    if (state.success) router.push('/operador/turnos')
  }, [state.success, router])

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        {shifts.map((shift) => (
          <label
            key={shift.id}
            className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 cursor-pointer hover:bg-slate-800/60 transition-colors has-[:checked]:border-emerald-700 has-[:checked]:bg-emerald-950/20"
          >
            <input
              type="radio"
              name="shift_id"
              value={shift.id}
              className="accent-emerald-500"
            />
            <div>
              <p className="text-sm font-medium">{shift.name}</p>
              <p className="text-xs text-slate-500">{shift.start_time} – {shift.end_time}</p>
            </div>
          </label>
        ))}
      </div>

      {state.fieldErrors?.shift_id && (
        <p className="text-xs text-red-400">{state.fieldErrors.shift_id[0]}</p>
      )}
      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
      >
        {isPending ? 'Abrindo…' : 'Confirmar abertura'}
      </Button>
    </form>
  )
}

```

### `src/app/operador/turnos/confirmar/confirm-form.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { confirmarPassagem } from '../actions'
import type { TurnoFormState } from '../actions'

const INITIAL: TurnoFormState = {}

export function ConfirmForm({ handoverId }: { handoverId: string }) {
  const router = useRouter()
  const action = confirmarPassagem.bind(null, handoverId)
  const [state, formAction, isPending] = useActionState(action, INITIAL)

  useEffect(() => {
    if (state.success) router.push('/operador/turnos')
  }, [state.success, router])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Suas observações
          <span className="ml-1 text-slate-500 font-normal">(opcional)</span>
        </label>
        <textarea
          name="incoming_observations"
          rows={3}
          placeholder="Observações sobre o recebimento do turno"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none resize-none"
        />
      </div>

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-emerald-700 hover:bg-emerald-600 text-white text-sm"
      >
        {isPending ? 'Confirmando…' : 'Confirmar recebimento do turno'}
      </Button>
    </form>
  )
}

```

### `src/app/operador/turnos/confirmar/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ConfirmForm } from './confirm-form'

const TENANT_ID = 'default'

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<{ handoverId?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { handoverId } = await searchParams
  if (!handoverId) redirect('/operador/turnos')

  const handover = await prisma.shiftHandover.findUnique({
    where:   { id: handoverId },
    include: {
      shift_instance: {
        select: {
          id:        true,
          tenant_id: true,
          shift: { select: { name: true, start_time: true, end_time: true } },
        },
      },
      outgoing_user: { select: { name: true } },
    },
  })

  if (!handover || handover.shift_instance.tenant_id !== TENANT_ID) redirect('/operador/turnos')
  if (handover.status !== 'PENDING') redirect('/operador/turnos')

  let checklist: {
    readings_count?: number
    open_occurrences_count?: number
    pending_items?: string
  } = {}
  try { checklist = JSON.parse(handover.checklist_data) } catch { /* ignora */ }

  const vencido = new Date(handover.timeout_at) < new Date()

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <BackButton href="/operador/turnos" label="Turnos" />
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Confirmar recebimento</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {handover.shift_instance.shift.name} · sainte: {handover.outgoing_user.name}
            </p>
          </div>
          {vencido && (
            <span className="shrink-0 rounded px-2 py-0.5 text-xs font-semibold bg-red-950/60 text-red-400 border border-red-900/50 animate-pulse">
              TIMEOUT
            </span>
          )}
        </div>

        {/* Resumo do turno sainte */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Resumo do turno</p>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className="text-2xl font-bold text-slate-100">{checklist.readings_count ?? 0}</p>
              <p className="text-xs text-slate-500">leitura(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={['text-2xl font-bold', (checklist.open_occurrences_count ?? 0) > 0 ? 'text-amber-400' : 'text-slate-100'].join(' ')}>
                {checklist.open_occurrences_count ?? 0}
              </p>
              <p className="text-xs text-slate-500">ocorrência(s) em aberto</p>
            </div>
          </div>

          {checklist.pending_items && (
            <div className="rounded-lg bg-amber-950/20 border border-amber-900/40 px-3 py-2">
              <p className="text-xs font-medium text-amber-400 mb-0.5">Itens pendentes</p>
              <p className="text-xs text-slate-300">{checklist.pending_items}</p>
            </div>
          )}

          {handover.outgoing_observations && (
            <div className="rounded-lg bg-slate-800/40 px-3 py-2">
              <p className="text-xs font-medium text-slate-400 mb-0.5">Observações do sainte</p>
              <p className="text-xs text-slate-300">{handover.outgoing_observations}</p>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Prazo de confirmação: {formatDatetime(new Date(handover.timeout_at))}
          </p>
        </div>

        <ConfirmForm handoverId={handoverId} />

    </main>
  )
}

```

---
## PERFIL TÉCNICO

### `src/app/tecnico/layout.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { TecnicoBottomNav } from '@/components/tecnico/bottom-nav'

export default async function TecnicoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    redirect('/acesso-negado')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/tecnico/dashboard" className="text-base font-bold tracking-tight hover:text-slate-300 transition-colors">Solentis</Link>
            <span className="rounded-full bg-sky-900/60 px-2.5 py-0.5 text-xs font-medium text-sky-400">
              Técnico
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Conteúdo — pb-16 para não ficar atrás da bottom nav */}
      <div className="pb-16">
        {children}
      </div>

      <TecnicoBottomNav />
    </div>
  )
}

```

### `src/app/tecnico/analises/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { calcularNaoConformidade } from '@/lib/readings-utils'

const TENANT_ID = 'default'

async function requireTechnician() {
  const session = await auth()
  if (!session || session.user.role !== 'TECHNICIAN') {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function requireTechnicianOrManager() {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

const AnaliseSchema = z.object({
  collection_point_id: z.string().min(1, 'Selecione o ponto de coleta'),
  parameter_id:        z.string().min(1, 'Selecione o parâmetro'),
  method_id:           z.string().min(1, 'Selecione o método de análise'),
  value: z.preprocess(
    (v) => {
      if (v === '' || v == null) return null
      const n = Number(v)
      return isNaN(n) ? null : n
    },
    z.number({ error: 'Informe o valor medido' }),
  ),
  report_text: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(5000, 'Laudo deve ter no máximo 5000 caracteres').nullable(),
  ),
  collected_at: z.string().min(1, 'Informe a data/hora da coleta'),
})

export type AnaliseFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Registrar análise ────────────────────────────────────────────────────────

export async function registrarAnalise(
  _prev: AnaliseFormState,
  formData: FormData,
): Promise<AnaliseFormState> {
  const session = await requireTechnician()

  const parsed = AnaliseSchema.safeParse({
    collection_point_id: formData.get('collection_point_id'),
    parameter_id:        formData.get('parameter_id'),
    method_id:           formData.get('method_id'),
    value:               formData.get('value'),
    report_text:         formData.get('report_text'),
    collected_at:        formData.get('collected_at'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  // Busca os limites vigentes do parâmetro no momento da coleta.
  // Esses limites são capturados como snapshot imutável — rastreabilidade legal (CONAMA 430/2011).
  const param = await prisma.qualityParameter.findUnique({
    where:  { id: parsed.data.parameter_id },
    select: { min_limit: true, max_limit: true, unit: true },
  })
  if (!param) return { error: 'Parâmetro não encontrado.' }

  const isNonConformant =
    calcularNaoConformidade(parsed.data.value, param.min_limit, param.max_limit) ?? false

  await prisma.analysis.create({
    data: {
      tenant_id:           TENANT_ID,
      collection_point_id: parsed.data.collection_point_id,
      parameter_id:        parsed.data.parameter_id,
      method_id:           parsed.data.method_id,
      value:               parsed.data.value,
      unit:                param.unit,
      min_limit_applied:   param.min_limit,   // snapshot imutável
      max_limit_applied:   param.max_limit,   // snapshot imutável
      report_text:         parsed.data.report_text,
      is_non_conformant:   isNonConformant,
      approved_by:         null,
      approved_at:         null,
      origin:              'MANUAL',
      metadata_origin:     null,
      collected_at:        new Date(parsed.data.collected_at),
      recorded_by:         userId,
    },
  })

  revalidatePath('/tecnico/analises')
  return { success: true }
}

// ─── Aprovar análise ──────────────────────────────────────────────────────────
// Qualquer TECHNICIAN ou MANAGER pode aprovar qualquer análise pendente.

export async function aprovarAnalise(
  analysisId: string,
): Promise<{ error?: string }> {
  const session = await requireTechnicianOrManager()

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const analysis = await prisma.analysis.findUnique({
    where:  { id: analysisId },
    select: { approved_by: true },
  })
  if (!analysis)              return { error: 'Análise não encontrada.' }
  if (analysis.approved_by)   return { error: 'Análise já aprovada.' }

  await prisma.analysis.update({
    where: { id: analysisId },
    data:  { approved_by: userId, approved_at: new Date() },
  })

  revalidatePath('/tecnico/analises')
  return {}
}

```

### `src/app/tecnico/analises/approve-button.tsx`
```tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { aprovarAnalise } from './actions'

export function ApproveButton({ analysisId }: { analysisId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      const result = await aprovarAnalise(analysisId)
      if (!result.error) router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={handleApprove}
      className="border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50 text-xs h-10 px-3"
    >
      {isPending ? 'Aprovando…' : 'Aprovar'}
    </Button>
  )
}

```

### `src/app/tecnico/analises/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ApproveButton } from './approve-button'

const TENANT_ID = 'default'
const PAGE_SIZE = 20

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function AnalisesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam } = await searchParams
  const page = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip = (page - 1) * PAGE_SIZE

  const [analyses, total] = await Promise.all([
    prisma.analysis.findMany({
      where:   { tenant_id: TENANT_ID },
      include: {
        collection_point: { select: { name: true } },
        parameter:        { select: { name: true } },
        method:           { select: { name: true } },
        approver:         { select: { name: true } },
      },
      orderBy: { collected_at: 'desc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.analysis.count({ where: { tenant_id: TENANT_ID } }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const canApprove = session.user.role === 'TECHNICIAN' || session.user.role === 'MANAGER'

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Análises</h1>
            <p className="text-xs text-slate-400">{total} registro(s) no total</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/tecnico/analises/historico">
              <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8">
                Histórico
              </Button>
            </Link>
            {session.user.role === 'TECHNICIAN' && (
              <Link href="/tecnico/analises/nova">
                <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
                  + Nova
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Lista */}
        {analyses.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
            Nenhuma análise registrada ainda.
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.map((a) => (
              <div
                key={a.id}
                className={[
                  'rounded-xl border bg-slate-900 p-4 space-y-2',
                  a.is_non_conformant
                    ? 'border-red-900/60'
                    : 'border-slate-800',
                ].join(' ')}
              >
                {/* Linha superior: ponto + badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-slate-100 leading-snug">
                      {a.collection_point.name}
                    </p>
                    <p className="text-xs text-slate-500">{formatDatetime(a.collected_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {a.is_non_conformant && (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                        Fora do limite
                      </span>
                    )}
                    {a.approved_by ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                        Aprovado
                      </span>
                    ) : (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-900/50">
                        Pendente
                      </span>
                    )}
                  </div>
                </div>

                {/* Parâmetro + valor */}
                <p className="text-sm text-slate-300">
                  <span className="font-medium">{a.parameter.name}:</span>{' '}
                  {a.value} {a.unit}
                  <span className="text-slate-600"> · {a.method.name}</span>
                </p>

                {/* Limites aplicados (snapshot) */}
                {(a.min_limit_applied !== null || a.max_limit_applied !== null) && (
                  <p className="text-xs text-slate-600">
                    Limite vigente na coleta: {a.min_limit_applied ?? '—'} – {a.max_limit_applied ?? '—'} {a.unit}
                  </p>
                )}

                {/* Aprovador ou botão de aprovação */}
                <div className="flex items-center justify-between pt-0.5">
                  {a.approved_by ? (
                    <p className="text-xs text-slate-600">
                      Aprovado por {a.approver?.name ?? '—'}
                    </p>
                  ) : (
                    <span />
                  )}
                  {!a.approved_by && canApprove && (
                    <ApproveButton analysisId={a.id} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link href={`/tecnico/analises?page=${page - 1}`} className="text-slate-400 hover:text-slate-200">
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link href={`/tecnico/analises?page=${page + 1}`} className="text-slate-400 hover:text-slate-200">
                Próxima →
              </Link>
            ) : <span />}
          </div>
        )}

    </main>
  )
}

```

### `src/app/tecnico/analises/historico/analysis-chart.tsx`
```tsx
'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceLine, ResponsiveContainer, Dot,
} from 'recharts'

type DataPoint = {
  date:            string
  value:           number
  isNonConformant: boolean
}

type Props = {
  data:     DataPoint[]
  unit:     string
  minLimit: number | null
  maxLimit: number | null
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, payload } = props
  const fill = payload.isNonConformant ? '#f87171' : '#60a5fa'
  return <circle cx={cx} cy={cy} r={4} fill={fill} stroke="none" />
}

export function AnalysisChart({ data, unit, minLimit, maxLimit }: Props) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />

        <XAxis
          dataKey="date"
          tickFormatter={formatDate}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#1e293b' }}
          interval="preserveStartEnd"
        />

        <YAxis
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#1e293b' }}
          width={40}
          unit={` ${unit}`}
        />

        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, fontSize: 12 }}
          labelStyle={{ color: '#94a3b8' }}
          labelFormatter={(v) => formatDate(String(v))}
          formatter={(v) => [`${v} ${unit}`, 'Valor']}
        />

        {minLimit !== null && (
          <ReferenceLine
            y={minLimit} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5}
            label={{ value: `mín ${minLimit}`, position: 'insideTopLeft', fontSize: 10, fill: '#f59e0b' }}
          />
        )}

        {maxLimit !== null && (
          <ReferenceLine
            y={maxLimit} stroke="#f59e0b" strokeDasharray="4 2" strokeWidth={1.5}
            label={{ value: `máx ${maxLimit}`, position: 'insideBottomLeft', fontSize: 10, fill: '#f59e0b' }}
          />
        )}

        <Line
          type="monotone"
          dataKey="value"
          stroke="#60a5fa"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

```

### `src/app/tecnico/analises/historico/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { AnalysisChart } from './analysis-chart'

const TENANT_ID = 'default'
const DEFAULT_DAYS = 30
const MAX_DAYS = 90

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ parameter_id?: string; days?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { parameter_id, days: daysParam } = await searchParams
  const days = daysParam === '90' ? MAX_DAYS : DEFAULT_DAYS

  const parameters = await prisma.qualityParameter.findMany({
    where:   { tenant_id: TENANT_ID, is_active: true },
    select:  { id: true, name: true, unit: true, min_limit: true, max_limit: true },
    orderBy: { name: 'asc' },
  })

  const selectedParam = parameters.find((p) => p.id === parameter_id) ?? null

  const since = new Date()
  since.setDate(since.getDate() - days)

  const dataPoints = selectedParam
    ? await prisma.analysis.findMany({
        where: {
          tenant_id:    TENANT_ID,
          parameter_id: selectedParam.id,
          collected_at: { gte: since },
        },
        select:  { collected_at: true, value: true, is_non_conformant: true },
        orderBy: { collected_at: 'asc' },
        take:    500,
      })
    : []

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div>
          <BackButton href="/tecnico/analises" label="Análises" />
          <h1 className="text-xl font-semibold mt-1">Histórico</h1>
        </div>

        {/* Filtros */}
        <form method="GET" className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1.5 flex-1 min-w-48">
            <label htmlFor="parameter_id" className="text-sm font-medium text-slate-300">
              Parâmetro
            </label>
            <select
              id="parameter_id" name="parameter_id"
              defaultValue={parameter_id ?? ''}
              className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">Selecione…</option>
              {parameters.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="days" className="text-sm font-medium text-slate-300">Período</label>
            <select
              id="days" name="days"
              defaultValue={String(days)}
              className="rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </div>

          <button
            type="submit"
            className="h-9 rounded-md border border-slate-700 bg-slate-800 px-4 text-sm text-slate-300 hover:bg-slate-700"
          >
            Ver
          </button>
        </form>

        {/* Gráfico */}
        {!selectedParam ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center text-sm text-slate-500">
            Selecione um parâmetro para ver o histórico.
          </div>
        ) : dataPoints.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-16 text-center text-sm text-slate-500">
            Nenhuma análise nos últimos {days} dias para {selectedParam.name}.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-base font-medium">
                {selectedParam.name}
                <span className="ml-2 text-sm font-normal text-slate-400">{selectedParam.unit}</span>
              </h2>
              <span className="text-xs text-slate-500">{dataPoints.length} medição(ões)</span>
            </div>
            <AnalysisChart
              data={dataPoints.map((d) => ({
                date:            d.collected_at.toISOString(),
                value:           d.value,
                isNonConformant: d.is_non_conformant,
              }))}
              unit={selectedParam.unit}
              minLimit={selectedParam.min_limit}
              maxLimit={selectedParam.max_limit}
            />
          </div>
        )}
    </main>
  )
}

```

### `src/app/tecnico/analises/nova/analysis-form.tsx`
```tsx
'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registrarAnalise, type AnaliseFormState } from '../actions'

const DRAFT_KEY = 'analysis_draft'

type CollectionPoint = { id: string; name: string }
type Parameter = { id: string; name: string; unit: string; min_limit: number | null; max_limit: number | null }
type Method = { id: string; name: string }

type Props = {
  collectionPoints: CollectionPoint[]
  parameters:       Parameter[]
  methods:          Method[]
}

type Draft = {
  collection_point_id: string
  parameter_id:        string
  method_id:           string
  value:               string
  report_text:         string
  collected_at:        string
}

function formatDatetimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const initialState: AnaliseFormState = {}

const SELECT_CLS =
  'w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2.5 text-sm ' +
  'focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50'

export function AnalysisForm({ collectionPoints, parameters, methods }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registrarAnalise, initialState)

  const [mounted, setMounted]                     = useState(false)
  const [collectionPointId, setCollectionPointId] = useState('')
  const [parameterId, setParameterId]             = useState('')
  const [methodId, setMethodId]                   = useState('')
  const [valueStr, setValueStr]                   = useState('')
  const [reportText, setReportText]               = useState('')
  const [collectedAt, setCollectedAt]             = useState('')

  // ── Carregar rascunho do localStorage na montagem ──────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const d = JSON.parse(raw) as Partial<Draft>
        setCollectionPointId(d.collection_point_id ?? '')
        setParameterId(d.parameter_id ?? '')
        setMethodId(d.method_id ?? '')
        setValueStr(d.value ?? '')
        setReportText(d.report_text ?? '')
        setCollectedAt(d.collected_at ?? formatDatetimeLocal(new Date()))
      } catch {
        setCollectedAt(formatDatetimeLocal(new Date()))
      }
    } else {
      setCollectedAt(formatDatetimeLocal(new Date()))
    }
    setMounted(true)
  }, [])

  // ── Salvar rascunho a cada alteração ───────────────────────────────────────
  useEffect(() => {
    if (!mounted) return
    const draft: Draft = {
      collection_point_id: collectionPointId,
      parameter_id:        parameterId,
      method_id:           methodId,
      value:               valueStr,
      report_text:         reportText,
      collected_at:        collectedAt,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [mounted, collectionPointId, parameterId, methodId, valueStr, reportText, collectedAt])

  // ── Limpar rascunho e redirecionar após sucesso ────────────────────────────
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/tecnico/analises')
    }
  }, [state.success, router])

  const selectedParam = parameters.find((p) => p.id === parameterId) ?? null

  // Verificação de não-conformidade em tempo real
  const nonConformant: boolean | null = (() => {
    if (!selectedParam || valueStr === '') return null
    const v = parseFloat(valueStr)
    if (isNaN(v)) return null
    const below = selectedParam.min_limit !== null && v < selectedParam.min_limit
    const above = selectedParam.max_limit !== null && v > selectedParam.max_limit
    return below || above
  })()

  const hasLimits = selectedParam
    ? selectedParam.min_limit !== null || selectedParam.max_limit !== null
    : false

  const limitLabel = selectedParam
    ? `${selectedParam.min_limit ?? '—'} – ${selectedParam.max_limit ?? '—'} ${selectedParam.unit}`
    : ''

  return (
    <div className="space-y-5">
      <Link href="/tecnico/analises" className="inline-block text-sm text-slate-400 hover:text-slate-200">
        ← Voltar para análises
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Nova análise</h1>
        <p className="text-xs text-slate-400">Registre o resultado da análise laboratorial.</p>
      </div>

      <form action={formAction} className="space-y-5">

        {/* ── Ponto de coleta ───────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="collection_point_id" className="text-sm font-medium text-slate-300">
            Ponto de coleta
          </label>
          <select
            id="collection_point_id" name="collection_point_id"
            value={collectionPointId}
            onChange={(e) => setCollectionPointId(e.target.value)}
            disabled={isPending} required
            className={SELECT_CLS}
          >
            <option value="">Selecione o ponto…</option>
            {collectionPoints.map((cp) => (
              <option key={cp.id} value={cp.id}>{cp.name}</option>
            ))}
          </select>
          {state.fieldErrors?.collection_point_id && (
            <p className="text-xs text-red-400">{state.fieldErrors.collection_point_id[0]}</p>
          )}
        </div>

        {/* ── Parâmetro ─────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="parameter_id" className="text-sm font-medium text-slate-300">
            Parâmetro
          </label>
          <select
            id="parameter_id" name="parameter_id"
            value={parameterId}
            onChange={(e) => { setParameterId(e.target.value); setValueStr('') }}
            disabled={isPending} required
            className={SELECT_CLS}
          >
            <option value="">Selecione o parâmetro…</option>
            {parameters.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
            ))}
          </select>
          {state.fieldErrors?.parameter_id && (
            <p className="text-xs text-red-400">{state.fieldErrors.parameter_id[0]}</p>
          )}
        </div>

        {/* ── Método de análise ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="method_id" className="text-sm font-medium text-slate-300">
            Método de análise
          </label>
          <select
            id="method_id" name="method_id"
            value={methodId}
            onChange={(e) => setMethodId(e.target.value)}
            disabled={isPending} required
            className={SELECT_CLS}
          >
            <option value="">Selecione o método…</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {state.fieldErrors?.method_id && (
            <p className="text-xs text-red-400">{state.fieldErrors.method_id[0]}</p>
          )}
        </div>

        {/* ── Valor medido ──────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="value" className="text-sm font-medium text-slate-300">
            Valor medido
          </label>
          <div className="relative">
            <Input
              id="value" name="value"
              type="number" step="0.001" inputMode="decimal"
              placeholder="0,000"
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              disabled={isPending} required
              className={[
                selectedParam ? 'pr-16' : '',
                'bg-slate-800 text-slate-100 placeholder:text-slate-500',
                nonConformant === true
                  ? 'border-red-600 focus-visible:ring-red-600'
                  : 'border-slate-700 focus-visible:ring-slate-500',
              ].join(' ')}
            />
            {selectedParam && (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
                {selectedParam.unit}
              </span>
            )}
          </div>
          {hasLimits && (
            <p className={`text-xs ${nonConformant === true ? 'text-red-400' : 'text-slate-500'}`}>
              {nonConformant === true ? 'Fora do limite CONAMA: ' : 'Limite CONAMA: '}
              {limitLabel}
            </p>
          )}
          {state.fieldErrors?.value && (
            <p className="text-xs text-red-400">{state.fieldErrors.value[0]}</p>
          )}
        </div>

        {/* ── Data/hora da coleta ────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="collected_at" className="text-sm font-medium text-slate-300">
            Data/hora da coleta
          </label>
          <Input
            id="collected_at" name="collected_at"
            type="datetime-local"
            value={collectedAt}
            onChange={(e) => setCollectedAt(e.target.value)}
            disabled={isPending} required
            className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
          />
          {state.fieldErrors?.collected_at && (
            <p className="text-xs text-red-400">{state.fieldErrors.collected_at[0]}</p>
          )}
        </div>

        {/* ── Laudo (texto livre) ───────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="report_text" className="text-sm font-medium text-slate-300">
            Laudo <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <textarea
            id="report_text" name="report_text"
            rows={4}
            placeholder="Observações, condições de coleta, conclusões…"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            disabled={isPending}
            className="w-full resize-none rounded-md border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
          />
          {state.fieldErrors?.report_text && (
            <p className="text-xs text-red-400">{state.fieldErrors.report_text[0]}</p>
          )}
        </div>

        {/* ── Erro geral ─────────────────────────────────────────────────── */}
        {state.error && (
          <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        <Button
          type="submit" disabled={isPending}
          className="h-14 w-full bg-slate-100 text-slate-900 text-base hover:bg-white disabled:opacity-50"
        >
          {isPending ? 'Registrando…' : 'Registrar análise'}
        </Button>
      </form>
    </div>
  )
}

```

### `src/app/tecnico/analises/nova/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { AnalysisForm } from './analysis-form'

const TENANT_ID = 'default'

export default async function NovaAnalisePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const [collectionPoints, parameters, methods] = await Promise.all([
    prisma.collectionPoint.findMany({
      where:   { tenant_id: TENANT_ID, is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.qualityParameter.findMany({
      where:   { tenant_id: TENANT_ID, is_active: true },
      select:  { id: true, name: true, unit: true, min_limit: true, max_limit: true },
      orderBy: { name: 'asc' },
    }),
    prisma.analysisMethod.findMany({
      where:   { tenant_id: TENANT_ID, is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-4">
      <BackButton href="/tecnico/analises" label="Análises" />
      <AnalysisForm
        collectionPoints={collectionPoints}
        parameters={parameters}
        methods={methods}
      />
    </main>
  )
}

```

### `src/app/tecnico/dashboard/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const TENANT_ID = 'default'

export default async function TecnicoDashboard() {
  const session = await auth()
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [overdueCount, pendingAnalysesCount, openCorrectivesCount, nonConformCount] =
    await Promise.all([
      // Preventivas vencidas
      prisma.preventiveMaintenance.count({
        where: {
          tenant_id:      TENANT_ID,
          status:         'SCHEDULED',
          scheduled_date: { lt: today },
          equipment:      { is_active: true },
        },
      }),
      // Análises pendentes de aprovação (qualquer)
      prisma.analysis.count({
        where: { tenant_id: TENANT_ID, approved_by: null },
      }),
      // Corretivas em andamento
      prisma.correctiveMaintenance.count({
        where: { tenant_id: TENANT_ID, status: 'IN_PROGRESS' },
      }),
      // Não-conformidades em aberto (n.c. ainda sem aprovação)
      prisma.analysis.count({
        where: { tenant_id: TENANT_ID, is_non_conformant: true, approved_by: null },
      }),
    ])

  const SHORTCUTS = [
    { title: 'Análises',     desc: 'Registrar ou aprovar análises',          href: '/tecnico/analises'          },
    { title: 'Equipamentos', desc: 'Gerenciar preventivas e corretivas',     href: '/tecnico/equipamentos'      },
    { title: 'Ocorrências',  desc: 'Acompanhar e fechar ocorrências',        href: '/tecnico/ocorrencias'       },
    { title: 'Estoque',      desc: 'Registrar entradas de produtos químicos', href: '/tecnico/estoque'          },
    { title: 'Turnos',       desc: 'Instâncias de turno ativas',             href: '/tecnico/turnos/instancias' },
  ]

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Olá, {session.user.name?.split(' ')[0]}</h1>
          <p className="text-slate-400 text-sm mt-0.5">Painel do Técnico</p>
        </div>

        {/* Widgets de atenção — 2×2 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/tecnico/equipamentos"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              overdueCount > 0 ? 'border-red-900/60 bg-red-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', overdueCount > 0 ? 'text-red-400' : 'text-slate-200'].join(' ')}>
              {overdueCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Preventiva(s) vencida(s)</p>
          </Link>

          <Link
            href="/tecnico/analises"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              nonConformCount > 0 ? 'border-red-900/60 bg-red-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', nonConformCount > 0 ? 'text-red-400' : 'text-slate-200'].join(' ')}>
              {nonConformCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Não-conform. em aberto</p>
          </Link>

          <Link
            href="/tecnico/analises"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              pendingAnalysesCount > 0 ? 'border-amber-900/60 bg-amber-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', pendingAnalysesCount > 0 ? 'text-amber-400' : 'text-slate-200'].join(' ')}>
              {pendingAnalysesCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Análise(s) p/ aprovar</p>
          </Link>

          <Link
            href="/tecnico/equipamentos"
            className={[
              'rounded-xl border p-4 hover:bg-slate-800/60 transition-colors',
              openCorrectivesCount > 0 ? 'border-orange-900/60 bg-orange-950/20' : 'border-slate-800 bg-slate-900',
            ].join(' ')}
          >
            <p className={['text-2xl font-bold', openCorrectivesCount > 0 ? 'text-orange-400' : 'text-slate-200'].join(' ')}>
              {openCorrectivesCount}
            </p>
            <p className="text-xs text-slate-500 leading-snug mt-1">Corretiva(s) em andamento</p>
          </Link>
        </div>

        {/* Atalhos */}
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400">Atalhos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SHORTCUTS.map((s) => (
              <Link
                key={s.href}
                href={s.href}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800 transition-colors"
              >
                <p className="text-sm font-medium text-slate-200">{s.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
    </main>
  )
}

```

### `src/app/tecnico/equipamentos/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { addDays } from '@/lib/equipment-utils'

const TENANT_ID = 'default'

async function requireTechnicianOrManager() {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const EquipamentoSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  category_id: z.string().min(1, 'Selecione a categoria'),
  serial_number: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  location: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  installation_date: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  preventive_frequency_days: z.preprocess(
    (v) => {
      if (v === '' || v == null) return null
      const n = parseInt(String(v), 10)
      return isNaN(n) ? null : n
    },
    z.number({ error: 'Informe a frequência em dias' }).int().min(1, 'Mínimo de 1 dia'),
  ),
})

const CorretivaSchema = z.object({
  description: z.string().min(5, 'Descreva o problema em pelo menos 5 caracteres'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], {
    error: 'Selecione a prioridade',
  }),
  start_date: z.string().min(1, 'Informe a data de início'),
  notes: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(2000).nullable(),
  ),
  estimated_cost: z.preprocess(
    (v) => {
      if (v === '' || v == null) return null
      const n = parseFloat(String(v))
      return isNaN(n) ? null : String(n)
    },
    z.string().nullable(),
  ),
})

// ─── Form state types ─────────────────────────────────────────────────────────

export type EquipamentoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

export type CorretivaFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Equipamento: criar ───────────────────────────────────────────────────────

export async function criarEquipamento(
  _prev: EquipamentoFormState,
  formData: FormData,
): Promise<EquipamentoFormState> {
  const session = await requireTechnicianOrManager()

  const parsed = EquipamentoSchema.safeParse({
    name:                      formData.get('name'),
    category_id:               formData.get('category_id'),
    serial_number:             formData.get('serial_number'),
    location:                  formData.get('location'),
    installation_date:         formData.get('installation_date'),
    preventive_frequency_days: formData.get('preventive_frequency_days'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const firstScheduledDate = addDays(new Date(), parsed.data.preventive_frequency_days)

  // Cria equipamento e primeira preventiva na mesma transação
  await prisma.$transaction(async (tx) => {
    const equipment = await tx.equipment.create({
      data: {
        tenant_id:                 TENANT_ID,
        name:                      parsed.data.name,
        category_id:               parsed.data.category_id,
        serial_number:             parsed.data.serial_number,
        location:                  parsed.data.location,
        installation_date:         parsed.data.installation_date
          ? new Date(parsed.data.installation_date)
          : null,
        preventive_frequency_days: parsed.data.preventive_frequency_days,
        is_active:                 true,
        created_by:                userId,
      },
    })

    await tx.preventiveMaintenance.create({
      data: {
        tenant_id:      TENANT_ID,
        equipment_id:   equipment.id,
        scheduled_date: firstScheduledDate,
        status:         'SCHEDULED',
      },
    })
  })

  revalidatePath('/tecnico/equipamentos')
  return { success: true }
}

// ─── Equipamento: editar ──────────────────────────────────────────────────────
// Alterar a frequência NÃO reagenda a preventiva já existente.

export async function editarEquipamento(
  equipamentoId: string,
  _prev: EquipamentoFormState,
  formData: FormData,
): Promise<EquipamentoFormState> {
  await requireTechnicianOrManager()

  const parsed = EquipamentoSchema.safeParse({
    name:                      formData.get('name'),
    category_id:               formData.get('category_id'),
    serial_number:             formData.get('serial_number'),
    location:                  formData.get('location'),
    installation_date:         formData.get('installation_date'),
    preventive_frequency_days: formData.get('preventive_frequency_days'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const equipment = await prisma.equipment.findUnique({
    where:  { id: equipamentoId },
    select: { id: true },
  })
  if (!equipment) return { error: 'Equipamento não encontrado.' }

  await prisma.equipment.update({
    where: { id: equipamentoId },
    data: {
      name:                      parsed.data.name,
      category_id:               parsed.data.category_id,
      serial_number:             parsed.data.serial_number,
      location:                  parsed.data.location,
      installation_date:         parsed.data.installation_date
        ? new Date(parsed.data.installation_date)
        : null,
      preventive_frequency_days: parsed.data.preventive_frequency_days,
    },
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  return { success: true }
}

// ─── Equipamento: toggle ativo ────────────────────────────────────────────────

export async function toggleAtivoEquipamento(
  equipamentoId: string,
): Promise<{ error?: string }> {
  await requireTechnicianOrManager()

  const equipment = await prisma.equipment.findUnique({
    where:  { id: equipamentoId },
    select: { is_active: true },
  })
  if (!equipment) return { error: 'Equipamento não encontrado.' }

  await prisma.equipment.update({
    where: { id: equipamentoId },
    data:  { is_active: !equipment.is_active },
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  return {}
}

// ─── Preventiva: concluir e agendar a próxima ─────────────────────────────────

export async function concluirPreventiva(
  preventivaId: string,
): Promise<{ error?: string }> {
  const session = await requireTechnicianOrManager()

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const preventiva = await prisma.preventiveMaintenance.findUnique({
    where:   { id: preventivaId },
    include: { equipment: { select: { id: true, preventive_frequency_days: true } } },
  })
  if (!preventiva)                    return { error: 'Preventiva não encontrada.' }
  if (preventiva.status === 'COMPLETED') return { error: 'Preventiva já concluída.' }

  const completedDate = new Date()
  const nextScheduledDate = addDays(completedDate, preventiva.equipment.preventive_frequency_days)

  await prisma.$transaction(async (tx) => {
    await tx.preventiveMaintenance.update({
      where: { id: preventivaId },
      data: {
        status:         'COMPLETED',
        completed_date: completedDate,
        completed_by:   userId,
      },
    })

    await tx.preventiveMaintenance.create({
      data: {
        tenant_id:      TENANT_ID,
        equipment_id:   preventiva.equipment.id,
        scheduled_date: nextScheduledDate,
        status:         'SCHEDULED',
      },
    })
  })

  revalidatePath('/tecnico/equipamentos')
  revalidatePath(`/tecnico/equipamentos/${preventiva.equipment.id}`)
  return {}
}

// ─── Corretiva: registrar ─────────────────────────────────────────────────────

export async function registrarCorretiva(
  equipamentoId: string,
  _prev: CorretivaFormState,
  formData: FormData,
): Promise<CorretivaFormState> {
  const session = await requireTechnicianOrManager()

  const parsed = CorretivaSchema.safeParse({
    description:    formData.get('description'),
    priority:       formData.get('priority'),
    start_date:     formData.get('start_date'),
    notes:          formData.get('notes'),
    estimated_cost: formData.get('estimated_cost'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  await prisma.correctiveMaintenance.create({
    data: {
      tenant_id:      TENANT_ID,
      equipment_id:   equipamentoId,
      description:    parsed.data.description,
      responsible_id: userId,        // auto-preenche com o usuário logado
      priority:       parsed.data.priority,
      start_date:     new Date(parsed.data.start_date),
      status:         'IN_PROGRESS',
      notes:          parsed.data.notes,
      estimated_cost: parsed.data.estimated_cost ?? undefined,
    },
  })

  revalidatePath(`/tecnico/equipamentos/${equipamentoId}`)
  return { success: true }
}

// ─── Corretiva: concluir ou cancelar ─────────────────────────────────────────

export async function atualizarStatusCorretiva(
  corretivaId: string,
  status: 'COMPLETED' | 'CANCELLED',
): Promise<{ error?: string }> {
  await requireTechnicianOrManager()

  const corretiva = await prisma.correctiveMaintenance.findUnique({
    where:  { id: corretivaId },
    select: { status: true, equipment_id: true },
  })
  if (!corretiva)                      return { error: 'Corretiva não encontrada.' }
  if (corretiva.status !== 'IN_PROGRESS') return { error: 'Corretiva já encerrada.' }

  await prisma.correctiveMaintenance.update({
    where: { id: corretivaId },
    data: {
      status,
      end_date: status === 'COMPLETED' ? new Date() : undefined,
    },
  })

  revalidatePath(`/tecnico/equipamentos/${corretiva.equipment_id}`)
  return {}
}

```

### `src/app/tecnico/equipamentos/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const TENANT_ID = 'default'
const PAGE_SIZE = 20

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function EquipamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; inactive?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, q, inactive } = await searchParams
  const page      = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip      = (page - 1) * PAGE_SIZE
  const showAll   = inactive === '1'
  const search    = q?.trim() ?? ''

  const where = {
    tenant_id: TENANT_ID,
    ...(showAll ? {} : { is_active: true }),
    ...(search ? { name: { contains: search } } : {}),
  }

  const [equipamentos, total] = await Promise.all([
    prisma.equipment.findMany({
      where,
      include: {
        category: { select: { name: true } },
        preventive_maintenances: {
          where:   { status: 'SCHEDULED' },
          orderBy: { scheduled_date: 'asc' },
          take:    1,
          select:  { scheduled_date: true },
        },
      },
      orderBy: { name: 'asc' },
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.equipment.count({ where }),
  ])

  const today      = new Date()
  today.setHours(0, 0, 0, 0)
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Equipamentos</h1>
            <p className="text-xs text-slate-400">{total} registro(s)</p>
          </div>
          <Link href="/tecnico/equipamentos/novo">
            <Button className="bg-slate-100 text-slate-900 hover:bg-white text-xs h-8">
              + Novo
            </Button>
          </Link>
        </div>

        {/* Filtros */}
        <form method="GET" className="flex flex-wrap gap-2 items-end">
          <input
            name="q"
            defaultValue={search}
            placeholder="Buscar equipamento…"
            className="flex-1 min-w-40 rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              name="inactive"
              value="1"
              defaultChecked={showAll}
              className="accent-slate-400"
            />
            Ver inativos
          </label>
          <button
            type="submit"
            className="h-9 rounded-md border border-slate-700 bg-slate-800 px-4 text-sm text-slate-300 hover:bg-slate-700"
          >
            Buscar
          </button>
        </form>

        {/* Lista */}
        {equipamentos.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
            Nenhum equipamento encontrado.
          </div>
        ) : (
          <div className="space-y-3">
            {equipamentos.map((eq) => {
              const nextPreventive = eq.preventive_maintenances[0] ?? null
              const isOverdue = nextPreventive
                ? new Date(nextPreventive.scheduled_date) < today
                : false

              return (
                <Link
                  key={eq.id}
                  href={`/tecnico/equipamentos/${eq.id}`}
                  className={[
                    'block rounded-xl border bg-slate-900 p-4 hover:bg-slate-800 transition-colors',
                    isOverdue ? 'border-red-900/60' : 'border-slate-800',
                  ].join(' ')}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-100 truncate">{eq.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {eq.category.name}
                        {eq.location ? ` · ${eq.location}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {!eq.is_active && (
                        <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                          Inativo
                        </span>
                      )}
                      {isOverdue && (
                        <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                          Preventiva vencida
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-600">
                    Próxima preventiva:{' '}
                    <span className={isOverdue ? 'text-red-400 font-medium' : 'text-slate-400'}>
                      {nextPreventive ? formatDate(new Date(nextPreventive.scheduled_date)) : 'Nenhuma agendada'}
                    </span>
                  </p>
                </Link>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link
                href={`/tecnico/equipamentos?page=${page - 1}${search ? `&q=${encodeURIComponent(search)}` : ''}${showAll ? '&inactive=1' : ''}`}
                className="text-slate-400 hover:text-slate-200"
              >
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link
                href={`/tecnico/equipamentos?page=${page + 1}${search ? `&q=${encodeURIComponent(search)}` : ''}${showAll ? '&inactive=1' : ''}`}
                className="text-slate-400 hover:text-slate-200"
              >
                Próxima →
              </Link>
            ) : <span />}
          </div>
        )}

    </main>
  )
}

```

### `src/app/tecnico/equipamentos/[id]/conclude-button.tsx`
```tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { concluirPreventiva } from '../actions'
import { Button } from '@/components/ui/button'

export function ConcludeButton({ preventivaId }: { preventivaId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleConcluir() {
    startTransition(async () => {
      const result = await concluirPreventiva(preventivaId)
      if (!result.error) router.refresh()
    })
  }

  return (
    <Button
      onClick={handleConcluir}
      disabled={isPending}
      className="h-10 text-xs bg-green-900/60 text-green-300 hover:bg-green-900 border border-green-900/50 disabled:opacity-50"
    >
      {isPending ? 'Concluindo…' : 'Concluir'}
    </Button>
  )
}

```

### `src/app/tecnico/equipamentos/[id]/corrective-form.tsx`
```tsx
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { registrarCorretiva, type CorretivaFormState } from '../actions'
import { Button } from '@/components/ui/button'

const INITIAL: CorretivaFormState = {}

export function CorrectiveForm({ equipamentoId }: { equipamentoId: string }) {
  const router = useRouter()
  const boundAction = registrarCorretiva.bind(null, equipamentoId)
  const [state, action, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  return (
    <form action={action} className="space-y-3 pt-3 border-t border-slate-800">
      <h3 className="text-sm font-medium text-slate-300">Registrar corretiva</h3>

      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Descrição */}
      <div className="space-y-1">
        <label htmlFor="description" className="text-xs font-medium text-slate-400">Descrição do problema *</label>
        <textarea
          id="description" name="description" rows={3}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Descreva o problema observado…"
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-400">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Prioridade */}
        <div className="space-y-1">
          <label htmlFor="priority" className="text-xs font-medium text-slate-400">Prioridade *</label>
          <select
            id="priority" name="priority"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Selecione…</option>
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
          {state.fieldErrors?.priority && (
            <p className="text-xs text-red-400">{state.fieldErrors.priority[0]}</p>
          )}
        </div>

        {/* Data de início */}
        <div className="space-y-1">
          <label htmlFor="start_date" className="text-xs font-medium text-slate-400">Data de início *</label>
          <input
            id="start_date" name="start_date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          {state.fieldErrors?.start_date && (
            <p className="text-xs text-red-400">{state.fieldErrors.start_date[0]}</p>
          )}
        </div>
      </div>

      {/* Custo estimado */}
      <div className="space-y-1">
        <label htmlFor="estimated_cost" className="text-xs font-medium text-slate-400">
          Custo estimado (R$) <span className="text-slate-600 font-normal">— opcional</span>
        </label>
        <input
          id="estimated_cost" name="estimated_cost"
          type="number" step="0.01" min="0"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="0,00"
        />
      </div>

      {/* Observações */}
      <div className="space-y-1">
        <label htmlFor="notes" className="text-xs font-medium text-slate-400">
          Observações <span className="text-slate-600 font-normal">— opcional</span>
        </label>
        <textarea
          id="notes" name="notes" rows={2}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Informações adicionais…"
        />
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-10 w-full bg-slate-100 text-slate-900 hover:bg-white text-sm disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Registrar corretiva'}
      </Button>
    </form>
  )
}

```

### `src/app/tecnico/equipamentos/[id]/edit-form.tsx`
```tsx
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { editarEquipamento, type EquipamentoFormState } from '../actions'
import { Button } from '@/components/ui/button'

type Category = { id: string; name: string }

type Equipment = {
  id:                        string
  name:                      string
  category_id:               string
  serial_number:             string | null
  location:                  string | null
  installation_date:         Date | null
  preventive_frequency_days: number
  is_active:                 boolean
}

const INITIAL: EquipamentoFormState = {}

export function EditForm({
  equipment,
  categories,
}: {
  equipment:  Equipment
  categories: Category[]
}) {
  const router      = useRouter()
  const boundAction = editarEquipamento.bind(null, equipment.id)
  const [state, action, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  const installDate = equipment.installation_date
    ? new Date(equipment.installation_date).toISOString().split('T')[0]
    : ''

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="rounded-md border border-green-900/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">
          Equipamento atualizado com sucesso.
        </p>
      )}

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="edit-name" className="text-sm font-medium text-slate-300">Nome *</label>
        <input
          id="edit-name" name="name"
          defaultValue={equipment.name}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <label htmlFor="edit-category_id" className="text-sm font-medium text-slate-300">Categoria *</label>
        <select
          id="edit-category_id" name="category_id"
          defaultValue={equipment.category_id}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {state.fieldErrors?.category_id && (
          <p className="text-xs text-red-400">{state.fieldErrors.category_id[0]}</p>
        )}
      </div>

      {/* Número de série */}
      <div className="space-y-1.5">
        <label htmlFor="edit-serial_number" className="text-sm font-medium text-slate-300">
          Número de série <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="edit-serial_number" name="serial_number"
          defaultValue={equipment.serial_number ?? ''}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Localização */}
      <div className="space-y-1.5">
        <label htmlFor="edit-location" className="text-sm font-medium text-slate-300">
          Localização <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="edit-location" name="location"
          defaultValue={equipment.location ?? ''}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Data de instalação */}
      <div className="space-y-1.5">
        <label htmlFor="edit-installation_date" className="text-sm font-medium text-slate-300">
          Data de instalação <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="edit-installation_date" name="installation_date"
          type="date"
          defaultValue={installDate}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Frequência */}
      <div className="space-y-1.5">
        <label htmlFor="edit-freq" className="text-sm font-medium text-slate-300">
          Frequência preventiva (dias) *
        </label>
        <input
          id="edit-freq" name="preventive_frequency_days"
          type="number" min="1"
          defaultValue={equipment.preventive_frequency_days}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {state.fieldErrors?.preventive_frequency_days && (
          <p className="text-xs text-red-400">{state.fieldErrors.preventive_frequency_days[0]}</p>
        )}
        <p className="text-xs text-slate-500">Alterar a frequência não reagenda a preventiva já existente.</p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  )
}

```

### `src/app/tecnico/equipamentos/[id]/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { ConcludeButton } from './conclude-button'
import { StatusButton } from './status-button'
import { CorrectiveForm } from './corrective-form'
import { EditForm } from './edit-form'
import { ToggleButton } from './toggle-button'

const TENANT_ID = 'default'

function formatDate(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const PRIORITY_LABEL: Record<string, string> = {
  LOW:      'Baixa',
  MEDIUM:   'Média',
  HIGH:     'Alta',
  CRITICAL: 'Crítica',
}

const PRIORITY_COLOR: Record<string, string> = {
  LOW:      'text-slate-400',
  MEDIUM:   'text-amber-400',
  HIGH:     'text-orange-400',
  CRITICAL: 'text-red-400',
}

export default async function EquipamentoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const equipment = await prisma.equipment.findUnique({
    where:   { id },
    include: {
      category: { select: { name: true } },
      preventive_maintenances: {
        orderBy: { scheduled_date: 'desc' },
        take:    10,
        select:  { id: true, scheduled_date: true, status: true, completed_date: true },
      },
      corrective_maintenances: {
        orderBy: { start_date: 'desc' },
        take:    10,
        include: { responsible: { select: { name: true } } },
      },
    },
  })

  if (!equipment || equipment.tenant_id !== TENANT_ID) notFound()

  const today    = new Date()
  today.setHours(0, 0, 0, 0)
  const nextScheduled = equipment.preventive_maintenances.find(
    (p) => p.status === 'SCHEDULED',
  ) ?? null
  const isOverdue = nextScheduled
    ? new Date(nextScheduled.scheduled_date) < today
    : false

  const categories = await prisma.equipmentCategory.findMany({
    where:   { tenant_id: TENANT_ID, is_active: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
        <div>
          <BackButton href="/tecnico/equipamentos" label="Equipamentos" />
          <h1 className="text-xl font-semibold truncate mt-1">{equipment.name}</h1>
        </div>

        {/* Cabeçalho do equipamento */}
        <div className={[
          'rounded-xl border bg-slate-900 p-4 space-y-3',
          isOverdue ? 'border-red-900/60' : 'border-slate-800',
        ].join(' ')}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-base font-semibold">{equipment.name}</p>
              <p className="text-sm text-slate-400">{equipment.category.name}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!equipment.is_active && (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                  Inativo
                </span>
              )}
              {isOverdue && (
                <span className="rounded px-2 py-0.5 text-xs font-medium bg-red-950/60 text-red-400 border border-red-900/50">
                  Preventiva vencida
                </span>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <dt className="text-slate-500">Nº série</dt>
              <dd className="text-slate-300">{equipment.serial_number ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Localização</dt>
              <dd className="text-slate-300">{equipment.location ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Instalação</dt>
              <dd className="text-slate-300">{formatDate(equipment.installation_date)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Freq. preventiva</dt>
              <dd className="text-slate-300">{equipment.preventive_frequency_days} dias</dd>
            </div>
            <div>
              <dt className="text-slate-500">Próxima preventiva</dt>
              <dd className={isOverdue ? 'text-red-400 font-medium' : 'text-slate-300'}>
                {nextScheduled ? formatDate(new Date(nextScheduled.scheduled_date)) : '—'}
              </dd>
            </div>
          </dl>

          <div className="flex justify-end">
            <ToggleButton equipamentoId={equipment.id} isActive={equipment.is_active} />
          </div>
        </div>

        {/* Manutenções preventivas */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Preventivas</h2>
          {equipment.preventive_maintenances.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma preventiva registrada.</p>
          ) : (
            <div className="space-y-2">
              {equipment.preventive_maintenances.map((p) => {
                const overdue =
                  p.status === 'SCHEDULED' && new Date(p.scheduled_date) < today
                return (
                  <div
                    key={p.id}
                    className={[
                      'rounded-lg border bg-slate-900 px-4 py-3 flex items-center justify-between gap-2',
                      overdue ? 'border-red-900/60' : 'border-slate-800',
                    ].join(' ')}
                  >
                    <div>
                      <p className={['text-sm font-medium', overdue ? 'text-red-400' : 'text-slate-200'].join(' ')}>
                        {formatDate(new Date(p.scheduled_date))}
                        {overdue && ' — vencida'}
                      </p>
                      {p.status === 'COMPLETED' && p.completed_date && (
                        <p className="text-xs text-slate-500">
                          Concluída em {formatDate(new Date(p.completed_date))}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {p.status === 'COMPLETED' ? (
                        <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                          Concluída
                        </span>
                      ) : (
                        <ConcludeButton preventivaId={p.id} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Manutenções corretivas */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Corretivas</h2>

          {equipment.corrective_maintenances.length > 0 && (
            <div className="space-y-2">
              {equipment.corrective_maintenances.map((c) => (
                <div
                  key={c.id}
                  className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-200 leading-snug">{c.description}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {formatDate(c.start_date)} · {c.responsible.name}
                      </p>
                    </div>
                    <span className={['text-xs font-medium shrink-0', c.priority ? (PRIORITY_COLOR[c.priority] ?? 'text-slate-400') : 'text-slate-400'].join(' ')}>
                      {c.priority ? (PRIORITY_LABEL[c.priority] ?? c.priority) : '—'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {c.status === 'IN_PROGRESS' ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-amber-950/60 text-amber-400 border border-amber-900/50">
                        Em andamento
                      </span>
                    ) : c.status === 'COMPLETED' ? (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-green-950/60 text-green-400 border border-green-900/50">
                        Concluída
                      </span>
                    ) : (
                      <span className="rounded px-2 py-0.5 text-xs font-medium bg-slate-800 text-slate-500 border border-slate-700">
                        Cancelada
                      </span>
                    )}

                    {c.status === 'IN_PROGRESS' && (
                      <div className="flex gap-2">
                        <StatusButton corretivaId={c.id} action="COMPLETED" />
                        <StatusButton corretivaId={c.id} action="CANCELLED" />
                      </div>
                    )}
                  </div>

                  {c.notes && (
                    <p className="text-xs text-slate-500 border-t border-slate-800 pt-2">{c.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Formulário de nova corretiva — só se equipamento ativo */}
          {equipment.is_active && (
            <CorrectiveForm equipamentoId={equipment.id} />
          )}
        </section>

        {/* Editar equipamento */}
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Editar dados</h2>
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <EditForm
              equipment={{
                id:                        equipment.id,
                name:                      equipment.name,
                category_id:               equipment.category_id,
                serial_number:             equipment.serial_number,
                location:                  equipment.location,
                installation_date:         equipment.installation_date,
                preventive_frequency_days: equipment.preventive_frequency_days,
                is_active:                 equipment.is_active,
              }}
              categories={categories}
            />
          </div>
        </section>
    </main>
  )
}

```

### `src/app/tecnico/equipamentos/[id]/status-button.tsx`
```tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarStatusCorretiva } from '../actions'
import { Button } from '@/components/ui/button'

export function StatusButton({
  corretivaId,
  action,
}: {
  corretivaId: string
  action: 'COMPLETED' | 'CANCELLED'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await atualizarStatusCorretiva(corretivaId, action)
      if (!result.error) router.refresh()
    })
  }

  const isComplete = action === 'COMPLETED'

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className={[
        'h-10 text-xs border disabled:opacity-50',
        isComplete
          ? 'bg-green-900/60 text-green-300 hover:bg-green-900 border-green-900/50'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700',
      ].join(' ')}
    >
      {isPending
        ? '…'
        : isComplete ? 'Concluir' : 'Cancelar'}
    </Button>
  )
}

```

### `src/app/tecnico/equipamentos/[id]/toggle-button.tsx`
```tsx
'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleAtivoEquipamento } from '../actions'
import { Button } from '@/components/ui/button'

export function ToggleButton({
  equipamentoId,
  isActive,
}: {
  equipamentoId: string
  isActive:      boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleAtivoEquipamento(equipamentoId)
      if (!result.error) router.refresh()
    })
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={isPending}
      className={[
        'h-10 text-xs border disabled:opacity-50',
        isActive
          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700'
          : 'bg-green-900/40 text-green-400 hover:bg-green-900/60 border-green-900/50',
      ].join(' ')}
    >
      {isPending ? '…' : isActive ? 'Desativar' : 'Reativar'}
    </Button>
  )
}

```

### `src/app/tecnico/equipamentos/novo/equipment-form.tsx`
```tsx
'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { criarEquipamento, type EquipamentoFormState } from '../actions'
import { Button } from '@/components/ui/button'

type Category = { id: string; name: string }

const DRAFT_KEY = 'equipment_draft'
const INITIAL: EquipamentoFormState = {}

export function EquipmentForm({ categories }: { categories: Category[] }) {
  const router  = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, isPending] = useActionState(criarEquipamento, INITIAL)

  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/tecnico/equipamentos')
    }
  }, [state.success, router])

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome *</label>
        <input
          id="name" name="name"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Ex.: Bomba de recalque 1"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <label htmlFor="category_id" className="text-sm font-medium text-slate-300">Categoria *</label>
        <select
          id="category_id" name="category_id"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Selecione…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {state.fieldErrors?.category_id && (
          <p className="text-xs text-red-400">{state.fieldErrors.category_id[0]}</p>
        )}
      </div>

      {/* Número de série */}
      <div className="space-y-1.5">
        <label htmlFor="serial_number" className="text-sm font-medium text-slate-300">
          Número de série <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="serial_number" name="serial_number"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="SN-XXXXX"
        />
      </div>

      {/* Localização */}
      <div className="space-y-1.5">
        <label htmlFor="location" className="text-sm font-medium text-slate-300">
          Localização <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="location" name="location"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Ex.: Sala de bombas"
        />
      </div>

      {/* Data de instalação */}
      <div className="space-y-1.5">
        <label htmlFor="installation_date" className="text-sm font-medium text-slate-300">
          Data de instalação <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="installation_date" name="installation_date"
          type="date"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Frequência preventiva */}
      <div className="space-y-1.5">
        <label htmlFor="preventive_frequency_days" className="text-sm font-medium text-slate-300">
          Frequência de manutenção preventiva (dias) *
        </label>
        <input
          id="preventive_frequency_days" name="preventive_frequency_days"
          type="number" min="1"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Ex.: 30"
        />
        {state.fieldErrors?.preventive_frequency_days && (
          <p className="text-xs text-red-400">{state.fieldErrors.preventive_frequency_days[0]}</p>
        )}
        <p className="text-xs text-slate-500">A primeira preventiva será agendada para hoje + este número de dias.</p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-12 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Cadastrar equipamento'}
      </Button>
    </form>
  )
}

```

### `src/app/tecnico/equipamentos/novo/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { EquipmentForm } from './equipment-form'

const TENANT_ID = 'default'

export default async function NovoEquipamentoPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const categories = await prisma.equipmentCategory.findMany({
    where:   { tenant_id: TENANT_ID, is_active: true },
    select:  { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <div>
        <BackButton href="/tecnico/equipamentos" label="Equipamentos" />
        <h1 className="text-xl font-semibold mt-1">Novo equipamento</h1>
      </div>

      <EquipmentForm categories={categories} />
    </main>
  )
}

```

### `src/app/tecnico/estoque/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { calcularEstoqueAtual, estaAbaixoMinimo, formatarQuantidade } from '@/lib/stock-utils'

const TENANT_ID = 'default'

export default async function TecnicoEstoquePage() {
  const session = await auth()
  if (!session) redirect('/login')

  const products = await prisma.chemicalProduct.findMany({
    where:   { tenant_id: TENANT_ID, is_active: true },
    orderBy: { name: 'asc' },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Estoque de Produtos Químicos</h1>
        <p className="text-sm text-slate-400">
          Registre entradas de compra ou recebimento. Para saídas e contagens, use o Operador.
        </p>

        {products.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum produto ativo cadastrado.</p>
        ) : (
          <div className="space-y-2">
            {products.map((p) => {
              const calculado = calcularEstoqueAtual(
                p.entries.reduce((s, e) => s + e.quantity, 0),
                p.exits.reduce((s, e) => s + e.quantity, 0),
              )
              const fisico  = p.counts[0]?.counted_quantity ?? null
              const alerta  = estaAbaixoMinimo(calculado, fisico, p.min_stock)

              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-4 flex items-center justify-between gap-4 ${
                    alerta ? 'border-red-800/60 bg-slate-900' : 'border-slate-700 bg-slate-900'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-100">{p.name}</span>
                      {alerta && (
                        <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                          ESTOQUE BAIXO
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Calculado: {formatarQuantidade(calculado)} {p.unit}
                      {fisico !== null && ` · Físico: ${formatarQuantidade(fisico)} ${p.unit}`}
                      {` · Mínimo: ${formatarQuantidade(p.min_stock)} ${p.unit}`}
                    </p>
                  </div>
                  <Link
                    href={`/tecnico/estoque/${p.id}/entrada`}
                    className="shrink-0 rounded-md bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-600 transition-colors"
                  >
                    + Entrada
                  </Link>
                </div>
              )
            })}
          </div>
        )}
    </main>
  )
}

```

### `src/app/tecnico/estoque/[id]/entrada/entry-form.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarEntrada } from '@/app/gestor/produtos-quimicos/actions'

type Props = { productId: string; productName: string; unit: string }

export function TecnicoEntryForm({ productId, productName, unit }: Props) {
  const router = useRouter()
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarEntrada(prev, formData)
    if (result?.success) router.push('/tecnico/estoque')
    return result
  }, null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      {state?.error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="rounded-md bg-slate-800/50 px-4 py-2 text-sm text-slate-400">
        Produto: <span className="text-slate-200 font-medium">{productName}</span>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Quantidade recebida ({unit}) *</label>
        <input
          name="quantity"
          type="number"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Data de recebimento *</label>
        <input
          name="received_at"
          type="datetime-local"
          required
          defaultValue={defaultDate}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Fornecedor</label>
        <input
          name="supplier"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nome do fornecedor"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Número da nota fiscal</label>
        <input
          name="invoice_number"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="NF-e 00000"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Observações</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Lote, validade, condições do recebimento..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Registrando...' : 'Confirmar entrada'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/tecnico/estoque')}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

```

### `src/app/tecnico/estoque/[id]/entrada/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { TecnicoEntryForm } from './entry-form'

const TENANT_ID = 'default'

export default async function TecnicoEntradaPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where: { id, tenant_id: TENANT_ID, is_active: true },
    select: { id: true, name: true, unit: true },
  })

  if (!product) notFound()

  return (
    <main className="p-6 max-w-lg mx-auto space-y-5">
      <div>
        <BackButton href="/tecnico/estoque" label="Estoque" />
        <h1 className="text-base font-semibold mt-1">Registrar Entrada — {product.name}</h1>
      </div>
      <TecnicoEntryForm productId={product.id} productName={product.name} unit={product.unit} />
    </main>
  )
}

```

### `src/app/tecnico/ocorrencias/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

const TENANT_ID = 'default'

async function requireTechnicianOrManager() {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

const ResolucaoSchema = z.object({
  resolution_notes: z.string().min(5, 'Descreva a resolução em pelo menos 5 caracteres'),
})

export type ResolucaoFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Resolver ocorrência ──────────────────────────────────────────────────────

export async function resolverOcorrencia(
  ocorrenciaId: string,
  _prev: ResolucaoFormState,
  formData: FormData,
): Promise<ResolucaoFormState> {
  const session = await requireTechnicianOrManager()

  const parsed = ResolucaoSchema.safeParse({
    resolution_notes: formData.get('resolution_notes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const occurrence = await prisma.occurrence.findUnique({
    where:  { id: ocorrenciaId },
    select: { status: true, severity: true },
  })
  if (!occurrence)                        return { error: 'Ocorrência não encontrada.' }
  if (occurrence.status === 'RESOLVED')   return { error: 'Ocorrência já encerrada.' }

  const now = new Date()
  await prisma.$transaction(async (tx) => {
    await tx.occurrence.update({
      where: { id: ocorrenciaId },
      data: {
        status:           'RESOLVED',
        resolved_at:      now,
        resolved_by:      userId,
        resolution_notes: parsed.data.resolution_notes,
      },
    })
    await logAudit(tx, {
      userId,
      action:    'UPDATE',
      tableName: 'occurrences',
      recordId:  ocorrenciaId,
      before:    { status: occurrence.status },
      after:     { status: 'RESOLVED', resolved_by: userId, resolution_notes: parsed.data.resolution_notes },
    })
  })

  revalidatePath('/tecnico/ocorrencias')
  revalidatePath(`/tecnico/ocorrencias/${ocorrenciaId}`)
  revalidatePath('/operador/ocorrencias')
  return { success: true }
}

```

### `src/app/tecnico/ocorrencias/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const TENANT_ID = 'default'
const PAGE_SIZE  = 20

const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
}
const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'bg-slate-800 text-slate-400 border-slate-700',
  MEDIUM:   'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH:     'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50',
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OcorrenciasTecnicoPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { page: pageParam, status: statusFilter } = await searchParams
  const page      = Math.max(1, parseInt(pageParam ?? '1', 10) || 1)
  const skip      = (page - 1) * PAGE_SIZE
  const showAll   = statusFilter === 'all'

  const where = {
    tenant_id: TENANT_ID,
    ...(showAll ? {} : { status: { in: ['OPEN', 'IN_PROGRESS'] } }),
  }

  const [ocorrencias, total] = await Promise.all([
    prisma.occurrence.findMany({
      where,
      include: {
        reporter: { select: { name: true } },
        photos:   { select: { id: true }, take: 1 },
      },
      orderBy: [{ status: 'asc' }, { deadline: 'asc' }],
      take:    PAGE_SIZE,
      skip,
    }),
    prisma.occurrence.count({ where }),
  ])

  const now        = new Date()
  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-xl font-semibold">Ocorrências</h1>
            <p className="text-xs text-slate-400">{total} registro(s)</p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/tecnico/ocorrencias"
              className={[
                'rounded-md border px-3 py-1.5 text-xs',
                !showAll
                  ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
              ].join(' ')}
            >
              Em aberto
            </Link>
            <Link
              href="/tecnico/ocorrencias?status=all"
              className={[
                'rounded-md border px-3 py-1.5 text-xs',
                showAll
                  ? 'border-sky-700 bg-sky-900/40 text-sky-400'
                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700',
              ].join(' ')}
            >
              Todas
            </Link>
          </div>
        </div>

        {/* Lista */}
        {ocorrencias.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-14 text-center text-sm text-slate-500">
            Nenhuma ocorrência encontrada.
          </div>
        ) : (
          <div className="space-y-3">
            {ocorrencias.map((oc) => {
              const prazoVencido = oc.status !== 'RESOLVED' && new Date(oc.deadline) < now
              const hasPhoto     = oc.photos.length > 0

              return (
                <Link
                  key={oc.id}
                  href={`/tecnico/ocorrencias/${oc.id}`}
                  className={[
                    'block rounded-xl border bg-slate-900 p-4 space-y-2 hover:bg-slate-800 transition-colors',
                    prazoVencido ? 'border-red-900/60' : 'border-slate-800',
                  ].join(' ')}
                >
                  {/* Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[oc.severity] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                      {SEVERITY_LABEL[oc.severity] ?? oc.severity}
                    </span>
                    {prazoVencido && (
                      <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                        PRAZO VENCIDO
                      </span>
                    )}
                    {oc.status === 'RESOLVED' && (
                      <span className="rounded border border-green-900/50 bg-green-950/60 px-2 py-0.5 text-xs font-medium text-green-400">
                        Resolvida
                      </span>
                    )}
                    {hasPhoto && (
                      <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-500">
                        Com foto
                      </span>
                    )}
                  </div>

                  {/* Descrição */}
                  <p className="text-sm text-slate-200 line-clamp-2">{oc.description}</p>

                  {/* Rodapé */}
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{oc.reporter.name} · {formatDatetime(oc.created_at)}</span>
                    <span className={prazoVencido ? 'text-red-400 font-medium' : ''}>
                      {formatDatetime(oc.deadline)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 text-sm">
            {page > 1 ? (
              <Link
                href={`/tecnico/ocorrencias?page=${page - 1}${showAll ? '&status=all' : ''}`}
                className="text-slate-400 hover:text-slate-200"
              >
                ← Anterior
              </Link>
            ) : <span />}
            <span className="text-xs text-slate-600">Página {page} de {totalPages}</span>
            {page < totalPages ? (
              <Link
                href={`/tecnico/ocorrencias?page=${page + 1}${showAll ? '&status=all' : ''}`}
                className="text-slate-400 hover:text-slate-200"
              >
                Próxima →
              </Link>
            ) : <span />}
          </div>
        )}

    </main>
  )
}

```

### `src/app/tecnico/ocorrencias/[id]/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import { ResolveForm } from './resolve-form'

const TENANT_ID = 'default'

const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Baixa', MEDIUM: 'Média', HIGH: 'Alta', CRITICAL: 'Crítica',
}
const SEVERITY_COLOR: Record<string, string> = {
  LOW:      'bg-slate-800 text-slate-400 border-slate-700',
  MEDIUM:   'bg-amber-950/60 text-amber-400 border-amber-900/50',
  HIGH:     'bg-orange-950/60 text-orange-400 border-orange-900/50',
  CRITICAL: 'bg-red-950/60 text-red-400 border-red-900/50',
}

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function OcorrenciaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const occurrence = await prisma.occurrence.findUnique({
    where:   { id },
    include: {
      reporter:    { select: { name: true } },
      resolver:    { select: { name: true } },
      responsible: { select: { name: true } },
      photos:      { select: { id: true }, take: 1 },
    },
  })

  if (!occurrence || occurrence.tenant_id !== TENANT_ID) notFound()

  const now          = new Date()
  const prazoVencido = occurrence.status !== 'RESOLVED' && new Date(occurrence.deadline) < now
  const hasPhoto     = occurrence.photos.length > 0

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <div>
          <BackButton href="/tecnico/ocorrencias" label="Ocorrências" />
          <h1 className="text-base font-semibold mt-1">Detalhe da ocorrência</h1>
        </div>

        {/* Card da ocorrência */}
        <div className={[
          'rounded-xl border bg-slate-900 p-4 space-y-3',
          prazoVencido ? 'border-red-900/60' : 'border-slate-800',
        ].join(' ')}>
          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEVERITY_COLOR[occurrence.severity] ?? 'bg-slate-800 text-slate-400 border-slate-700'}`}>
              {SEVERITY_LABEL[occurrence.severity] ?? occurrence.severity}
            </span>
            {prazoVencido && (
              <span className="rounded border border-red-900/50 bg-red-950/60 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">
                PRAZO VENCIDO
              </span>
            )}
            {occurrence.status === 'RESOLVED' && (
              <span className="rounded border border-green-900/50 bg-green-950/60 px-2 py-0.5 text-xs font-medium text-green-400">
                Resolvida
              </span>
            )}
            {occurrence.status === 'OPEN' && (
              <span className="rounded border border-amber-900/50 bg-amber-950/60 px-2 py-0.5 text-xs font-medium text-amber-400">
                Aberta
              </span>
            )}
            {occurrence.status === 'IN_PROGRESS' && (
              <span className="rounded border border-sky-900/50 bg-sky-950/60 px-2 py-0.5 text-xs font-medium text-sky-400">
                Em andamento
              </span>
            )}
          </div>

          {/* Descrição */}
          <p className="text-sm text-slate-200 leading-relaxed">{occurrence.description}</p>

          {/* Metadados */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            <div>
              <dt className="text-slate-500">Registrado por</dt>
              <dd className="text-slate-300">{occurrence.reporter.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Data</dt>
              <dd className="text-slate-300">{formatDatetime(occurrence.created_at)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Prazo</dt>
              <dd className={prazoVencido ? 'text-red-400 font-medium' : 'text-slate-300'}>
                {formatDatetime(occurrence.deadline)}
              </dd>
            </div>
            {occurrence.responsible && (
              <div>
                <dt className="text-slate-500">Responsável</dt>
                <dd className="text-slate-300">{occurrence.responsible.name}</dd>
              </div>
            )}
          </dl>

          {/* Foto */}
          {hasPhoto && (
            <div className="pt-1">
              <Link
                href={`/api/occurrences/${occurrence.id}/photo`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300"
              >
                Ver foto anexada →
              </Link>
            </div>
          )}

          {/* Resolução (se encerrada) */}
          {occurrence.status === 'RESOLVED' && (
            <div className="rounded-md border border-green-900/40 bg-green-950/20 px-3 py-2.5 space-y-1">
              <p className="text-xs font-medium text-green-400">Resolução</p>
              <p className="text-sm text-slate-300">{occurrence.resolution_notes ?? '—'}</p>
              <p className="text-xs text-slate-600">
                Por {occurrence.resolver?.name ?? '—'} em {occurrence.resolved_at ? formatDatetime(occurrence.resolved_at) : '—'}
              </p>
            </div>
          )}

          {/* Formulário de resolução (só se aberta) */}
          {occurrence.status !== 'RESOLVED' && (
            <ResolveForm ocorrenciaId={occurrence.id} />
          )}
        </div>
    </main>
  )
}

```

### `src/app/tecnico/ocorrencias/[id]/resolve-form.tsx`
```tsx
'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { resolverOcorrencia, type ResolucaoFormState } from '../actions'
import { Button } from '@/components/ui/button'

const INITIAL: ResolucaoFormState = {}

export function ResolveForm({ ocorrenciaId }: { ocorrenciaId: string }) {
  const router      = useRouter()
  const boundAction = resolverOcorrencia.bind(null, ocorrenciaId)
  const [state, action, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  return (
    <form action={action} className="space-y-3 pt-4 border-t border-slate-800">
      <h3 className="text-sm font-semibold text-slate-300">Fechar ocorrência</h3>

      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="resolution_notes" className="text-xs font-medium text-slate-400">
          Resolução adotada *
        </label>
        <textarea
          id="resolution_notes" name="resolution_notes"
          rows={4}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Descreva como a ocorrência foi resolvida…"
        />
        {state.fieldErrors?.resolution_notes && (
          <p className="text-xs text-red-400">{state.fieldErrors.resolution_notes[0]}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-green-900/60 text-green-300 hover:bg-green-900 border border-green-900/50 disabled:opacity-50"
      >
        {isPending ? 'Fechando…' : 'Confirmar resolução'}
      </Button>
    </form>
  )
}

```

### `src/app/tecnico/turnos/instancias/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const TENANT_ID = 'default'

function formatDatetime(d: Date | string): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_LABEL: Record<string, string> = {
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Passagem pendente',
  CLOSED:           'Fechado',
}
const STATUS_COLOR: Record<string, string> = {
  OPEN:             'bg-green-950/60 text-green-400 border-green-900/50',
  HANDOVER_PENDING: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  CLOSED:           'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

export default async function TecnicoInstanciasPage() {
  const session = await auth()
  if (!session || session.user.role !== 'TECHNICIAN') redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const instances = await prisma.shiftInstance.findMany({
    where: {
      tenant_id: TENANT_ID,
      date:      { gte: today },
    },
    include: {
      shift:  { select: { name: true, start_time: true, end_time: true } },
      opener: { select: { name: true } },
      _count: { select: { shift_tasks: true } },
    },
    orderBy: { opened_at: 'desc' },
    take: 20,
  })

  const pendingByInstance = await prisma.shiftTask.groupBy({
    by:     ['shift_instance_id'],
    where:  { tenant_id: TENANT_ID, status: 'PENDING', shift_instance_id: { in: instances.map((i) => i.id) } },
    _count: { _all: true },
  })
  const pendingMap = Object.fromEntries(pendingByInstance.map((r) => [r.shift_instance_id, r._count._all]))

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <h1 className="text-xl font-semibold">Turnos — Atribuir tarefas</h1>

        {instances.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-12 text-center">
            <p className="text-sm text-slate-500">Nenhum turno encontrado hoje.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {instances.map((inst) => {
              const pending = pendingMap[inst.id] ?? 0
              return (
                <div
                  key={inst.id}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{inst.shift.name}</p>
                      <p className="text-xs text-slate-500">
                        {inst.shift.start_time} – {inst.shift.end_time} · aberto por {inst.opener.name}
                      </p>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {formatDatetime(inst.opened_at)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[inst.status] ?? ''}`}>
                      {STATUS_LABEL[inst.status] ?? inst.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">
                      {inst._count.shift_tasks} tarefa(s) ·{' '}
                      {pending > 0
                        ? <span className="text-amber-400">{pending} pendente(s)</span>
                        : <span className="text-slate-600">nenhuma pendente</span>
                      }
                    </span>
                    <Link href={`/tecnico/turnos/instancias/${inst.id}`}>
                      <Button className="h-8 border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs">
                        Gerenciar tarefas
                      </Button>
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

    </main>
  )
}

```

### `src/app/tecnico/turnos/instancias/[id]/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { BackButton } from '@/components/back-button'
import { TecnicoTaskForm } from './tecnico-task-form'

const TENANT_ID = 'default'

export default async function TecnicoInstanciaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || !['TECHNICIAN', 'MANAGER'].includes(session.user.role)) redirect('/acesso-negado')

  const { id } = await params

  const [instance, operators] = await Promise.all([
    prisma.shiftInstance.findUnique({
      where: { id },
      include: {
        shift:  { select: { name: true, start_time: true, end_time: true } },
        opener: { select: { name: true } },
        shift_tasks: {
          include: {
            assignee: { select: { name: true } },
            creator:  { select: { name: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    }),
    prisma.user.findMany({
      where:   { tenant_id: TENANT_ID, role: 'OPERATOR', is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!instance || instance.tenant_id !== TENANT_ID) redirect('/tecnico/turnos/instancias')

  const done    = instance.shift_tasks.filter((t) => t.status === 'DONE').length
  const pending = instance.shift_tasks.filter((t) => t.status === 'PENDING').length

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <BackButton href="/tecnico/turnos/instancias" label="Instâncias" />
        <div>
          <h1 className="text-xl font-semibold">{instance.shift.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.start_time} – {instance.shift.end_time} · aberto por {instance.opener.name}
          </p>
        </div>

        {/* Resumo */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total',     value: instance.shift_tasks.length,  color: 'text-slate-100' },
            { label: 'Pendentes', value: pending,                        color: pending > 0 ? 'text-amber-400' : 'text-slate-100' },
            { label: 'Concluídas',value: done,                           color: done > 0 ? 'text-green-400' : 'text-slate-100' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tarefas */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tarefas</p>
          <TecnicoTaskForm
            instanceId={id}
            operators={operators}
            tasks={instance.shift_tasks}
            canAdd={instance.status !== 'CLOSED'}
          />
        </div>

    </main>
  )
}

```

### `src/app/tecnico/turnos/instancias/[id]/tecnico-task-form.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
// actions ficam no path do Gestor — import compartilhado conforme decisão de arquitetura
import { atribuirTarefa, removerTarefa, type TaskFormState } from '@/app/gestor/turnos/instancias/[id]/task-actions'

const INITIAL: TaskFormState = {}

type Operator = { id: string; name: string }
type Task = {
  id: string
  title: string
  description: string | null
  status: string
  assignee: { name: string } | null
  creator: { name: string }
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  DONE:    'Concluída',
  SKIPPED: 'Pulada',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'border-slate-700 bg-slate-800/60 text-slate-400',
  DONE:    'border-green-900/50 bg-green-950/60 text-green-400',
  SKIPPED: 'border-slate-700/50 bg-slate-800/30 text-slate-500',
}

export function TecnicoTaskForm({
  instanceId,
  operators,
  tasks,
  canAdd,
}: {
  instanceId: string
  operators:  Operator[]
  tasks:      Task[]
  canAdd:     boolean
}) {
  const boundAction = atribuirTarefa.bind(null, instanceId)
  const [state, formAction, isPending] = useActionState(boundAction, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">Nenhuma tarefa atribuída ainda.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{task.title}</p>
                {task.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-600">
                  {task.assignee ? `→ ${task.assignee.name}` : 'Qualquer operador'} · por {task.creator.name}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_COLOR[task.status] ?? ''}`}>
                  {STATUS_LABEL[task.status] ?? task.status}
                </span>
                {task.status === 'PENDING' && canAdd && (
                  <form action={removerTarefa.bind(null, task.id)}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-400">
                      Remover
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <form ref={formRef} action={formAction} className="space-y-3 border-t border-slate-800 pt-3">
          <p className="text-xs font-medium text-slate-400">Nova tarefa</p>

          <div>
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Título da tarefa *"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
            />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-400">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          <textarea
            name="description"
            rows={2}
            maxLength={500}
            placeholder="Descrição opcional"
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
          />

          <select
            name="assigned_to_id"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Qualquer operador</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>

          {state.error && (
            <p className="text-xs text-red-400">{state.error}</p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="h-12 w-full bg-slate-100 text-sm text-slate-900 hover:bg-white"
          >
            {isPending ? 'Salvando…' : '+ Atribuir tarefa'}
          </Button>
        </form>
      )}
    </div>
  )
}

```

---
## PERFIL GESTOR

### `src/app/gestor/layout.tsx`
```tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { SignOutButton } from '@/components/sign-out-button'
import { GestorSidebar } from '@/components/gestor/sidebar'

export default async function GestorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/acesso-negado')

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra superior */}
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link href="/gestor/dashboard" className="text-lg font-bold tracking-tight hover:text-slate-300 transition-colors">Solentis</Link>
            <span className="rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
              Gestor
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">
              {session.user.name ?? session.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Sidebar (visível apenas em telas lg+) */}
        <aside className="hidden lg:flex w-56 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50">
          <GestorSidebar />
        </aside>

        {/* Conteúdo das páginas */}
        <div className="min-w-0 flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}

```

### `src/app/gestor/auditoria/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const TENANT_ID  = 'default'
const PAGE_SIZE  = 25

// Nomes amigáveis para as tabelas auditadas
const TABLE_LABELS: Record<string, string> = {
  users:              'Usuários',
  quality_parameters: 'Parâmetros',
  occurrences:        'Ocorrências',
  shift_handovers:    'Passagens de Turno',
}

const ACTION_CONFIG = {
  CREATE: { label: 'Criação',  classes: 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50' },
  UPDATE: { label: 'Edição',   classes: 'bg-sky-950/60     text-sky-400     border-sky-900/50'     },
  DELETE: { label: 'Exclusão', classes: 'bg-red-950/60     text-red-400     border-red-900/50'     },
} as const

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function buildUrl(
  base: Record<string, string>,
  overrides: Record<string, string | number>,
): string {
  const p = new URLSearchParams({ ...base, ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])) })
  return `/gestor/auditoria?${p.toString()}`
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?:     string
    tableName?:  string
    dataInicio?: string
    dataFim?:    string
    page?:       string
  }>
}) {
  const sp         = await searchParams
  const pageNum    = Math.max(1, parseInt(sp.page ?? '1', 10))
  const userId     = sp.userId     ?? ''
  const tableName  = sp.tableName  ?? ''
  const dataInicio = sp.dataInicio ?? ''
  const dataFim    = sp.dataFim    ?? ''

  // Filtros ativos
  const where = {
    ...(userId    && { user_id:    userId    }),
    ...(tableName && { table_name: tableName }),
    ...(dataInicio || dataFim ? {
      timestamp: {
        ...(dataInicio && { gte: new Date(dataInicio + 'T00:00:00') }),
        ...(dataFim    && { lte: new Date(dataFim    + 'T23:59:59') }),
      },
    } : {}),
  }

  const [logs, total, users] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      take:    PAGE_SIZE,
      skip:    (pageNum - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where:   { tenant_id: TENANT_ID },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const activeFilters = { userId, tableName, dataInicio, dataFim }

  return (
    <main className="px-6 py-8 space-y-6 max-w-6xl">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Auditoria</h1>
        <p className="text-sm text-slate-400">Histórico de todas as mutações críticas do sistema.</p>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <form method="GET" action="/gestor/auditoria" className="flex flex-wrap gap-3 items-end">
        {/* Usuário */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Usuário</label>
          <select
            name="userId"
            defaultValue={userId}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Entidade */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Entidade</label>
          <select
            name="tableName"
            defaultValue={tableName}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Todas</option>
            {Object.entries(TABLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Data início */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">De</label>
          <input
            type="date"
            name="dataInicio"
            defaultValue={dataInicio}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {/* Data fim */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-slate-400">Até</label>
          <input
            type="date"
            name="dataFim"
            defaultValue={dataFim}
            className="rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-slate-700 px-4 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-600 transition-colors"
        >
          Filtrar
        </button>

        {(userId || tableName || dataInicio || dataFim) && (
          <Link
            href="/gestor/auditoria"
            className="rounded-md border border-slate-700 px-4 py-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            Limpar
          </Link>
        )}
      </form>

      {/* Contagem */}
      <p className="text-xs text-slate-500">
        {total === 0
          ? 'Nenhum registro encontrado.'
          : `${total} registro${total !== 1 ? 's' : ''} — página ${pageNum} de ${Math.max(1, totalPages)}`}
      </p>

      {/* ── Tabela ───────────────────────────────────────────────────────────── */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-slate-700 bg-slate-900 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
                <th className="px-4 py-3 font-medium">Data/hora</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Entidade</th>
                <th className="px-4 py-3 font-medium">Alterações</th>
                <th className="px-4 py-3 font-medium">Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => {
                const actionCfg = ACTION_CONFIG[log.action as keyof typeof ACTION_CONFIG]
                const tableLabel = TABLE_LABELS[log.table_name] ?? log.table_name
                let before: Record<string, unknown> | null = null
                let after:  Record<string, unknown> | null = null
                try { if (log.before) before = JSON.parse(log.before) } catch { /* ignora */ }
                try { if (log.after)  after  = JSON.parse(log.after)  } catch { /* ignora */ }

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors align-top">
                    {/* Data/hora */}
                    <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                      {formatDatetime(new Date(log.timestamp))}
                    </td>

                    {/* Usuário */}
                    <td className="px-4 py-3 text-slate-200 whitespace-nowrap">
                      {log.user?.name ?? <span className="text-slate-600">Sistema</span>}
                    </td>

                    {/* Ação */}
                    <td className="px-4 py-3">
                      {actionCfg ? (
                        <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${actionCfg.classes}`}>
                          {actionCfg.label}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-xs">{log.action}</span>
                      )}
                    </td>

                    {/* Entidade */}
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">
                      {tableLabel}
                      <br />
                      <span className="text-slate-600 font-mono">{log.record_id.slice(0, 8)}…</span>
                    </td>

                    {/* Alterações — expansível via <details> (sem JS) */}
                    <td className="px-4 py-3 max-w-xs">
                      {(before || after) ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-slate-500 hover:text-slate-300 select-none">
                            Ver alterações
                          </summary>
                          <div className="mt-2 space-y-1.5 text-xs font-mono">
                            {before && (
                              <div>
                                <p className="text-slate-600 mb-0.5">Antes:</p>
                                <pre className="whitespace-pre-wrap text-slate-400 bg-slate-800 rounded p-1.5">
                                  {JSON.stringify(before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {after && (
                              <div>
                                <p className="text-slate-600 mb-0.5">Depois:</p>
                                <pre className="whitespace-pre-wrap text-emerald-400 bg-slate-800 rounded p-1.5">
                                  {JSON.stringify(after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      ) : (
                        <span className="text-slate-700 text-xs">—</span>
                      )}
                    </td>

                    {/* Justificativa */}
                    <td className="px-4 py-3 text-slate-400 text-xs max-w-[180px]">
                      {log.justification ?? <span className="text-slate-700">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Paginação ────────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {pageNum > 1 ? (
            <Link
              href={buildUrl(activeFilters, { page: pageNum - 1 })}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="rounded-md border border-slate-800 px-3 py-1.5 text-slate-700 cursor-not-allowed">
              ← Anterior
            </span>
          )}

          <span className="text-slate-500">
            {pageNum} / {totalPages}
          </span>

          {pageNum < totalPages ? (
            <Link
              href={buildUrl(activeFilters, { page: pageNum + 1 })}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Próximo →
            </Link>
          ) : (
            <span className="rounded-md border border-slate-800 px-3 py-1.5 text-slate-700 cursor-not-allowed">
              Próximo →
            </span>
          )}
        </div>
      )}
    </main>
  )
}

```

### `src/app/gestor/categorias/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') throw new Error('Acesso não autorizado')
}

const CategoriaSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

export type CategoriaFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function criarCategoria(
  _prev: CategoriaFormState,
  formData: FormData,
): Promise<CategoriaFormState> {
  await requireManager()

  const parsed = CategoriaSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.equipmentCategory.create({
      data: { tenant_id: TENANT_ID, name: parsed.data.name, description: parsed.data.description, is_active: true },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe uma categoria com este nome'] } }
    }
    return { error: 'Erro ao criar categoria. Tente novamente.' }
  }

  revalidatePath('/gestor/categorias')
  redirect('/gestor/categorias')
}

export async function editarCategoria(
  categoriaId: string,
  _prev: CategoriaFormState,
  formData: FormData,
): Promise<CategoriaFormState> {
  await requireManager()

  const parsed = CategoriaSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.equipmentCategory.update({
      where: { id: categoriaId },
      data:  { name: parsed.data.name, description: parsed.data.description },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe uma categoria com este nome'] } }
    }
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  revalidatePath('/gestor/categorias')
  revalidatePath(`/gestor/categorias/${categoriaId}`)
  return { success: true }
}

export async function toggleAtivoCategoria(id: string): Promise<{ error?: string }> {
  await requireManager()
  const cat = await prisma.equipmentCategory.findUnique({ where: { id }, select: { is_active: true } })
  if (!cat) return { error: 'Categoria não encontrada.' }
  await prisma.equipmentCategory.update({ where: { id }, data: { is_active: !cat.is_active } })
  revalidatePath('/gestor/categorias')
  revalidatePath(`/gestor/categorias/${id}`)
  return {}
}

```

### `src/app/gestor/categorias/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function CategoriasPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const categorias = await prisma.equipmentCategory.findMany({
    where: { tenant_id: 'default', ...(search ? { name: { contains: search } } : {}) },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Categorias de Equipamento</h1>
          <p className="text-sm text-slate-400">Agrupamento de equipamentos por tipo.</p>
        </div>
        <Link href="/gestor/categorias/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">+ Nova categoria</Button>
        </Link>
      </div>

      <form method="GET" className="flex gap-2">
        <input name="q" defaultValue={search} placeholder="Buscar por nome…"
          className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500" />
        <Button type="submit" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">Buscar</Button>
        {search && <Link href="/gestor/categorias"><Button variant="ghost" className="text-slate-400 hover:text-slate-200">Limpar</Button></Link>}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {categorias.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? `Nenhuma categoria encontrada para "${search}".` : 'Nenhuma categoria cadastrada.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {categorias.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{c.name}</div>
                    {c.description && <div className="text-xs text-slate-500">{c.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {c.is_active
                      ? <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
                      : <span className="flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/categorias/${c.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">Editar</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-right text-xs text-slate-600">{categorias.length} categoria(s) encontrada(s)</p>
    </main>
  )
}

```

### `src/app/gestor/categorias/[id]/edit-form.tsx`
```tsx
'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarCategoria, toggleAtivoCategoria, type CategoriaFormState } from '../actions'

type Categoria = { id: string; name: string; description: string | null; is_active: boolean }

const initialState: CategoriaFormState = {}

export function EditCategoriaForm({ categoria }: { categoria: Categoria }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarCategoria.bind(null, categoria.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  function handleToggle() {
    if (!confirm(categoria.is_active ? 'Desativar esta categoria?' : 'Reativar esta categoria?')) return
    startToggle(async () => { await toggleAtivoCategoria(categoria.id); router.refresh() })
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <BackButton href="/gestor/categorias" label="Categorias" />

      <div className="flex items-start justify-between">
        <h1 className="text-xl font-semibold">{categoria.name}</h1>
        {categoria.is_active
          ? <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
          : <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
            <Input id="name" name="name" type="text" defaultValue={categoria.name} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-slate-300">
              Descrição <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea id="description" name="description" rows={3} disabled={isPendingForm}
              defaultValue={categoria.description ?? ''}
              className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
          </div>

          {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
          {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Categoria atualizada com sucesso.</p>}

          <Button type="submit" disabled={isPendingForm} className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-medium text-slate-200 mb-4">Ações</h2>
        <Button type="button" variant="outline" disabled={isPendingToggle} onClick={handleToggle}
          className={categoria.is_active
            ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
            : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'}>
          {isPendingToggle ? 'Aguarde…' : categoria.is_active ? 'Desativar categoria' : 'Reativar categoria'}
        </Button>
      </div>
    </main>
  )
}

```

### `src/app/gestor/categorias/[id]/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditCategoriaForm } from './edit-form'

export default async function EditarCategoriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const categoria = await prisma.equipmentCategory.findUnique({
    where: { id }, select: { id: true, name: true, description: true, is_active: true },
  })
  if (!categoria) notFound()
  return <EditCategoriaForm categoria={categoria} />
}

```

### `src/app/gestor/categorias/novo/page.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarCategoria, type CategoriaFormState } from '../actions'

const initialState: CategoriaFormState = {}

export default function NovaCategoriaPage() {
  const [state, formAction, isPending] = useActionState(criarCategoria, initialState)

  return (
    <div className="flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <BackButton href="/gestor/categorias" label="Categorias" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-100">Nova categoria de equipamento</h2>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input id="name" name="name" type="text" placeholder="Ex: Bombas, Aeradores" required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500" />
              {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-slate-300">
                Descrição <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <textarea id="description" name="description" rows={3} disabled={isPending}
                placeholder="Descreva os tipos de equipamento desta categoria…"
                className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
            </div>

            {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}

            <Button type="submit" disabled={isPending} className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
              {isPending ? 'Criando…' : 'Criar categoria'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

```

### `src/app/gestor/dashboard/nonconform-chart.tsx`
```tsx
'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

type DataPoint = { paramName: string; count: number }

export function NonConformChart({ data }: { data: DataPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-slate-500">
        Nenhuma não-conformidade no período.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

        <XAxis
          dataKey="paramName"
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={{ stroke: '#1e293b' }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />

        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#64748b' }}
          tickLine={false}
          axisLine={false}
          width={28}
        />

        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
          contentStyle={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: '#94a3b8' }}
          formatter={(v) => [v, 'Não-conformidades']}
        />

        <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={40}>
          {data.map((_, i) => (
            <Cell key={i} fill={i === 0 ? '#ef4444' : '#f97316'} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

```

### `src/app/gestor/dashboard/page.tsx`
```tsx
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { NonConformChart } from './nonconform-chart'

const TENANT_ID = 'default'

const FEATURES = [
  { title: 'Usuários',          href: '/gestor/usuarios',              desc: 'Cadastro e gerenciamento de contas',      active: true },
  { title: 'Parâmetros',        href: '/gestor/parametros',            desc: 'Limites de qualidade e histórico CONAMA', active: true },
  { title: 'Configurações',     href: '/gestor/metodos',               desc: 'Métodos, categorias, pontos e turnos',    active: true },
  { title: 'Produtos Químicos', href: '/gestor/produtos-quimicos',     desc: 'Estoque, entradas e movimentação',        active: true },
  { title: 'Leituras',          href: '/operador/leituras',            desc: 'Registros de campo por turno',            active: true },
  { title: 'Análises',          href: '/tecnico/analises',             desc: 'Análises laboratoriais',                  active: true },
  { title: 'Equipamentos',      href: '/tecnico/equipamentos',         desc: 'Cadastro e manutenção preventiva',        active: true },
  { title: 'Ocorrências',       href: '/tecnico/ocorrencias',          desc: 'Gestão de incidentes e resoluções',       active: true },
  { title: 'Turnos',            href: '/gestor/turnos/instancias',     desc: 'Histórico e passagens de turno',          active: true },
]

const SEVERITY_CONFIG = {
  CRITICAL: { label: 'Crítica',  color: 'text-red-400',    bg: 'bg-red-950/30',    border: 'border-red-800/50'    },
  HIGH:     { label: 'Alta',     color: 'text-orange-400', bg: 'bg-orange-950/30', border: 'border-orange-800/50' },
  MEDIUM:   { label: 'Média',    color: 'text-amber-400',  bg: 'bg-amber-950/30',  border: 'border-amber-800/50'  },
  LOW:      { label: 'Baixa',    color: 'text-slate-300',  bg: 'bg-slate-800/50',  border: 'border-slate-700'     },
} as const

export default async function GestorDashboard({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>
}) {
  const { dias: diasParam } = await searchParams
  const diasValidos = [7, 30, 90] as const
  type Dias = typeof diasValidos[number]
  const diasNum = diasValidos.includes(Number(diasParam) as Dias)
    ? (Number(diasParam) as Dias)
    : 30

  const now   = new Date()
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const periodoInicio = new Date(now.getTime() - diasNum * 24 * 60 * 60 * 1000)

  // ── KPIs ─────────────────────────────────────────────────────────────────────
  const [
    activeUsersCount,
    nonConformOpenCount,
    openOccurrencesCount,
    overduePreventic,
    criticalCorrectivas,
    overdueOccurrences,
    occurrencesBySeverityRaw,
    nonConformByParamRaw,
    parameterNames,
    chemicalProducts,
  ] = await Promise.all([
    // Usuários ativos
    prisma.user.count({ where: { tenant_id: TENANT_ID, is_active: true } }),

    // Não-conformidades abertas (n.c. sem aprovação)
    prisma.analysis.count({
      where: { tenant_id: TENANT_ID, is_non_conformant: true, approved_by: null },
    }),

    // Ocorrências abertas (total)
    prisma.occurrence.count({
      where: { tenant_id: TENANT_ID, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),

    // Alertas: preventivas vencidas
    prisma.preventiveMaintenance.count({
      where: {
        tenant_id:      TENANT_ID,
        status:         'SCHEDULED',
        scheduled_date: { lt: today },
        equipment:      { is_active: true },
      },
    }),

    // Alertas: corretivas HIGH/CRITICAL em andamento
    prisma.correctiveMaintenance.count({
      where: {
        tenant_id: TENANT_ID,
        status:    'IN_PROGRESS',
        priority:  { in: ['HIGH', 'CRITICAL'] },
      },
    }),

    // Alertas: ocorrências com prazo vencido
    prisma.occurrence.count({
      where: {
        tenant_id: TENANT_ID,
        status:    { in: ['OPEN', 'IN_PROGRESS'] },
        deadline:  { lt: now },
      },
    }),

    // Ocorrências abertas por severidade
    prisma.occurrence.groupBy({
      by:    ['severity'],
      where: { tenant_id: TENANT_ID, status: { in: ['OPEN', 'IN_PROGRESS'] } },
      _count: { id: true },
    }),

    // Não-conformidades por parâmetro (período selecionado)
    prisma.analysis.groupBy({
      by:    ['parameter_id'],
      where: {
        tenant_id:       TENANT_ID,
        is_non_conformant: true,
        collected_at:    { gte: periodoInicio },
      },
      _count:   { id: true },
      orderBy:  { _count: { id: 'desc' } },
      take:     8,
    }),

    // Nomes dos parâmetros (para o gráfico)
    prisma.qualityParameter.findMany({
      where:  { tenant_id: TENANT_ID },
      select: { id: true, name: true },
    }),

    // Estoque abaixo do mínimo (calculado + físico)
    prisma.chemicalProduct.findMany({
      where:  { tenant_id: TENANT_ID, is_active: true },
      select: {
        min_stock: true,
        entries:   { select: { quantity: true } },
        exits:     { select: { quantity: true } },
        counts:    { select: { counted_quantity: true }, orderBy: { counted_at: 'desc' }, take: 1 },
      },
    }),
  ])

  // Estoque baixo: calculado < min OU físico < min
  const lowStockCount = chemicalProducts.filter((p) => {
    const calc   = p.entries.reduce((s, e) => s + e.quantity, 0) - p.exits.reduce((s, e) => s + e.quantity, 0)
    const fisico = p.counts[0]?.counted_quantity ?? null
    return calc < p.min_stock || (fisico !== null && fisico < p.min_stock)
  }).length

  // Mapa de nomes de parâmetro para o gráfico
  const paramMap = new Map(parameterNames.map((p) => [p.id, p.name]))
  const nonConformChartData = nonConformByParamRaw.map((g) => ({
    paramName: paramMap.get(g.parameter_id) ?? g.parameter_id,
    count:     g._count.id,
  }))

  // Mapa de contagem por severidade
  const sevMap = new Map(occurrencesBySeverityRaw.map((g) => [g.severity, g._count.id]))

  return (
    <main className="px-6 py-8 space-y-8 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-400">Visão geral do sistema.</p>
      </div>

      {/* ── Seção 1: KPI Cards ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: 'Usuários ativos',
            value: activeUsersCount,
            href:  '/gestor/usuarios',
            alert: false,
            color: 'text-slate-100',
          },
          {
            label: 'Não-conform. em aberto',
            value: nonConformOpenCount,
            href:  '#',
            alert: nonConformOpenCount > 0,
            color: nonConformOpenCount > 0 ? 'text-red-400' : 'text-slate-100',
          },
          {
            label: 'Ocorrências abertas',
            value: openOccurrencesCount,
            href:  '#',
            alert: openOccurrencesCount > 0,
            color: openOccurrencesCount > 0 ? 'text-amber-400' : 'text-slate-100',
          },
          {
            label: 'Estoque abaixo do mínimo',
            value: lowStockCount,
            href:  '/gestor/produtos-quimicos',
            alert: lowStockCount > 0,
            color: lowStockCount > 0 ? 'text-red-400' : 'text-slate-100',
          },
        ].map((kpi) => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className={[
              'rounded-xl border p-4 hover:opacity-90 transition-opacity',
              kpi.alert ? 'border-red-900/50 bg-red-950/10' : 'border-slate-700 bg-slate-900',
            ].join(' ')}
          >
            <p className={`text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-slate-500 mt-1 leading-snug">{kpi.label}</p>
          </Link>
        ))}
      </section>

      {/* ── Seção 2: Alertas operacionais ───────────────────────────────────── */}
      {(overduePreventic > 0 || criticalCorrectivas > 0 || overdueOccurrences > 0) && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide">Alertas</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {overduePreventic > 0 && (
              <Link
                href="/tecnico/equipamentos"
                className="flex items-center gap-3 rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3 hover:bg-red-950/30 transition-colors"
              >
                <span className="text-2xl font-bold text-red-400">{overduePreventic}</span>
                <span className="text-xs text-red-300 leading-snug">Preventiva(s) vencida(s)</span>
              </Link>
            )}
            {criticalCorrectivas > 0 && (
              <Link
                href="/tecnico/equipamentos"
                className="flex items-center gap-3 rounded-xl border border-orange-800/50 bg-orange-950/20 px-4 py-3 hover:bg-orange-950/30 transition-colors"
              >
                <span className="text-2xl font-bold text-orange-400">{criticalCorrectivas}</span>
                <span className="text-xs text-orange-300 leading-snug">Corretiva(s) crítica(s)</span>
              </Link>
            )}
            {overdueOccurrences > 0 && (
              <Link
                href="#"
                className="flex items-center gap-3 rounded-xl border border-red-800/50 bg-red-950/20 px-4 py-3 hover:bg-red-950/30 transition-colors animate-pulse"
              >
                <span className="text-2xl font-bold text-red-400">{overdueOccurrences}</span>
                <span className="text-xs text-red-300 leading-snug">Ocorrência(s) com prazo vencido</span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* ── Seção 3: Gráficos ───────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Não-conformidades por parâmetro */}
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-300">Não-conformidades por parâmetro</h2>
            <div className="flex gap-1">
              {([7, 30, 90] as const).map((d) => (
                <Link
                  key={d}
                  href={`/gestor/dashboard?dias=${d}`}
                  className={[
                    'rounded px-2 py-0.5 text-xs transition-colors',
                    diasNum === d
                      ? 'bg-slate-700 text-slate-100'
                      : 'text-slate-500 hover:text-slate-300',
                  ].join(' ')}
                >
                  {d}d
                </Link>
              ))}
            </div>
          </div>
          <NonConformChart data={nonConformChartData} />
        </div>

        {/* Ocorrências abertas por severidade */}
        <div className="rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="text-sm font-medium text-slate-300 mb-4">Ocorrências abertas por severidade</h2>
          <div className="grid grid-cols-2 gap-3">
            {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => {
              const cfg   = SEVERITY_CONFIG[sev]
              const count = sevMap.get(sev) ?? 0
              return (
                <div
                  key={sev}
                  className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4`}
                >
                  <p className={`text-2xl font-bold ${cfg.color}`}>{count}</p>
                  <p className="text-xs text-slate-500 mt-1">{cfg.label}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Seção 4: Navegação ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Módulos</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`space-y-2 rounded-xl border bg-slate-900 p-5 ${
                f.active ? 'border-slate-700' : 'border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-slate-200">{f.title}</h3>
                {!f.active && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500">
                    Em breve
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{f.desc}</p>
              {f.active && f.href !== '#' && (
                <Link href={f.href} className="mt-1 block text-xs text-emerald-400 hover:text-emerald-300">
                  Acessar →
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}

```

### `src/app/gestor/metodos/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') throw new Error('Acesso não autorizado')
}

const MetodoSchema = z.object({
  name:        z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

export type MetodoFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function criarMetodo(
  _prev: MetodoFormState,
  formData: FormData,
): Promise<MetodoFormState> {
  await requireManager()

  const parsed = MetodoSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.analysisMethod.create({
      data: {
        tenant_id:   TENANT_ID,
        name:        parsed.data.name,
        description: parsed.data.description,
        is_active:   true,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe um método com este nome'] } }
    }
    return { error: 'Erro ao criar método. Tente novamente.' }
  }

  revalidatePath('/gestor/metodos')
  redirect('/gestor/metodos')
}

export async function editarMetodo(
  metodoId: string,
  _prev: MetodoFormState,
  formData: FormData,
): Promise<MetodoFormState> {
  await requireManager()

  const parsed = MetodoSchema.safeParse({
    name:        formData.get('name'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  try {
    await prisma.analysisMethod.update({
      where: { id: metodoId },
      data: {
        name:        parsed.data.name,
        description: parsed.data.description,
      },
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { name: ['Já existe um método com este nome'] } }
    }
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  revalidatePath('/gestor/metodos')
  revalidatePath(`/gestor/metodos/${metodoId}`)
  return { success: true }
}

export async function toggleAtivoMetodo(
  metodoId: string,
): Promise<{ error?: string }> {
  await requireManager()

  const metodo = await prisma.analysisMethod.findUnique({
    where:  { id: metodoId },
    select: { is_active: true },
  })
  if (!metodo) return { error: 'Método não encontrado.' }

  await prisma.analysisMethod.update({
    where: { id: metodoId },
    data:  { is_active: !metodo.is_active },
  })

  revalidatePath('/gestor/metodos')
  revalidatePath(`/gestor/metodos/${metodoId}`)
  return {}
}

```

### `src/app/gestor/metodos/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function MetodosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const metodos = await prisma.analysisMethod.findMany({
    where: {
      tenant_id: 'default',
      ...(search ? { name: { contains: search } } : {}),
    },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Métodos de Análise</h1>
          <p className="text-sm text-slate-400">Métodos utilizados nas análises laboratoriais.</p>
        </div>
        <Link href="/gestor/metodos/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">
            + Novo método
          </Button>
        </Link>
      </div>

      <form method="GET" className="flex gap-2">
        <input
          name="q" defaultValue={search} placeholder="Buscar por nome…"
          className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <Button type="submit" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">Buscar</Button>
        {search && (
          <Link href="/gestor/metodos">
            <Button variant="ghost" className="text-slate-400 hover:text-slate-200">Limpar</Button>
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {metodos.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? `Nenhum método encontrado para "${search}".` : 'Nenhum método cadastrado.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {metodos.map((m) => (
                <tr key={m.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{m.name}</div>
                    {m.description && <div className="text-xs text-slate-500">{m.description}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {m.is_active ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/metodos/${m.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">Editar</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-right text-xs text-slate-600">{metodos.length} método(s) encontrado(s)</p>
    </main>
  )
}

```

### `src/app/gestor/metodos/[id]/edit-form.tsx`
```tsx
'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarMetodo, toggleAtivoMetodo, type MetodoFormState } from '../actions'

type Metodo = { id: string; name: string; description: string | null; is_active: boolean }

const initialState: MetodoFormState = {}

export function EditMetodoForm({ metodo }: { metodo: Metodo }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarMetodo.bind(null, metodo.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  function handleToggle() {
    const msg = metodo.is_active ? 'Desativar este método?' : 'Reativar este método?'
    if (!confirm(msg)) return
    startToggle(async () => { await toggleAtivoMetodo(metodo.id); router.refresh() })
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <BackButton href="/gestor/metodos" label="Métodos de Análise" />

      <div className="flex items-start justify-between">
        <h1 className="text-xl font-semibold">{metodo.name}</h1>
        {metodo.is_active ? (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
          </span>
        ) : (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
          </span>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
            <Input id="name" name="name" type="text" defaultValue={metodo.name} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-slate-300">
              Descrição <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea id="description" name="description" rows={3} disabled={isPendingForm}
              defaultValue={metodo.description ?? ''}
              className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
          </div>

          {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
          {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Método atualizado com sucesso.</p>}

          <Button type="submit" disabled={isPendingForm} className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-medium text-slate-200">Ações</h2>
        <Button type="button" variant="outline" disabled={isPendingToggle} onClick={handleToggle}
          className={metodo.is_active
            ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
            : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'}>
          {isPendingToggle ? 'Aguarde…' : metodo.is_active ? 'Desativar método' : 'Reativar método'}
        </Button>
      </div>
    </main>
  )
}

```

### `src/app/gestor/metodos/[id]/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditMetodoForm } from './edit-form'

export default async function EditarMetodoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const metodo = await prisma.analysisMethod.findUnique({
    where:  { id },
    select: { id: true, name: true, description: true, is_active: true },
  })
  if (!metodo) notFound()
  return <EditMetodoForm metodo={metodo} />
}

```

### `src/app/gestor/metodos/novo/page.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarMetodo, type MetodoFormState } from '../actions'

const initialState: MetodoFormState = {}

export default function NovoMetodoPage() {
  const [state, formAction, isPending] = useActionState(criarMetodo, initialState)

  return (
    <div className="flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <BackButton href="/gestor/metodos" label="Métodos" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-100">Novo método de análise</h2>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input id="name" name="name" type="text" placeholder="Ex: Colorimetria" required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500" />
              {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-slate-300">
                Descrição <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <textarea id="description" name="description" rows={3} disabled={isPending}
                placeholder="Descreva brevemente o método…"
                className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
            </div>

            {state.error && (
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>
            )}

            <Button type="submit" disabled={isPending} className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
              {isPending ? 'Criando…' : 'Criar método'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

```

### `src/app/gestor/parametros/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') throw new Error('Acesso não autorizado')
  return session
}

const ParametroSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  unit: z.string().min(1, 'Informe a unidade'),
  min_limit: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().nullable(),
  ),
  max_limit: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().nullable(),
  ),
  legal_reference: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  effective_date: z.string().min(1, 'Informe a data de vigência'),
}).refine(
  (d) => d.min_limit === null || d.max_limit === null || d.min_limit < d.max_limit,
  { message: 'Limite mínimo deve ser menor que o máximo', path: ['max_limit'] },
)

export type ParametroFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Criar ──────────────────────────────────────────────────────────────────

export async function criarParametro(
  _prev: ParametroFormState,
  formData: FormData,
): Promise<ParametroFormState> {
  const session = await requireManager()

  const parsed = ParametroSchema.safeParse({
    name:            formData.get('name'),
    unit:            formData.get('unit'),
    min_limit:       formData.get('min_limit'),
    max_limit:       formData.get('max_limit'),
    legal_reference: formData.get('legal_reference'),
    effective_date:  formData.get('effective_date'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const created = await prisma.$transaction(async (tx) => {
    const param = await tx.qualityParameter.create({
      data: {
        tenant_id:       TENANT_ID,
        name:            parsed.data.name,
        unit:            parsed.data.unit,
        min_limit:       parsed.data.min_limit,
        max_limit:       parsed.data.max_limit,
        legal_reference: parsed.data.legal_reference,
        effective_date:  new Date(parsed.data.effective_date + 'T00:00:00.000Z'),
        is_active:       true,
        created_by:      userId,
      },
      select: { id: true },
    })
    await logAudit(tx, {
      userId,
      action:    'CREATE',
      tableName: 'quality_parameters',
      recordId:  param.id,
      after:     { name: parsed.data.name, unit: parsed.data.unit, min_limit: parsed.data.min_limit, max_limit: parsed.data.max_limit },
    })
    return param
  })
  void created

  revalidatePath('/gestor/parametros')
  redirect('/gestor/parametros')
}

// ─── Editar ──────────────────────────────────────────────────────────────────

export async function editarParametro(
  parametroId: string,
  _prev: ParametroFormState,
  formData: FormData,
): Promise<ParametroFormState> {
  const session = await requireManager()

  const parsed = ParametroSchema.safeParse({
    name:            formData.get('name'),
    unit:            formData.get('unit'),
    min_limit:       formData.get('min_limit'),
    max_limit:       formData.get('max_limit'),
    legal_reference: formData.get('legal_reference'),
    effective_date:  formData.get('effective_date'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const [current, userId] = await Promise.all([
    prisma.qualityParameter.findUnique({
      where:  { id: parametroId },
      select: { name: true, unit: true, min_limit: true, max_limit: true, effective_date: true },
    }),
    resolveUserId(session.user.email!),
  ])

  if (!current) return { error: 'Parâmetro não encontrado.' }
  if (!userId)  return { error: 'Sessão inválida.' }

  const newDate = new Date(parsed.data.effective_date + 'T00:00:00.000Z')

  const limitsChanged =
    current.min_limit        !== parsed.data.min_limit ||
    current.max_limit        !== parsed.data.max_limit ||
    current.effective_date.getTime() !== newDate.getTime()

  await prisma.$transaction(async (tx) => {
    if (limitsChanged) {
      await tx.parameterHistory.create({
        data: {
          parameter_id:          parametroId,
          min_limit_before:      current.min_limit,
          max_limit_before:      current.max_limit,
          min_limit_after:       parsed.data.min_limit,
          max_limit_after:       parsed.data.max_limit,
          effective_date_before: current.effective_date,
          effective_date_after:  newDate,
          changed_by:            userId,
        },
      })
    }

    await tx.qualityParameter.update({
      where: { id: parametroId },
      data: {
        name:            parsed.data.name,
        unit:            parsed.data.unit,
        min_limit:       parsed.data.min_limit,
        max_limit:       parsed.data.max_limit,
        legal_reference: parsed.data.legal_reference,
        effective_date:  newDate,
      },
    })

    await logAudit(tx, {
      userId,
      action:    'UPDATE',
      tableName: 'quality_parameters',
      recordId:  parametroId,
      before:    { name: current.name, unit: current.unit, min_limit: current.min_limit, max_limit: current.max_limit, effective_date: current.effective_date },
      after:     { name: parsed.data.name, unit: parsed.data.unit, min_limit: parsed.data.min_limit, max_limit: parsed.data.max_limit, effective_date: newDate },
    })
  })

  revalidatePath('/gestor/parametros')
  revalidatePath(`/gestor/parametros/${parametroId}`)
  return { success: true }
}

// ─── Toggle ativo ─────────────────────────────────────────────────────────────

export async function toggleAtivoParametro(
  parametroId: string,
): Promise<{ error?: string }> {
  const session = await requireManager()

  const [param, userId] = await Promise.all([
    prisma.qualityParameter.findUnique({
      where:  { id: parametroId },
      select: { is_active: true },
    }),
    resolveUserId(session.user.email!),
  ])
  if (!param) return { error: 'Parâmetro não encontrado.' }

  await prisma.$transaction(async (tx) => {
    await tx.qualityParameter.update({
      where: { id: parametroId },
      data:  { is_active: !param.is_active },
    })
    await logAudit(tx, {
      userId,
      action:    'UPDATE',
      tableName: 'quality_parameters',
      recordId:  parametroId,
      before:    { is_active:  param.is_active  },
      after:     { is_active: !param.is_active  },
    })
  })

  revalidatePath('/gestor/parametros')
  revalidatePath(`/gestor/parametros/${parametroId}`)
  return {}
}

```

### `src/app/gestor/parametros/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

function formatLimit(value: number | null): string {
  if (value === null) return '—'
  return value.toString()
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export default async function ParametrosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const params = await prisma.qualityParameter.findMany({
    where: {
      tenant_id: 'default',
      ...(search ? { name: { contains: search } } : {}),
    },
    orderBy: { name: 'asc' },
    select: {
      id: true, name: true, unit: true,
      min_limit: true, max_limit: true,
      legal_reference: true, effective_date: true, is_active: true,
    },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Parâmetros de Qualidade</h1>
          <p className="text-sm text-slate-400">Limites e referências legais (CONAMA).</p>
        </div>
        <Link href="/gestor/parametros/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">
            + Novo parâmetro
          </Button>
        </Link>
      </div>

      {/* Busca */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome…"
          className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <Button type="submit" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          Buscar
        </Button>
        {search && (
          <Link href="/gestor/parametros">
            <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
              Limpar
            </Button>
          </Link>
        )}
      </form>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {params.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? `Nenhum parâmetro encontrado para "${search}".` : 'Nenhum parâmetro cadastrado.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Parâmetro</th>
                <th className="px-4 py-3">Limites</th>
                <th className="px-4 py-3">Vigência</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {params.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{p.name}</div>
                    <div className="text-xs text-slate-500">{p.unit}</div>
                    {p.legal_reference && (
                      <div className="text-xs text-slate-600">{p.legal_reference}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-300 font-mono">
                    {formatLimit(p.min_limit)} – {formatLimit(p.max_limit)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(p.effective_date)}
                  </td>
                  <td className="px-4 py-3">
                    {p.is_active ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/parametros/${p.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
                        Editar
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-right text-xs text-slate-600">{params.length} parâmetro(s) encontrado(s)</p>
    </main>
  )
}

```

### `src/app/gestor/parametros/[id]/edit-form.tsx`
```tsx
'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarParametro, toggleAtivoParametro, type ParametroFormState } from '../actions'

type Parametro = {
  id:              string
  name:            string
  unit:            string
  min_limit:       number | null
  max_limit:       number | null
  legal_reference: string | null
  effective_date:  Date
  is_active:       boolean
}

const initialState: ParametroFormState = {}

export function EditParametroForm({ parametro }: { parametro: Parametro }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarParametro.bind(null, parametro.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  const isPending = isPendingForm || isPendingToggle

  function handleToggle() {
    const msg = parametro.is_active
      ? 'Desativar este parâmetro? Ele deixará de aparecer em novos registros.'
      : 'Reativar este parâmetro?'
    if (!confirm(msg)) return

    startToggle(async () => {
      await toggleAtivoParametro(parametro.id)
      router.refresh()
    })
  }

  const effectiveDateStr = parametro.effective_date.toISOString().split('T')[0]

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <BackButton href="/gestor/parametros" label="Parâmetros" />

      {/* Título + status */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{parametro.name}</h1>
          <p className="text-sm text-slate-400">{parametro.unit}</p>
        </div>
        {parametro.is_active ? (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
          </span>
        ) : (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
          </span>
        )}
      </div>

      {/* Formulário */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <h2 className="text-base font-medium text-slate-200">Dados do parâmetro</h2>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input
                id="name" name="name" type="text"
                defaultValue={parametro.name}
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.name && (
                <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="unit" className="text-sm font-medium text-slate-300">Unidade</label>
              <Input
                id="unit" name="unit" type="text"
                defaultValue={parametro.unit}
                placeholder="mg/L, NTU, pH…"
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.unit && (
                <p className="text-xs text-red-400">{state.fieldErrors.unit[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label htmlFor="min_limit" className="text-sm font-medium text-slate-300">
                Limite mínimo <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <Input
                id="min_limit" name="min_limit" type="number" step="0.01"
                defaultValue={parametro.min_limit ?? ''}
                disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="max_limit" className="text-sm font-medium text-slate-300">
                Limite máximo <span className="text-slate-500 font-normal">(opcional)</span>
              </label>
              <Input
                id="max_limit" name="max_limit" type="number" step="0.01"
                defaultValue={parametro.max_limit ?? ''}
                disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="legal_reference" className="text-sm font-medium text-slate-300">
              Referência legal <span className="text-slate-500 font-normal">(opcional)</span>
            </label>
            <Input
              id="legal_reference" name="legal_reference" type="text"
              defaultValue={parametro.legal_reference ?? ''}
              placeholder="Ex: CONAMA 430/2011 Art. 16"
              disabled={isPending}
              className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="effective_date" className="text-sm font-medium text-slate-300">
              Data de vigência
            </label>
            <Input
              id="effective_date" name="effective_date" type="date"
              defaultValue={effectiveDateStr}
              required disabled={isPending}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
            />
            {state.fieldErrors?.effective_date && (
              <p className="text-xs text-red-400">{state.fieldErrors.effective_date[0]}</p>
            )}
          </div>

          {state.error && (
            <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}

          {state.success && (
            <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">
              Parâmetro atualizado com sucesso.
            </p>
          )}

          <Button
            type="submit" disabled={isPending}
            className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
          >
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      {/* Ações */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-medium text-slate-200">Ações</h2>
        <Button
          type="button" variant="outline" disabled={isPending}
          onClick={handleToggle}
          className={
            parametro.is_active
              ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
              : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'
          }
        >
          {isPendingToggle ? 'Aguarde…' : parametro.is_active ? 'Desativar parâmetro' : 'Reativar parâmetro'}
        </Button>
      </div>
    </main>
  )
}

```

### `src/app/gestor/parametros/[id]/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditParametroForm } from './edit-form'

export default async function EditarParametroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const parametro = await prisma.qualityParameter.findUnique({
    where: { id },
    select: {
      id: true, name: true, unit: true,
      min_limit: true, max_limit: true,
      legal_reference: true, effective_date: true, is_active: true,
    },
  })

  if (!parametro) notFound()

  return <EditParametroForm parametro={parametro} />
}

```

### `src/app/gestor/parametros/novo/page.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarParametro, type ParametroFormState } from '../actions'

const initialState: ParametroFormState = {}

const today = new Date().toISOString().split('T')[0]

export default function NovoParametroPage() {
  const [state, formAction, isPending] = useActionState(criarParametro, initialState)

  return (
    <div className="px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-lg space-y-6">
        <BackButton href="/gestor/parametros" label="Parâmetros" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Novo parâmetro</h2>
            <p className="text-xs text-slate-400">
              Defina o parâmetro de qualidade e seus limites de conformidade.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
                <Input
                  id="name" name="name" type="text"
                  placeholder="Ex: pH, DBO₅, Turbidez"
                  required disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
                {state.fieldErrors?.name && (
                  <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="unit" className="text-sm font-medium text-slate-300">Unidade</label>
                <Input
                  id="unit" name="unit" type="text"
                  placeholder="mg/L, NTU, adimensional…"
                  required disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
                {state.fieldErrors?.unit && (
                  <p className="text-xs text-red-400">{state.fieldErrors.unit[0]}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="min_limit" className="text-sm font-medium text-slate-300">
                  Limite mínimo <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <Input
                  id="min_limit" name="min_limit" type="number" step="0.01"
                  placeholder="—"
                  disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="max_limit" className="text-sm font-medium text-slate-300">
                  Limite máximo <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <Input
                  id="max_limit" name="max_limit" type="number" step="0.01"
                  placeholder="—"
                  disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="legal_reference" className="text-sm font-medium text-slate-300">
                Referência legal <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <Input
                id="legal_reference" name="legal_reference" type="text"
                placeholder="Ex: CONAMA 430/2011 Art. 16"
                disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="effective_date" className="text-sm font-medium text-slate-300">
                Data de vigência
              </label>
              <Input
                id="effective_date" name="effective_date" type="date"
                defaultValue={today}
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.effective_date && (
                <p className="text-xs text-red-400">{state.fieldErrors.effective_date[0]}</p>
              )}
            </div>

            {state.error && (
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                {state.error}
              </p>
            )}

            <Button
              type="submit" disabled={isPending}
              className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
            >
              {isPending ? 'Criando…' : 'Criar parâmetro'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

```

### `src/app/gestor/pontos-de-coleta/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') throw new Error('Acesso não autorizado')
}

const nullable = (v: unknown) => (v === '' || v == null ? null : String(v))

const PontoSchema = z.object({
  name:        z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  location:    z.preprocess(nullable, z.string().nullable()),
  description: z.preprocess(nullable, z.string().nullable()),
})

export type PontoFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function criarPonto(
  _prev: PontoFormState,
  formData: FormData,
): Promise<PontoFormState> {
  await requireManager()

  const parsed = PontoSchema.safeParse({
    name:        formData.get('name'),
    location:    formData.get('location'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  await prisma.collectionPoint.create({
    data: {
      tenant_id:   TENANT_ID,
      name:        parsed.data.name,
      location:    parsed.data.location,
      description: parsed.data.description,
      is_active:   true,
    },
  })

  revalidatePath('/gestor/pontos-de-coleta')
  redirect('/gestor/pontos-de-coleta')
}

export async function editarPonto(
  pontoId: string,
  _prev: PontoFormState,
  formData: FormData,
): Promise<PontoFormState> {
  await requireManager()

  const parsed = PontoSchema.safeParse({
    name:        formData.get('name'),
    location:    formData.get('location'),
    description: formData.get('description'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  await prisma.collectionPoint.update({
    where: { id: pontoId },
    data:  { name: parsed.data.name, location: parsed.data.location, description: parsed.data.description },
  })

  revalidatePath('/gestor/pontos-de-coleta')
  revalidatePath(`/gestor/pontos-de-coleta/${pontoId}`)
  return { success: true }
}

export async function toggleAtivoPonto(id: string): Promise<{ error?: string }> {
  await requireManager()
  const ponto = await prisma.collectionPoint.findUnique({ where: { id }, select: { is_active: true } })
  if (!ponto) return { error: 'Ponto de coleta não encontrado.' }
  await prisma.collectionPoint.update({ where: { id }, data: { is_active: !ponto.is_active } })
  revalidatePath('/gestor/pontos-de-coleta')
  revalidatePath(`/gestor/pontos-de-coleta/${id}`)
  return {}
}

```

### `src/app/gestor/pontos-de-coleta/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function PontosDeColetaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const pontos = await prisma.collectionPoint.findMany({
    where: { tenant_id: 'default', ...(search ? { name: { contains: search } } : {}) },
    orderBy: { name: 'asc' },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Pontos de Coleta</h1>
          <p className="text-sm text-slate-400">Locais de amostragem para leituras e análises.</p>
        </div>
        <Link href="/gestor/pontos-de-coleta/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">+ Novo ponto</Button>
        </Link>
      </div>

      <form method="GET" className="flex gap-2">
        <input name="q" defaultValue={search} placeholder="Buscar por nome…"
          className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500" />
        <Button type="submit" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">Buscar</Button>
        {search && (
          <Link href="/gestor/pontos-de-coleta">
            <Button variant="ghost" className="text-slate-400 hover:text-slate-200">Limpar</Button>
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {pontos.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? `Nenhum ponto encontrado para "${search}".` : 'Nenhum ponto de coleta cadastrado.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Ponto</th>
                <th className="px-4 py-3">Localização</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pontos.map((p) => (
                <tr key={p.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{p.name}</div>
                    {p.description && <div className="text-xs text-slate-500">{p.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{p.location ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.is_active
                      ? <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
                      : <span className="flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/pontos-de-coleta/${p.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">Editar</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-right text-xs text-slate-600">{pontos.length} ponto(s) encontrado(s)</p>
    </main>
  )
}

```

### `src/app/gestor/pontos-de-coleta/[id]/edit-form.tsx`
```tsx
'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarPonto, toggleAtivoPonto, type PontoFormState } from '../actions'

type Ponto = { id: string; name: string; location: string | null; description: string | null; is_active: boolean }

const initialState: PontoFormState = {}

export function EditPontoForm({ ponto }: { ponto: Ponto }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarPonto.bind(null, ponto.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  function handleToggle() {
    if (!confirm(ponto.is_active ? 'Desativar este ponto de coleta?' : 'Reativar este ponto de coleta?')) return
    startToggle(async () => { await toggleAtivoPonto(ponto.id); router.refresh() })
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <BackButton href="/gestor/pontos-de-coleta" label="Pontos de Coleta" />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{ponto.name}</h1>
          {ponto.location && <p className="text-sm text-slate-400">{ponto.location}</p>}
        </div>
        {ponto.is_active
          ? <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
          : <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
            <Input id="name" name="name" type="text" defaultValue={ponto.name} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="location" className="text-sm font-medium text-slate-300">
              Localização <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <Input id="location" name="location" type="text" defaultValue={ponto.location ?? ''} disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="description" className="text-sm font-medium text-slate-300">
              Descrição <span className="font-normal text-slate-500">(opcional)</span>
            </label>
            <textarea id="description" name="description" rows={3} disabled={isPendingForm}
              defaultValue={ponto.description ?? ''}
              className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
          </div>

          {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
          {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Ponto atualizado com sucesso.</p>}

          <Button type="submit" disabled={isPendingForm} className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-medium text-slate-200 mb-4">Ações</h2>
        <Button type="button" variant="outline" disabled={isPendingToggle} onClick={handleToggle}
          className={ponto.is_active
            ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
            : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'}>
          {isPendingToggle ? 'Aguarde…' : ponto.is_active ? 'Desativar ponto' : 'Reativar ponto'}
        </Button>
      </div>
    </main>
  )
}

```

### `src/app/gestor/pontos-de-coleta/[id]/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditPontoForm } from './edit-form'

export default async function EditarPontoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ponto = await prisma.collectionPoint.findUnique({
    where:  { id },
    select: { id: true, name: true, location: true, description: true, is_active: true },
  })
  if (!ponto) notFound()
  return <EditPontoForm ponto={ponto} />
}

```

### `src/app/gestor/pontos-de-coleta/novo/page.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarPonto, type PontoFormState } from '../actions'

const initialState: PontoFormState = {}

export default function NovoPontoPage() {
  const [state, formAction, isPending] = useActionState(criarPonto, initialState)

  return (
    <div className="flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <BackButton href="/gestor/pontos-de-coleta" label="Pontos de Coleta" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Novo ponto de coleta</h2>
            <p className="text-xs text-slate-400">Local onde amostras são coletadas para leituras e análises.</p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input id="name" name="name" type="text" placeholder="Ex: Entrada ETE, Saída Final" required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500" />
              {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="location" className="text-sm font-medium text-slate-300">
                Localização <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <Input id="location" name="location" type="text" placeholder="Ex: Calha Parshall — entrada" disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="description" className="text-sm font-medium text-slate-300">
                Descrição <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <textarea id="description" name="description" rows={3} disabled={isPending}
                placeholder="Descreva o ponto e seu papel no tratamento…"
                className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
            </div>

            {state.error && (
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>
            )}

            <Button type="submit" disabled={isPending} className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
              {isPending ? 'Criando…' : 'Criar ponto de coleta'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

```

### `src/app/gestor/prazos-ocorrencia/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') throw new Error('Acesso não autorizado')
  return session
}

const PrazosSchema = z.object({
  CRITICAL: z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
  HIGH:     z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
  MEDIUM:   z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
  LOW:      z.preprocess((v) => parseInt(String(v), 10), z.number().int().min(1, 'Mínimo 1 hora')),
})

export type PrazosFormState = {
  error?:   string
  success?: boolean
}

export async function atualizarPrazos(
  _prev: PrazosFormState,
  formData: FormData,
): Promise<PrazosFormState> {
  const session = await requireManager()

  const parsed = PrazosSchema.safeParse({
    CRITICAL: formData.get('deadline_CRITICAL'),
    HIGH:     formData.get('deadline_HIGH'),
    MEDIUM:   formData.get('deadline_MEDIUM'),
    LOW:      formData.get('deadline_LOW'),
  })
  if (!parsed.success) {
    const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0]
    return { error: first ?? 'Valores inválidos.' }
  }

  // Resolver o ID do usuário logado para updated_by
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: 'default', email: session.user.email! } },
    select: { id: true },
  })
  if (!user) return { error: 'Sessão inválida.' }

  await Promise.all(
    SEVERITIES.map((severity) =>
      prisma.occurrenceSeverityDefault.update({
        where: { severity },
        data:  { deadline_hours: parsed.data[severity], updated_by: user.id },
      }),
    ),
  )

  revalidatePath('/gestor/prazos-ocorrencia')
  return { success: true }
}

```

### `src/app/gestor/prazos-ocorrencia/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import { PrazosForm } from './prazos-form'

const SEVERITY_LABELS: Record<string, { label: string; color: string }> = {
  CRITICAL: { label: 'Crítica',  color: 'text-red-400' },
  HIGH:     { label: 'Alta',     color: 'text-orange-400' },
  MEDIUM:   { label: 'Média',    color: 'text-amber-400' },
  LOW:      { label: 'Baixa',    color: 'text-slate-400' },
}

export default async function PrazosOcorrenciaPage() {
  const prazos = await prisma.occurrenceSeverityDefault.findMany({
    orderBy: { deadline_hours: 'asc' },
  })

  const initialValues = Object.fromEntries(
    prazos.map((p) => [p.severity, p.deadline_hours]),
  ) as Record<string, number>

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-semibold">Prazos de Ocorrência</h1>
        <p className="text-sm text-slate-400">
          Prazo máximo (em horas) para resolução de ocorrências por severidade.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-6">
        <p className="text-xs text-slate-500">
          Os prazos são sugeridos automaticamente ao registrar uma ocorrência e podem ser editados pelo Técnico ou Gestor.
        </p>

        <PrazosForm initialValues={initialValues} severityLabels={SEVERITY_LABELS} />
      </div>
    </main>
  )
}

```

### `src/app/gestor/prazos-ocorrencia/prazos-form.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { atualizarPrazos, type PrazosFormState } from './actions'

const ORDERED = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

const initialState: PrazosFormState = {}

type Props = {
  initialValues:  Record<string, number>
  severityLabels: Record<string, { label: string; color: string }>
}

export function PrazosForm({ initialValues, severityLabels }: Props) {
  const [state, formAction, isPending] = useActionState(atualizarPrazos, initialState)

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-3">
        {ORDERED.map((severity) => {
          const { label, color } = severityLabels[severity]
          return (
            <div key={severity} className="flex items-center gap-4">
              <span className={`w-20 text-sm font-medium ${color}`}>{label}</span>
              <div className="flex items-center gap-2">
                <Input
                  name={`deadline_${severity}`}
                  type="number"
                  min={1}
                  defaultValue={initialValues[severity] ?? ''}
                  required
                  disabled={isPending}
                  className="w-28 border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
                />
                <span className="text-sm text-slate-500">horas</span>
              </div>
            </div>
          )
        })}
      </div>

      {state.error && (
        <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">
          Prazos atualizados com sucesso.
        </p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Salvar prazos'}
      </Button>
    </form>
  )
}

```

### `src/app/gestor/produtos-quimicos/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { CHEMICAL_UNITS_PRESET } from '@/types'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function requireManagerOrTechnician() {
  const session = await auth()
  if (!session || !['MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user.id
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const unitValues = [...CHEMICAL_UNITS_PRESET, 'outro'] as const

const ProdutoSchema = z.object({
  name:        z.string().min(2, { error: 'Nome deve ter pelo menos 2 caracteres' }),
  unit_select: z.enum(unitValues, { error: 'Selecione a unidade' }),
  unit_custom: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(20).nullable(),
  ),
  min_stock: z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Estoque mínimo inválido' }).min(0, { error: 'Deve ser maior ou igual a 0' }),
  ),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

const EntradaSchema = z.object({
  product_id:     z.string().min(1, { error: 'Produto obrigatório' }),
  quantity:       z.preprocess(
    (v) => parseFloat(String(v)),
    z.number({ error: 'Quantidade inválida' }).positive({ error: 'Quantidade deve ser maior que 0' }),
  ),
  supplier:       z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  invoice_number: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  notes:          z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  received_at:    z.string().min(1, { error: 'Data de recebimento obrigatória' }),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resolveUnit(unit_select: string, unit_custom: string | null): string {
  return unit_select === 'outro' ? (unit_custom ?? '').trim() : unit_select
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function criarProduto(_prev: unknown, formData: FormData) {
  const session = await requireManager()

  const parsed = ProdutoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { name, unit_select, unit_custom, min_stock, description } = parsed.data
  const unit = resolveUnit(unit_select, unit_custom)

  if (!unit) return { error: 'Informe a unidade de medida' }

  const recorded_by = await resolveUserId(session.user.email!)

  await prisma.chemicalProduct.create({
    data: { tenant_id: TENANT_ID, name, unit, min_stock, description, created_by: recorded_by },
  })

  revalidatePath('/gestor/produtos-quimicos')
  return { success: true }
}

export async function editarProduto(_prev: unknown, formData: FormData) {
  await requireManager()

  const id = formData.get('id') as string
  if (!id) return { error: 'ID inválido' }

  const parsed = ProdutoSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { name, unit_select, unit_custom, min_stock, description } = parsed.data
  const unit = resolveUnit(unit_select, unit_custom)

  if (!unit) return { error: 'Informe a unidade de medida' }

  await prisma.chemicalProduct.update({
    where: { id },
    data:  { name, unit, min_stock, description },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${id}`)
  return { success: true }
}

export async function toggleAtivoProduto(id: string, is_active: boolean) {
  await requireManager()

  await prisma.chemicalProduct.update({
    where: { id },
    data:  { is_active },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${id}`)
}

export async function registrarEntrada(_prev: unknown, formData: FormData) {
  const session = await requireManagerOrTechnician()

  const parsed = EntradaSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Dados inválidos' }
  }

  const { product_id, quantity, supplier, invoice_number, notes, received_at } = parsed.data
  const recorded_by = await resolveUserId(session.user.email!)

  await prisma.chemicalStockEntry.create({
    data: {
      tenant_id: TENANT_ID,
      product_id,
      quantity,
      supplier,
      invoice_number,
      notes,
      received_at: new Date(received_at),
      recorded_by,
    },
  })

  revalidatePath('/gestor/produtos-quimicos')
  revalidatePath(`/gestor/produtos-quimicos/${product_id}`)
  return { success: true }
}

```

### `src/app/gestor/produtos-quimicos/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import { calcularEstoqueAtual, estaAbaixoMinimo, formatarQuantidade } from '@/lib/stock-utils'
import Link from 'next/link'

const TENANT_ID = 'default'

export default async function ProdutosQuimicosPage() {
  const products = await prisma.chemicalProduct.findMany({
    where:   { tenant_id: TENANT_ID },
    orderBy: { name: 'asc' },
    include: {
      entries: { select: { quantity: true } },
      exits:   { select: { quantity: true } },
      counts:  { select: { counted_quantity: true }, orderBy: { counted_at: 'desc' }, take: 1 },
    },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Produtos Químicos</h1>
          <p className="text-sm text-slate-400 mt-0.5">Estoque e movimentação de reagentes</p>
        </div>
        <Link
          href="/gestor/produtos-quimicos/novo"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          + Novo produto
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum produto cadastrado.</p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => {
            const totalEntradas = p.entries.reduce((s, e) => s + e.quantity, 0)
            const totalSaidas   = p.exits.reduce((s, e) => s + e.quantity, 0)
            const calculado     = calcularEstoqueAtual(totalEntradas, totalSaidas)
            const fisico        = p.counts[0]?.counted_quantity ?? null
            const alerta        = estaAbaixoMinimo(calculado, fisico, p.min_stock)

            return (
              <Link
                key={p.id}
                href={`/gestor/produtos-quimicos/${p.id}`}
                className={`block rounded-lg border p-4 transition-colors hover:border-slate-600 ${
                  !p.is_active
                    ? 'border-slate-800 bg-slate-900/40 opacity-60'
                    : alerta
                    ? 'border-red-800/60 bg-slate-900'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-slate-100">{p.name}</span>
                      {!p.is_active && (
                        <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Inativo</span>
                      )}
                      {alerta && p.is_active && (
                        <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                          ESTOQUE BAIXO
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{p.description}</p>
                    )}
                  </div>

                  <div className="flex gap-6 shrink-0 text-right text-sm">
                    <div>
                      <p className="text-xs text-slate-500">Calculado</p>
                      <p className={`font-medium ${alerta && calculado < p.min_stock ? 'text-red-400' : 'text-slate-200'}`}>
                        {formatarQuantidade(calculado)} {p.unit}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Físico</p>
                      <p className={`font-medium ${fisico !== null && fisico < p.min_stock ? 'text-red-400' : 'text-slate-200'}`}>
                        {fisico !== null ? `${formatarQuantidade(fisico)} ${p.unit}` : '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Mínimo</p>
                      <p className="font-medium text-slate-400">
                        {formatarQuantidade(p.min_stock)} {p.unit}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

```

### `src/app/gestor/produtos-quimicos/[id]/edit-form.tsx`
```tsx
'use client'

import { useActionState, useState } from 'react'
import { editarProduto } from '../actions'
import { CHEMICAL_UNIT_OPTIONS, CHEMICAL_UNITS_PRESET } from '@/types'

type Product = {
  id: string
  name: string
  unit: string
  min_stock: number
  description: string | null
}

export function EditForm({ product }: { product: Product }) {
  const isPreset   = (CHEMICAL_UNITS_PRESET as readonly string[]).includes(product.unit)
  const [unitSelect, setUnitSelect] = useState(isPreset ? product.unit : 'outro')
  const [state, action, pending] = useActionState(editarProduto, null)

  return (
    <form action={action} className="space-y-4 mt-3">
      <input type="hidden" name="id" value={product.id} />

      {state?.error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-3 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="rounded-md bg-green-900/40 border border-green-700 px-3 py-2 text-sm text-green-300">
          Produto atualizado.
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Nome *</label>
        <input
          name="name"
          required
          defaultValue={product.name}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Unidade *</label>
        <select
          name="unit_select"
          required
          value={unitSelect}
          onChange={(e) => setUnitSelect(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {CHEMICAL_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {unitSelect === 'outro' && (
        <div className="space-y-1">
          <label className="text-sm text-slate-300">Unidade personalizada *</label>
          <input
            name="unit_custom"
            required
            maxLength={20}
            defaultValue={!isPreset ? product.unit : ''}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Estoque mínimo *</label>
        <input
          name="min_stock"
          type="number"
          min="0"
          step="0.01"
          required
          defaultValue={product.min_stock}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Descrição</label>
        <textarea
          name="description"
          rows={2}
          defaultValue={product.description ?? ''}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Salvando...' : 'Salvar alterações'}
      </button>
    </form>
  )
}

```

### `src/app/gestor/produtos-quimicos/[id]/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  calcularEstoqueAtual,
  calcularDivergencia,
  estaAbaixoMinimo,
  formatarQuantidade,
} from '@/lib/stock-utils'
import { EditForm } from './edit-form'
import { ToggleButton } from './toggle-button'
import { BackButton } from '@/components/back-button'

const TENANT_ID = 'default'

type Movement =
  | { tipo: 'entrada';  date: Date; qty: number; supplier: string | null; invoice: string | null; notes: string | null; recorder: string }
  | { tipo: 'saida';    date: Date; qty: number; notes: string | null; recorder: string }
  | { tipo: 'contagem'; date: Date; qty: number; notes: string | null; recorder: string }

export default async function ProdutoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where: { id, tenant_id: TENANT_ID },
    include: {
      entries: { orderBy: { received_at: 'desc' }, include: { recorder: { select: { name: true } } } },
      exits:   { orderBy: { used_at:     'desc' }, include: { recorder: { select: { name: true } } } },
      counts:  { orderBy: { counted_at:  'desc' }, include: { recorder: { select: { name: true } } } },
    },
  })

  if (!product) notFound()

  const totalEntradas = product.entries.reduce((s, e) => s + e.quantity, 0)
  const totalSaidas   = product.exits.reduce((s, e) => s + e.quantity, 0)
  const calculado     = calcularEstoqueAtual(totalEntradas, totalSaidas)
  const fisico        = product.counts[0]?.counted_quantity ?? null
  const divergencia   = calcularDivergencia(calculado, fisico)
  const alerta        = estaAbaixoMinimo(calculado, fisico, product.min_stock)

  const movements: Movement[] = [
    ...product.entries.map((e) => ({
      tipo: 'entrada' as const,
      date: e.received_at,
      qty: e.quantity,
      supplier: e.supplier,
      invoice: e.invoice_number,
      notes: e.notes,
      recorder: e.recorder.name,
    })),
    ...product.exits.map((e) => ({
      tipo: 'saida' as const,
      date: e.used_at,
      qty: e.quantity,
      notes: e.notes,
      recorder: e.recorder.name,
    })),
    ...product.counts.map((c) => ({
      tipo: 'contagem' as const,
      date: c.counted_at,
      qty: c.counted_quantity,
      notes: c.notes,
      recorder: c.recorder.name,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime())

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <BackButton href="/gestor/produtos-quimicos" label="Produtos Químicos" />
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <h1 className="text-xl font-semibold text-slate-100">{product.name}</h1>
            {!product.is_active && (
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">Inativo</span>
            )}
            {alerta && product.is_active && (
              <span className="text-xs font-medium text-red-400 bg-red-900/30 px-2 py-0.5 rounded animate-pulse">
                ESTOQUE BAIXO
              </span>
            )}
          </div>
        </div>
        <Link
          href={`/gestor/produtos-quimicos/${id}/entrada`}
          className="shrink-0 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 transition-colors"
        >
          + Registrar entrada
        </Link>
      </div>

      {/* Resumo de estoque */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: 'Estoque calculado',
            value: `${formatarQuantidade(calculado)} ${product.unit}`,
            color: calculado < product.min_stock ? 'text-red-400' : 'text-slate-100',
          },
          {
            label: 'Estoque físico',
            value: fisico !== null ? `${formatarQuantidade(fisico)} ${product.unit}` : '—',
            color: fisico !== null && fisico < product.min_stock ? 'text-red-400' : 'text-slate-100',
          },
          {
            label: 'Mínimo',
            value: `${formatarQuantidade(product.min_stock)} ${product.unit}`,
            color: 'text-slate-400',
          },
          {
            label: 'Divergência',
            value: divergencia !== null
              ? `${divergencia >= 0 ? '+' : ''}${formatarQuantidade(divergencia)} ${product.unit}`
              : '—',
            color: divergencia === null ? 'text-slate-500'
              : divergencia < 0 ? 'text-amber-400'
              : 'text-green-400',
          },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border border-slate-700 bg-slate-900 p-3">
            <p className="text-xs text-slate-500">{stat.label}</p>
            <p className={`text-sm font-semibold mt-0.5 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Editar produto */}
      <details className="rounded-lg border border-slate-700 bg-slate-900">
        <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-slate-300 hover:text-slate-100 select-none">
          Editar dados do produto
        </summary>
        <div className="px-4 pb-4">
          <EditForm product={product} />
        </div>
      </details>

      <ToggleButton id={product.id} is_active={product.is_active} />

      {/* Histórico de movimentação */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">
          Histórico de movimentação ({movements.length})
        </h2>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="space-y-2">
            {movements.map((m, i) => (
              <div key={i} className="rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-3 flex items-start gap-3">
                <span className={`shrink-0 mt-0.5 text-xs font-medium px-2 py-0.5 rounded ${
                  m.tipo === 'entrada'  ? 'bg-green-900/40 text-green-400' :
                  m.tipo === 'saida'   ? 'bg-red-900/40 text-red-400' :
                                         'bg-blue-900/40 text-blue-400'
                }`}>
                  {m.tipo === 'entrada' ? 'Entrada' : m.tipo === 'saida' ? 'Saída' : 'Contagem'}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-slate-200">
                      {m.tipo === 'contagem' ? '=' : m.tipo === 'entrada' ? '+' : '−'}{formatarQuantidade(m.qty)} {product.unit}
                    </span>
                    {m.tipo === 'entrada' && m.supplier && (
                      <span className="text-xs text-slate-400">· {m.supplier}</span>
                    )}
                    {m.tipo === 'entrada' && m.invoice && (
                      <span className="text-xs text-slate-500">NF {m.invoice}</span>
                    )}
                  </div>
                  {m.notes && <p className="text-xs text-slate-500 mt-0.5">{m.notes}</p>}
                  <p className="text-xs text-slate-600 mt-0.5">
                    {m.date.toLocaleString('pt-BR')} · {m.recorder}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

```

### `src/app/gestor/produtos-quimicos/[id]/toggle-button.tsx`
```tsx
'use client'

import { useTransition } from 'react'
import { toggleAtivoProduto } from '../actions'

export function ToggleButton({ id, is_active }: { id: string; is_active: boolean }) {
  const [pending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(() => toggleAtivoProduto(id, !is_active))}
      disabled={pending}
      className={`rounded-md border px-4 py-2 text-sm transition-colors disabled:opacity-50 ${
        is_active
          ? 'border-red-800 text-red-400 hover:bg-red-900/20'
          : 'border-green-800 text-green-400 hover:bg-green-900/20'
      }`}
    >
      {pending ? '...' : is_active ? 'Desativar produto' : 'Reativar produto'}
    </button>
  )
}

```

### `src/app/gestor/produtos-quimicos/[id]/entrada/entry-form.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarEntrada } from '../../actions'

type Props = { productId: string; productName: string; unit: string }

export function EntryForm({ productId, productName, unit }: Props) {
  const router = useRouter()
  const now = new Date()
  now.setSeconds(0, 0)
  const defaultDate = now.toISOString().slice(0, 16)

  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await registrarEntrada(prev, formData)
    if (result?.success) router.push(`/gestor/produtos-quimicos/${productId}`)
    return result
  }, null)

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="product_id" value={productId} />

      {state?.error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="rounded-md bg-slate-800/50 px-4 py-2 text-sm text-slate-400">
        Produto: <span className="text-slate-200 font-medium">{productName}</span>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Quantidade recebida ({unit}) *</label>
        <input
          name="quantity"
          type="number"
          min="0.01"
          step="0.01"
          required
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Data de recebimento *</label>
        <input
          name="received_at"
          type="datetime-local"
          required
          defaultValue={defaultDate}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Fornecedor</label>
        <input
          name="supplier"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Nome do fornecedor"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Número da nota fiscal</label>
        <input
          name="invoice_number"
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="NF-e 00000"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Observações</label>
        <textarea
          name="notes"
          rows={2}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Lote, validade, condições do recebimento..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-green-700 py-2 text-sm font-medium text-white hover:bg-green-600 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Registrando...' : 'Confirmar entrada'}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/gestor/produtos-quimicos/${productId}`)}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

```

### `src/app/gestor/produtos-quimicos/[id]/entrada/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { EntryForm } from './entry-form'

const TENANT_ID = 'default'

export default async function EntradaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const product = await prisma.chemicalProduct.findFirst({
    where: { id, tenant_id: TENANT_ID, is_active: true },
    select: { id: true, name: true, unit: true },
  })

  if (!product) notFound()

  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <BackButton href={`/gestor/produtos-quimicos/${id}`} label={product.name} />
        <h1 className="text-xl font-semibold text-slate-100 mt-2">Registrar Entrada</h1>
        <p className="text-sm text-slate-400 mt-0.5">Compra ou recebimento de estoque</p>
      </div>
      <EntryForm productId={product.id} productName={product.name} unit={product.unit} />
    </div>
  )
}

```

### `src/app/gestor/produtos-quimicos/novo/page.tsx`
```tsx
import { ProductForm } from './product-form'
import { BackButton } from '@/components/back-button'

export default function NovoProdutoPage() {
  return (
    <div className="p-6 max-w-lg mx-auto space-y-6">
      <div>
        <BackButton href="/gestor/produtos-quimicos" label="Produtos Químicos" />
        <h1 className="text-xl font-semibold text-slate-100 mt-2">Novo Produto Químico</h1>
      </div>
      <ProductForm />
    </div>
  )
}

```

### `src/app/gestor/produtos-quimicos/novo/product-form.tsx`
```tsx
'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarProduto } from '../actions'
import { CHEMICAL_UNIT_OPTIONS } from '@/types'

export function ProductForm() {
  const router = useRouter()
  const [unitSelect, setUnitSelect] = useState('')
  const [state, action, pending] = useActionState(async (prev: unknown, formData: FormData) => {
    const result = await criarProduto(prev, formData)
    if (result?.success) router.push('/gestor/produtos-quimicos')
    return result
  }, null)

  return (
    <form action={action} className="space-y-4">
      {state?.error && (
        <p className="rounded-md bg-red-900/40 border border-red-700 px-4 py-2 text-sm text-red-300">
          {state.error}
        </p>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Nome *</label>
        <input
          name="name"
          required
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ex: Cloro Granulado"
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Unidade de medida *</label>
        <select
          name="unit_select"
          required
          value={unitSelect}
          onChange={(e) => setUnitSelect(e.target.value)}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Selecione...</option>
          {CHEMICAL_UNIT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {unitSelect === 'outro' && (
        <div className="space-y-1">
          <label className="text-sm text-slate-300">Unidade personalizada *</label>
          <input
            name="unit_custom"
            required
            maxLength={20}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: caixa, fardo, tonelada..."
          />
        </div>
      )}

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Estoque mínimo *</label>
        <input
          name="min_stock"
          type="number"
          min="0"
          step="0.01"
          required
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="0"
        />
        <p className="text-xs text-slate-500">Alerta disparado quando calculado ou físico ficar abaixo deste valor.</p>
      </div>

      <div className="space-y-1">
        <label className="text-sm text-slate-300">Descrição</label>
        <textarea
          name="description"
          rows={3}
          className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Uso, concentração, fornecedor padrão..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="flex-1 rounded-md bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Salvando...' : 'Cadastrar produto'}
        </button>
        <button
          type="button"
          onClick={() => router.push('/gestor/produtos-quimicos')}
          className="rounded-md border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}

```

### `src/app/gestor/turnos/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') throw new Error('Acesso não autorizado')
}

const TurnoSchema = z.object({
  name:                     z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  start_time:               z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  end_time:                 z.string().regex(/^\d{2}:\d{2}$/, 'Formato inválido (HH:MM)'),
  crosses_midnight:         z.preprocess((v) => v === 'on', z.boolean()),
  handover_timeout_minutes: z.preprocess(
    (v) => parseInt(String(v), 10),
    z.number().int().min(30, 'Mínimo 30 minutos').max(480, 'Máximo 480 minutos (8h)'),
  ),
})

export type TurnoFormState = {
  error?:       string
  fieldErrors?: Record<string, string[]>
  success?:     boolean
}

export async function criarTurno(
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  await requireManager()

  const parsed = TurnoSchema.safeParse({
    name:                     formData.get('name'),
    start_time:               formData.get('start_time'),
    end_time:                 formData.get('end_time'),
    crosses_midnight:         formData.get('crosses_midnight'),
    handover_timeout_minutes: formData.get('handover_timeout_minutes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  await prisma.shift.create({
    data: {
      tenant_id:                TENANT_ID,
      name:                     parsed.data.name,
      start_time:               parsed.data.start_time,
      end_time:                 parsed.data.end_time,
      crosses_midnight:         parsed.data.crosses_midnight,
      handover_timeout_minutes: parsed.data.handover_timeout_minutes,
      is_active:                true,
    },
  })

  revalidatePath('/gestor/turnos')
  redirect('/gestor/turnos')
}

export async function editarTurno(
  turnoId: string,
  _prev: TurnoFormState,
  formData: FormData,
): Promise<TurnoFormState> {
  await requireManager()

  const parsed = TurnoSchema.safeParse({
    name:                     formData.get('name'),
    start_time:               formData.get('start_time'),
    end_time:                 formData.get('end_time'),
    crosses_midnight:         formData.get('crosses_midnight'),
    handover_timeout_minutes: formData.get('handover_timeout_minutes'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  await prisma.shift.update({
    where: { id: turnoId },
    data: {
      name:                     parsed.data.name,
      start_time:               parsed.data.start_time,
      end_time:                 parsed.data.end_time,
      crosses_midnight:         parsed.data.crosses_midnight,
      handover_timeout_minutes: parsed.data.handover_timeout_minutes,
    },
  })

  revalidatePath('/gestor/turnos')
  revalidatePath(`/gestor/turnos/${turnoId}`)
  return { success: true }
}

export async function toggleAtivoTurno(id: string): Promise<{ error?: string }> {
  await requireManager()
  const turno = await prisma.shift.findUnique({ where: { id }, select: { is_active: true } })
  if (!turno) return { error: 'Turno não encontrado.' }
  await prisma.shift.update({ where: { id }, data: { is_active: !turno.is_active } })
  revalidatePath('/gestor/turnos')
  revalidatePath(`/gestor/turnos/${id}`)
  return {}
}

```

### `src/app/gestor/turnos/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function TurnosPage() {
  const turnos = await prisma.shift.findMany({
    where:   { tenant_id: 'default' },
    orderBy: { start_time: 'asc' },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Turnos</h1>
          <p className="text-sm text-slate-400">Configuração de horários e passagem de turno.</p>
        </div>
        <Link href="/gestor/turnos/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">+ Novo turno</Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {turnos.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Nenhum turno cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Passagem</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {turnos.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-100">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    {t.start_time} – {t.end_time}
                    {t.crosses_midnight && (
                      <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-slate-500">+1 dia</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{t.handover_timeout_minutes} min</td>
                  <td className="px-4 py-3">
                    {t.is_active
                      ? <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
                      : <span className="flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/turnos/${t.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">Editar</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}

```

### `src/app/gestor/turnos/[id]/edit-form.tsx`
```tsx
'use client'

import { useActionState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarTurno, toggleAtivoTurno, type TurnoFormState } from '../actions'

type Turno = {
  id: string; name: string; start_time: string; end_time: string
  crosses_midnight: boolean; handover_timeout_minutes: number; is_active: boolean
}

const initialState: TurnoFormState = {}

export function EditTurnoForm({ turno }: { turno: Turno }) {
  const router = useRouter()
  const [isPendingToggle, startToggle] = useTransition()

  const editAction = editarTurno.bind(null, turno.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  function handleToggle() {
    if (!confirm(turno.is_active ? 'Desativar este turno?' : 'Reativar este turno?')) return
    startToggle(async () => { await toggleAtivoTurno(turno.id); router.refresh() })
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      <BackButton href="/gestor/turnos" label="Turnos" />

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{turno.name}</h1>
          <p className="text-sm text-slate-400 font-mono">{turno.start_time} – {turno.end_time}</p>
        </div>
        {turno.is_active
          ? <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
          : <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
            <Input id="name" name="name" type="text" defaultValue={turno.name} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="start_time" className="text-sm font-medium text-slate-300">Início</label>
              <Input id="start_time" name="start_time" type="time" defaultValue={turno.start_time} required disabled={isPendingForm}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="end_time" className="text-sm font-medium text-slate-300">Término</label>
              <Input id="end_time" name="end_time" type="time" defaultValue={turno.end_time} required disabled={isPendingForm}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="handover_timeout_minutes" className="text-sm font-medium text-slate-300">
              Timeout de passagem (minutos)
            </label>
            <Input id="handover_timeout_minutes" name="handover_timeout_minutes" type="number"
              min={30} max={480} defaultValue={turno.handover_timeout_minutes} required disabled={isPendingForm}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
            {state.fieldErrors?.handover_timeout_minutes && (
              <p className="text-xs text-red-400">{state.fieldErrors.handover_timeout_minutes[0]}</p>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="crosses_midnight" disabled={isPendingForm}
              defaultChecked={turno.crosses_midnight}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500" />
            <span className="text-sm text-slate-300">Cruza a meia-noite</span>
          </label>

          {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
          {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Turno atualizado com sucesso.</p>}

          <Button type="submit" disabled={isPendingForm} className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-base font-medium text-slate-200 mb-4">Ações</h2>
        <Button type="button" variant="outline" disabled={isPendingToggle} onClick={handleToggle}
          className={turno.is_active
            ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
            : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'}>
          {isPendingToggle ? 'Aguarde…' : turno.is_active ? 'Desativar turno' : 'Reativar turno'}
        </Button>
      </div>
    </main>
  )
}

```

### `src/app/gestor/turnos/[id]/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import { EditTurnoForm } from './edit-form'

export default async function EditarTurnoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const turno = await prisma.shift.findUnique({
    where:  { id },
    select: { id: true, name: true, start_time: true, end_time: true, crosses_midnight: true, handover_timeout_minutes: true, is_active: true },
  })
  if (!turno) notFound()
  return <EditTurnoForm turno={turno} />
}

```

### `src/app/gestor/turnos/instancias/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Schema ───────────────────────────────────────────────────────────────────

const EditHandoverSchema = z.object({
  justification: z.string().min(10, 'Justificativa deve ter ao menos 10 caracteres'),
  outgoing_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  incoming_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

// ─── Form state ───────────────────────────────────────────────────────────────

export type EditHandoverFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Editar passagem (Gestor) ─────────────────────────────────────────────────

export async function editarPassagem(
  handoverId: string,
  _prev: EditHandoverFormState,
  formData: FormData,
): Promise<EditHandoverFormState> {
  const session = await requireManager()

  const parsed = EditHandoverSchema.safeParse({
    justification:         formData.get('justification'),
    outgoing_observations: formData.get('outgoing_observations'),
    incoming_observations: formData.get('incoming_observations'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const handover = await prisma.shiftHandover.findUnique({
    where:   { id: handoverId },
    include: { shift_instance: { select: { tenant_id: true } } },
  })
  if (!handover || handover.shift_instance.tenant_id !== TENANT_ID) {
    return { error: 'Passagem não encontrada.' }
  }
  if (handover.status !== 'CONFIRMED') {
    return { error: 'Apenas passagens confirmadas podem ser editadas.' }
  }

  await prisma.$transaction(async (tx) => {
    await tx.shiftHandover.update({
      where: { id: handoverId },
      data: {
        outgoing_observations: parsed.data.outgoing_observations,
        incoming_observations: parsed.data.incoming_observations,
      },
    })
    await logAudit(tx, {
      userId,
      action:        'UPDATE',
      tableName:     'shift_handovers',
      recordId:      handoverId,
      before:        { outgoing_observations: handover.outgoing_observations, incoming_observations: handover.incoming_observations },
      after:         { outgoing_observations: parsed.data.outgoing_observations, incoming_observations: parsed.data.incoming_observations },
      justification: parsed.data.justification,
    })
  })

  revalidatePath('/gestor/turnos/instancias')
  return { success: true }
}

```

### `src/app/gestor/turnos/instancias/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

const TENANT_ID = 'default'

const STATUS_LABEL: Record<string, string> = {
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Aguard. confirmação',
  CLOSED:           'Fechado',
}

const STATUS_COLOR: Record<string, string> = {
  OPEN:             'bg-green-950/60 text-green-400 border-green-900/50',
  HANDOVER_PENDING: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  CLOSED:           'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function formatDatetime(d: Date): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function InstanciasTurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const { status, page: pageStr } = await searchParams
  const page  = Math.max(1, parseInt(pageStr ?? '1', 10))
  const take  = 20
  const skip  = (page - 1) * take

  const where = {
    tenant_id: TENANT_ID,
    ...(status ? { status } : {}),
  }

  const [instances, total] = await Promise.all([
    prisma.shiftInstance.findMany({
      where,
      include: {
        shift:  { select: { name: true } },
        opener: { select: { name: true } },
        handover: {
          select: {
            id:               true,
            status:           true,
            outgoing_user:    { select: { name: true } },
            incoming_user:    { select: { name: true } },
          },
        },
      },
      orderBy: [{ date: 'desc' }, { opened_at: 'desc' }],
      take,
      skip,
    }),
    prisma.shiftInstance.count({ where }),
  ])

  const totalPages = Math.ceil(total / take)

  const STATUS_FILTERS = [
    { label: 'Todos',              value: '' },
    { label: 'Abertos',            value: 'OPEN' },
    { label: 'Em passagem',        value: 'HANDOVER_PENDING' },
    { label: 'Fechados',           value: 'CLOSED' },
  ]

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Instâncias de Turno</h1>
        <span className="text-xs text-slate-500">{total} registro(s)</span>
      </div>

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const isActive = (status ?? '') === f.value
          const params   = f.value ? `?status=${f.value}` : '?'
          return (
            <Link
              key={f.value}
              href={`/gestor/turnos/instancias${params}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-slate-700 text-slate-100'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      {/* Lista */}
      {instances.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 py-12 text-center">
          <p className="text-sm text-slate-500">Nenhuma instância encontrada.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map((inst) => (
            <Link
              key={inst.id}
              href={`/gestor/turnos/instancias/${inst.id}`}
              className="block rounded-xl border border-slate-800 bg-slate-900 p-4 hover:bg-slate-800/60 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-sm font-medium">{inst.shift.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {formatDate(inst.date)} · Aberto por {inst.opener.name} às {formatDatetime(inst.opened_at)}
                  </p>
                  {inst.handover && (
                    <p className="text-xs text-slate-600">
                      Sainte: {inst.handover.outgoing_user.name}
                      {inst.handover.incoming_user && ` → Entrante: ${inst.handover.incoming_user.name}`}
                    </p>
                  )}
                </div>
                <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[inst.status] ?? 'bg-slate-800 text-slate-400'}`}>
                  {STATUS_LABEL[inst.status] ?? inst.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2 pt-1">
          <Link
            href={`/gestor/turnos/instancias?${status ? `status=${status}&` : ''}page=${page - 1}`}
            className={`text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 ${page <= 1 ? 'pointer-events-none opacity-40' : ''}`}
          >
            ← Anterior
          </Link>
          <span className="text-xs text-slate-500">
            {page} / {totalPages}
          </span>
          <Link
            href={`/gestor/turnos/instancias?${status ? `status=${status}&` : ''}page=${page + 1}`}
            className={`text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 hover:bg-slate-800 ${page >= totalPages ? 'pointer-events-none opacity-40' : ''}`}
          >
            Próximo →
          </Link>
        </div>
      )}
    </div>
  )
}

```

### `src/app/gestor/turnos/instancias/[id]/edit-handover-form.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { editarPassagem } from '../actions'
import type { EditHandoverFormState } from '../actions'

const INITIAL: EditHandoverFormState = {}

type Props = {
  handoverId:      string
  currentOutgoing: string
  currentIncoming: string
}

export function EditHandoverForm({ handoverId, currentOutgoing, currentIncoming }: Props) {
  const action = editarPassagem.bind(null, handoverId)
  const [state, formAction, isPending] = useActionState(action, INITIAL)

  if (state.success) {
    return (
      <p className="text-xs text-green-400 py-2">Observações atualizadas com sucesso.</p>
    )
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Observações do sainte</label>
        <textarea
          name="outgoing_observations"
          rows={2}
          defaultValue={currentOutgoing}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">Observações do entrante</label>
        <textarea
          name="incoming_observations"
          rows={2}
          defaultValue={currentIncoming}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-400">
          Justificativa da edição <span className="text-red-400">*</span>
        </label>
        <textarea
          name="justification"
          rows={2}
          required
          placeholder="Descreva o motivo da edição (mín. 10 caracteres)"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none resize-none"
        />
        {state.fieldErrors?.justification && (
          <p className="text-xs text-red-400">{state.fieldErrors.justification[0]}</p>
        )}
      </div>

      {state.error && (
        <p className="text-xs text-red-400">{state.error}</p>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="h-9 w-full border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
      >
        {isPending ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  )
}

```

### `src/app/gestor/turnos/instancias/[id]/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { BackButton } from '@/components/back-button'
import { EditHandoverForm } from './edit-handover-form'
import { TaskForm } from './task-form'

const TENANT_ID = 'default'

const STATUS_LABEL: Record<string, string> = {
  OPEN:             'Aberto',
  HANDOVER_PENDING: 'Aguardando confirmação',
  CLOSED:           'Fechado',
}

const STATUS_COLOR: Record<string, string> = {
  OPEN:             'bg-green-950/60 text-green-400 border-green-900/50',
  HANDOVER_PENDING: 'bg-amber-950/60 text-amber-400 border-amber-900/50',
  CLOSED:           'bg-slate-800/60 text-slate-400 border-slate-700/50',
}

const HANDOVER_STATUS_LABEL: Record<string, string> = {
  PENDING:   'Aguardando confirmação',
  CONFIRMED: 'Confirmada',
  TIMED_OUT: 'Timeout',
}

function formatDatetime(d: Date | string): string {
  return new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function InstanciaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [instance, operators] = await Promise.all([
    prisma.shiftInstance.findUnique({
      where: { id },
      include: {
        shift:  { select: { name: true, start_time: true, end_time: true } },
        opener: { select: { name: true } },
        handover: {
          include: {
            outgoing_user: { select: { name: true } },
            incoming_user: { select: { name: true } },
          },
        },
        readings:    { select: { id: true } },
        shift_tasks: {
          include: {
            assignee: { select: { name: true } },
            creator:  { select: { name: true } },
          },
          orderBy: { created_at: 'asc' },
        },
      },
    }),
    prisma.user.findMany({
      where:   { tenant_id: TENANT_ID, role: 'OPERATOR', is_active: true },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  if (!instance || instance.tenant_id !== TENANT_ID) redirect('/gestor/turnos/instancias')

  const h = instance.handover

  let checklist: {
    readings_count?: number
    open_occurrences_count?: number
    pending_items?: string
  } = {}
  if (h) {
    try { checklist = JSON.parse(h.checklist_data) } catch { /* ignora */ }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <BackButton href="/gestor/turnos/instancias" label="Instâncias de Turno" />
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">{instance.shift.name}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {instance.shift.start_time} – {instance.shift.end_time} · {formatDatetime(instance.date)}
          </p>
        </div>
        <span className={`shrink-0 rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[instance.status] ?? ''}`}>
          {STATUS_LABEL[instance.status] ?? instance.status}
        </span>
      </div>

      {/* Dados da instância */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Instância</p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <div>
            <span className="text-slate-500">Aberto por</span>
            <p className="text-slate-200">{instance.opener.name}</p>
          </div>
          <div>
            <span className="text-slate-500">Abertura</span>
            <p className="text-slate-200">{formatDatetime(instance.opened_at)}</p>
          </div>
          {instance.closed_at && (
            <div>
              <span className="text-slate-500">Fechamento</span>
              <p className="text-slate-200">{formatDatetime(instance.closed_at)}</p>
            </div>
          )}
          <div>
            <span className="text-slate-500">Leituras</span>
            <p className="text-slate-200">{instance.readings.length}</p>
          </div>
        </div>
      </div>

      {/* Tarefas do turno */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Tarefas</p>
          <span className="text-xs text-slate-500">
            {instance.shift_tasks.filter((t) => t.status === 'DONE').length}
            /{instance.shift_tasks.length} concluídas
          </span>
        </div>
        <TaskForm
          instanceId={id}
          operators={operators}
          tasks={instance.shift_tasks}
          canAdd={instance.status !== 'CLOSED'}
        />
      </div>

      {/* Passagem de turno */}
      {h ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Passagem</p>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${
              h.status === 'CONFIRMED'  ? 'bg-green-950/60 text-green-400'  :
              h.status === 'TIMED_OUT' ? 'bg-red-950/60 text-red-400'      :
                                         'bg-amber-950/60 text-amber-400'
            }`}>
              {HANDOVER_STATUS_LABEL[h.status] ?? h.status}
            </span>
          </div>

          {/* Checklist */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className="text-xl font-bold">{checklist.readings_count ?? 0}</p>
              <p className="text-xs text-slate-500">leitura(s)</p>
            </div>
            <div className="rounded-lg bg-slate-800/60 px-3 py-2 text-center">
              <p className={`text-xl font-bold ${(checklist.open_occurrences_count ?? 0) > 0 ? 'text-amber-400' : ''}`}>
                {checklist.open_occurrences_count ?? 0}
              </p>
              <p className="text-xs text-slate-500">ocorrência(s) em aberto</p>
            </div>
          </div>

          {checklist.pending_items && (
            <div className="rounded-lg bg-amber-950/20 border border-amber-900/40 px-3 py-2">
              <p className="text-xs font-medium text-amber-400 mb-0.5">Pendências</p>
              <p className="text-xs text-slate-300">{checklist.pending_items}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div>
              <span className="text-slate-500">Sainte</span>
              <p className="text-slate-200">{h.outgoing_user.name}</p>
            </div>
            {h.incoming_user && (
              <div>
                <span className="text-slate-500">Entrante</span>
                <p className="text-slate-200">{h.incoming_user.name}</p>
              </div>
            )}
            <div>
              <span className="text-slate-500">Iniciada em</span>
              <p className="text-slate-200">{formatDatetime(h.handover_at)}</p>
            </div>
            {h.confirmed_at && (
              <div>
                <span className="text-slate-500">Confirmada em</span>
                <p className="text-slate-200">{formatDatetime(h.confirmed_at)}</p>
              </div>
            )}
          </div>

          {h.outgoing_observations && (
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Observações do sainte</p>
              <p className="text-xs text-slate-300 rounded-lg bg-slate-800/40 px-3 py-2">{h.outgoing_observations}</p>
            </div>
          )}
          {h.incoming_observations && (
            <div>
              <p className="text-xs text-slate-500 mb-0.5">Observações do entrante</p>
              <p className="text-xs text-slate-300 rounded-lg bg-slate-800/40 px-3 py-2">{h.incoming_observations}</p>
            </div>
          )}

          {/* Formulário de edição — apenas passagens confirmadas */}
          {h.status === 'CONFIRMED' && (
            <div className="pt-2 border-t border-slate-800">
              <p className="text-xs font-medium text-slate-400 mb-3">Editar observações</p>
              <EditHandoverForm
                handoverId={h.id}
                currentOutgoing={h.outgoing_observations ?? ''}
                currentIncoming={h.incoming_observations ?? ''}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center py-8">
          <p className="text-sm text-slate-500">Nenhuma passagem registrada.</p>
        </div>
      )}
    </div>
  )
}

```

### `src/app/gestor/turnos/instancias/[id]/task-actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'

const TENANT_ID = 'default'

async function requireManagerOrTechnician() {
  const session = await auth()
  if (!session || !['MANAGER', 'TECHNICIAN'].includes(session.user.role)) {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const AtribuirTarefaSchema = z.object({
  title: z.string({ error: 'Título obrigatório' })
    .min(3, 'Mínimo 3 caracteres')
    .max(120, 'Máximo 120 caracteres'),
  description: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(500).nullable(),
  ),
  assigned_to_id: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

// ─── Form state ───────────────────────────────────────────────────────────────

export type TaskFormState = {
  error?: string
  fieldErrors?: Record<string, string[]>
  success?: boolean
}

// ─── Atribuir tarefa ──────────────────────────────────────────────────────────

export async function atribuirTarefa(
  instanceId: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const session = await requireManagerOrTechnician()

  const parsed = AtribuirTarefaSchema.safeParse({
    title:          formData.get('title'),
    description:    formData.get('description'),
    assigned_to_id: formData.get('assigned_to_id'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const userId = await resolveUserId(session.user.email!)
  if (!userId) return { error: 'Sessão inválida.' }

  const instance = await prisma.shiftInstance.findFirst({
    where:  { id: instanceId, tenant_id: TENANT_ID },
    select: { status: true },
  })
  if (!instance)                    return { error: 'Instância não encontrada.' }
  if (instance.status === 'CLOSED') return { error: 'Não é possível adicionar tarefas a um turno fechado.' }

  // Garante que o operador atribuído pertence ao tenant e está ativo
  if (parsed.data.assigned_to_id) {
    const assignee = await prisma.user.findFirst({
      where:  { id: parsed.data.assigned_to_id, tenant_id: TENANT_ID, is_active: true, role: 'OPERATOR' },
      select: { id: true },
    })
    if (!assignee) return { error: 'Operador selecionado não encontrado ou inativo.' }
  }

  await prisma.shiftTask.create({
    data: {
      tenant_id:         TENANT_ID,
      shift_instance_id: instanceId,
      title:             parsed.data.title,
      description:       parsed.data.description,
      assigned_to_id:    parsed.data.assigned_to_id,
      created_by:        userId,
      status:            'PENDING',
    },
  })

  revalidatePath(`/gestor/turnos/instancias/${instanceId}`)
  return { success: true }
}

// ─── Remover tarefa ───────────────────────────────────────────────────────────
// Só PENDING pode ser removida — tarefas DONE/SKIPPED são histórico operacional

export async function removerTarefa(taskId: string): Promise<void> {
  await requireManagerOrTechnician()

  const task = await prisma.shiftTask.findFirst({
    where:  { id: taskId, tenant_id: TENANT_ID, status: 'PENDING' },
    select: { shift_instance_id: true },
  })
  if (!task) return

  await prisma.shiftTask.delete({ where: { id: taskId } })
  revalidatePath(`/gestor/turnos/instancias/${task.shift_instance_id}`)
}

```

### `src/app/gestor/turnos/instancias/[id]/task-form.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { atribuirTarefa, removerTarefa, type TaskFormState } from './task-actions'

const INITIAL: TaskFormState = {}

type Operator = { id: string; name: string }
type Task = {
  id: string
  title: string
  description: string | null
  status: string
  assignee: { name: string } | null
  creator: { name: string }
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  DONE:    'Concluída',
  SKIPPED: 'Pulada',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'border-slate-700 bg-slate-800/60 text-slate-400',
  DONE:    'border-green-900/50 bg-green-950/60 text-green-400',
  SKIPPED: 'border-slate-700/50 bg-slate-800/30 text-slate-500',
}

export function TaskForm({
  instanceId,
  operators,
  tasks,
  canAdd,
}: {
  instanceId: string
  operators:  Operator[]
  tasks:      Task[]
  canAdd:     boolean
}) {
  const boundAction = atribuirTarefa.bind(null, instanceId)
  const [state, formAction, isPending] = useActionState(boundAction, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <div className="space-y-4">
      {tasks.length === 0 ? (
        <p className="py-3 text-center text-xs text-slate-500">Nenhuma tarefa atribuída ainda.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-800/30 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-100">{task.title}</p>
                {task.description && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{task.description}</p>
                )}
                <p className="mt-1 text-xs text-slate-600">
                  {task.assignee ? `→ ${task.assignee.name}` : 'Qualquer operador'} · por {task.creator.name}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${STATUS_COLOR[task.status] ?? ''}`}>
                  {STATUS_LABEL[task.status] ?? task.status}
                </span>
                {task.status === 'PENDING' && canAdd && (
                  <form action={removerTarefa.bind(null, task.id)}>
                    <button type="submit" className="text-xs text-red-500 hover:text-red-400">
                      Remover
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canAdd && (
        <form ref={formRef} action={formAction} className="space-y-3 border-t border-slate-800 pt-3">
          <p className="text-xs font-medium text-slate-400">Nova tarefa</p>

          <div>
            <input
              name="title"
              required
              maxLength={120}
              placeholder="Título da tarefa *"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
            />
            {state.fieldErrors?.title && (
              <p className="mt-1 text-xs text-red-400">{state.fieldErrors.title[0]}</p>
            )}
          </div>

          <textarea
            name="description"
            rows={2}
            maxLength={500}
            placeholder="Descrição opcional"
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
          />

          <select
            name="assigned_to_id"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-emerald-600 focus:outline-none"
          >
            <option value="">Qualquer operador</option>
            {operators.map((op) => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>

          {state.error && (
            <p className="text-xs text-red-400">{state.error}</p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="h-9 w-full bg-slate-100 text-sm text-slate-900 hover:bg-white"
          >
            {isPending ? 'Salvando…' : '+ Atribuir tarefa'}
          </Button>
        </form>
      )}
    </div>
  )
}

```

### `src/app/gestor/turnos/novo/page.tsx`
```tsx
'use client'

import { useActionState } from 'react'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarTurno, type TurnoFormState } from '../actions'

const initialState: TurnoFormState = {}

export default function NovoTurnoPage() {
  const [state, formAction, isPending] = useActionState(criarTurno, initialState)

  return (
    <div className="flex items-start justify-center px-4 py-8">
      <div className="w-full max-w-lg space-y-6">
        <BackButton href="/gestor/turnos" label="Turnos" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-slate-100">Novo turno</h2>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input id="name" name="name" type="text" placeholder="Ex: Manhã, Tarde, Noite" required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500" />
              {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="start_time" className="text-sm font-medium text-slate-300">Início</label>
                <Input id="start_time" name="start_time" type="time" required disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
                {state.fieldErrors?.start_time && <p className="text-xs text-red-400">{state.fieldErrors.start_time[0]}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="end_time" className="text-sm font-medium text-slate-300">Término</label>
                <Input id="end_time" name="end_time" type="time" required disabled={isPending}
                  className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
                {state.fieldErrors?.end_time && <p className="text-xs text-red-400">{state.fieldErrors.end_time[0]}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="handover_timeout_minutes" className="text-sm font-medium text-slate-300">
                Timeout de passagem (minutos)
              </label>
              <Input id="handover_timeout_minutes" name="handover_timeout_minutes" type="number"
                min={30} max={480} defaultValue={120} required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
              {state.fieldErrors?.handover_timeout_minutes && (
                <p className="text-xs text-red-400">{state.fieldErrors.handover_timeout_minutes[0]}</p>
              )}
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="crosses_midnight" disabled={isPending}
                className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500" />
              <span className="text-sm text-slate-300">Cruza a meia-noite</span>
            </label>

            {state.error && (
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>
            )}

            <Button type="submit" disabled={isPending} className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
              {isPending ? 'Criando…' : 'Criar turno'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

```

### `src/app/gestor/usuarios/actions.ts`
```ts
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'
import { Prisma } from '@prisma/client'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { logAudit } from '@/lib/audit'

const TENANT_ID = 'default'

async function requireManager() {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    throw new Error('Acesso não autorizado')
  }
  return session
}

async function resolveUserId(email: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where:  { tenant_id_email: { tenant_id: TENANT_ID, email } },
    select: { id: true },
  })
  return user?.id ?? null
}

function gerarSenhaProvisoria(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = 'Sol@'
  for (let i = 0; i < 6; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
  return pwd
}

const UsuarioSchema = z.object({
  name:  z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  role:  z.enum(['OPERATOR', 'TECHNICIAN', 'MANAGER']),
})

export type UsuarioFormState = {
  error?:        string
  fieldErrors?:  Record<string, string[]>
  tempPassword?: string
}

// ─── Criar ──────────────────────────────────────────────────────────────────

export async function criarUsuario(
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const session = await requireManager()

  const parsed = UsuarioSchema.safeParse({
    name:  formData.get('name'),
    email: formData.get('email'),
    role:  formData.get('role'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const [managerId, tempPassword] = [
    await resolveUserId(session.user.email!),
    gerarSenhaProvisoria(),
  ]
  const passwordHash = await hashPassword(tempPassword)

  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          tenant_id:            TENANT_ID,
          name:                 parsed.data.name,
          email:                parsed.data.email,
          role:                 parsed.data.role,
          password_hash:        passwordHash,
          must_change_password: true,
          is_active:            true,
        },
        select: { id: true },
      })
      await logAudit(tx, {
        userId:    managerId,
        action:    'CREATE',
        tableName: 'users',
        recordId:  created.id,
        after:     { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role, is_active: true },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { email: ['E-mail já cadastrado'] } }
    }
    return { error: 'Erro ao criar usuário. Tente novamente.' }
  }

  revalidatePath('/gestor/usuarios')
  return { tempPassword }
}

// ─── Editar ──────────────────────────────────────────────────────────────────

export async function editarUsuario(
  userId: string,
  _prev: UsuarioFormState,
  formData: FormData,
): Promise<UsuarioFormState> {
  const session = await requireManager()

  const parsed = UsuarioSchema.safeParse({
    name:  formData.get('name'),
    email: formData.get('email'),
    role:  formData.get('role'),
  })
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  const [current, managerId] = await Promise.all([
    prisma.user.findUnique({
      where:  { id: userId },
      select: { name: true, email: true, role: true },
    }),
    resolveUserId(session.user.email!),
  ])
  if (!current) return { error: 'Usuário não encontrado.' }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data:  { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role },
      })
      await logAudit(tx, {
        userId:    managerId,
        action:    'UPDATE',
        tableName: 'users',
        recordId:  userId,
        before:    { name: current.name, email: current.email, role: current.role },
        after:     { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role },
      })
    })
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      return { fieldErrors: { email: ['E-mail já cadastrado'] } }
    }
    return { error: 'Erro ao salvar alterações. Tente novamente.' }
  }

  revalidatePath('/gestor/usuarios')
  redirect('/gestor/usuarios')
}

// ─── Toggle ativo (soft-delete / reativação) ─────────────────────────────────

export async function toggleAtivo(
  userId: string,
): Promise<{ error?: string }> {
  const session = await requireManager()

  const [user, managerId] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { is_active: true } }),
    resolveUserId(session.user.email!),
  ])
  if (!user) return { error: 'Usuário não encontrado.' }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data:  { is_active: !user.is_active },
    })
    await logAudit(tx, {
      userId:    managerId,
      action:    'UPDATE',
      tableName: 'users',
      recordId:  userId,
      before:    { is_active:  user.is_active  },
      after:     { is_active: !user.is_active  },
    })
  })

  revalidatePath('/gestor/usuarios')
  revalidatePath(`/gestor/usuarios/${userId}`)
  return {}
}

// ─── Resetar senha ───────────────────────────────────────────────────────────

export async function resetarSenha(
  userId: string,
): Promise<{ error?: string; tempPassword?: string }> {
  const session = await requireManager()

  const [user, managerId] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
    resolveUserId(session.user.email!),
  ])
  if (!user) return { error: 'Usuário não encontrado.' }

  const tempPassword = gerarSenhaProvisoria()
  const passwordHash = await hashPassword(tempPassword)

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data:  { password_hash: passwordHash, must_change_password: true },
    })
    await logAudit(tx, {
      userId:    managerId,
      action:    'UPDATE',
      tableName: 'users',
      recordId:  userId,
      after:     { must_change_password: true },
    })
  })

  return { tempPassword }
}

```

### `src/app/gestor/usuarios/page.tsx`
```tsx
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const ROLE_LABELS: Record<string, string> = {
  MANAGER:    'Gestor',
  TECHNICIAN: 'Técnico',
  OPERATOR:   'Operador',
}

const ROLE_COLORS: Record<string, string> = {
  MANAGER:    'bg-emerald-900/60 text-emerald-400',
  TECHNICIAN: 'bg-sky-900/60 text-sky-400',
  OPERATOR:   'bg-amber-900/60 text-amber-400',
}

function formatDate(date: Date | null): string {
  if (!date) return 'Nunca'
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const search = q?.trim() ?? ''

  const users = await prisma.user.findMany({
    where: {
      tenant_id: 'default',
      ...(search
        ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
        : {}),
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true, name: true, email: true, role: true,
      is_active: true, last_login_at: true, must_change_password: true,
    },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Usuários</h1>
          <p className="text-sm text-slate-400">Gerencie contas de acesso ao sistema.</p>
        </div>
        <Link href="/gestor/usuarios/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">
            + Novo usuário
          </Button>
        </Link>
      </div>

      {/* Busca */}
      <form method="GET" className="flex gap-2">
        <input
          name="q"
          defaultValue={search}
          placeholder="Buscar por nome ou e-mail…"
          className="h-10 flex-1 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500"
        />
        <Button type="submit" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
          Buscar
        </Button>
        {search && (
          <Link href="/gestor/usuarios">
            <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
              Limpar
            </Button>
          </Link>
        )}
      </form>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {users.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? `Nenhum usuário encontrado para "${search}".` : 'Nenhum usuário cadastrado.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Último login</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                    {u.must_change_password && (
                      <span className="text-xs text-amber-500">Senha provisória</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-slate-800 text-slate-400'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(u.last_login_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/usuarios/${u.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
                        Editar
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-right text-xs text-slate-600">{users.length} usuário(s) encontrado(s)</p>
    </main>
  )
}

```

### `src/app/gestor/usuarios/[id]/edit-form.tsx`
```tsx
'use client'

import { useActionState, useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { BackButton } from '@/components/back-button'
import { Input } from '@/components/ui/input'
import { editarUsuario, toggleAtivo, resetarSenha, type UsuarioFormState } from '../actions'

type User = {
  id:                   string
  name:                 string
  email:                string
  role:                 string
  is_active:            boolean
  must_change_password: boolean
}

const initialState: UsuarioFormState = {}

export function EditForm({ user }: { user: User }) {
  const router = useRouter()
  const [isPendingAction, startTransition] = useTransition()

  const editAction = editarUsuario.bind(null, user.id)
  const [state, formAction, isPendingForm] = useActionState(editAction, initialState)

  const [actionError, setActionError]   = useState<string | null>(null)
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [copiedReset, setCopiedReset]   = useState(false)
  const [isActive, setIsActive]         = useState(user.is_active)

  const isPending = isPendingForm || isPendingAction

  function handleToggleAtivo() {
    const msg = isActive
      ? 'Tem certeza que deseja desativar este usuário? Esta ação pode ser revertida.'
      : 'Reativar este usuário?'
    if (!confirm(msg)) return

    setActionError(null)
    startTransition(async () => {
      const result = await toggleAtivo(user.id)
      if (result.error) {
        setActionError(result.error)
      } else {
        setIsActive((v) => !v)
        router.refresh()
      }
    })
  }

  function handleResetarSenha() {
    if (!confirm('Gerar nova senha provisória para este usuário? A senha atual será invalidada.')) return

    setActionError(null)
    setTempPassword(null)
    startTransition(async () => {
      const result = await resetarSenha(user.id)
      if (result.error) {
        setActionError(result.error)
      } else if (result.tempPassword) {
        setTempPassword(result.tempPassword)
      }
    })
  }

  async function handleCopyReset() {
    if (!tempPassword) return
    await navigator.clipboard.writeText(tempPassword)
    setCopiedReset(true)
    setTimeout(() => setCopiedReset(false), 2000)
  }

  return (
    <main className="px-6 py-8 space-y-6 max-w-2xl">
      {/* Breadcrumb */}
      <BackButton href="/gestor/usuarios" label="Usuários" />

      {/* Título + status */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold">{user.name}</h1>
          <p className="text-sm text-slate-400">{user.email}</p>
        </div>
        {isActive ? (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
          </span>
        ) : (
          <span className="mt-1 flex items-center gap-1.5 text-xs text-red-400">
            <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
          </span>
        )}
      </div>

      {/* Formulário de edição */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
        <h2 className="text-base font-medium text-slate-200">Dados do usuário</h2>

        <form action={formAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
            <Input
              id="name" name="name" type="text"
              defaultValue={user.name}
              required disabled={isPending}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
            />
            {state.fieldErrors?.name && (
              <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-slate-300">E-mail</label>
            <Input
              id="email" name="email" type="email"
              defaultValue={user.email}
              required disabled={isPending}
              className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
            />
            {state.fieldErrors?.email && (
              <p className="text-xs text-red-400">{state.fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="role" className="text-sm font-medium text-slate-300">Perfil</label>
            <select
              id="role" name="role"
              defaultValue={user.role}
              required disabled={isPending}
              className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
            >
              <option value="OPERATOR">Operador</option>
              <option value="TECHNICIAN">Técnico</option>
              <option value="MANAGER">Gestor</option>
            </select>
            {state.fieldErrors?.role && (
              <p className="text-xs text-red-400">{state.fieldErrors.role[0]}</p>
            )}
          </div>

          {state.error && (
            <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}

          <Button
            type="submit" disabled={isPending}
            className="bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
          >
            {isPendingForm ? 'Salvando…' : 'Salvar alterações'}
          </Button>
        </form>
      </div>

      {/* Nova senha provisória gerada pelo reset */}
      {tempPassword && (
        <div className="rounded-xl border border-amber-800/50 bg-amber-950/30 p-5 space-y-3">
          <div>
            <h3 className="text-sm font-medium text-amber-300">Nova senha provisória gerada</h3>
            <p className="mt-0.5 text-xs text-amber-400/70">
              Envie esta senha ao usuário. Ele deverá alterá-la no próximo acesso.
            </p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
            <code className="font-mono text-base tracking-widest text-amber-300">{tempPassword}</code>
            <Button
              type="button" variant="ghost" size="sm"
              onClick={handleCopyReset}
              className="shrink-0 text-slate-400 hover:text-slate-100"
            >
              {copiedReset ? 'Copiado!' : 'Copiar'}
            </Button>
          </div>
        </div>
      )}

      {/* Ações */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-medium text-slate-200">Ações</h2>

        {actionError && (
          <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {actionError}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button" variant="outline" disabled={isPending}
            onClick={handleResetarSenha}
            className="border-slate-700 text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {isPendingAction ? 'Aguarde…' : 'Resetar senha'}
          </Button>

          <Button
            type="button" variant="outline" disabled={isPending}
            onClick={handleToggleAtivo}
            className={
              isActive
                ? 'border-red-800/60 text-red-400 hover:bg-red-950/30 disabled:opacity-50'
                : 'border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50'
            }
          >
            {isPendingAction ? 'Aguarde…' : isActive ? 'Desativar usuário' : 'Reativar usuário'}
          </Button>
        </div>
      </div>
    </main>
  )
}

```

### `src/app/gestor/usuarios/[id]/page.tsx`
```tsx
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound } from 'next/navigation'
import { EditForm } from './edit-form'

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session) redirect('/login')

  const { id } = await params

  const user = await prisma.user.findUnique({
    where:  { id },
    select: {
      id: true, name: true, email: true, role: true,
      is_active: true, must_change_password: true,
    },
  })

  if (!user) notFound()

  return <EditForm user={user} />
}

```

### `src/app/gestor/usuarios/novo/page.tsx`
```tsx
'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarUsuario, type UsuarioFormState } from '../actions'

const initialState: UsuarioFormState = {}

export default function NovoUsuarioPage() {
  const [state, formAction, isPending] = useActionState(criarUsuario, initialState)
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!state.tempPassword) return
    await navigator.clipboard.writeText(state.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Sucesso: exibe senha provisória ─────────────────────────────────────
  if (state.tempPassword) {
    return (
      <div className="px-4 py-8 flex items-start justify-center">
        <div className="w-full max-w-sm space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-100">Usuário criado</h2>
              <p className="text-xs text-slate-400">
                Anote a senha provisória e envie ao usuário. Ele deverá alterá-la no primeiro acesso.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
              <code className="font-mono text-base tracking-widest text-amber-300">
                {state.tempPassword}
              </code>
              <Button
                type="button" variant="ghost" size="sm"
                onClick={handleCopy}
                className="shrink-0 text-slate-400 hover:text-slate-100"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>

            <div className="flex gap-2 pt-1">
              <Link href="/gestor/usuarios" className="flex-1">
                <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white">
                  Ver lista de usuários
                </Button>
              </Link>
              <Link href="/gestor/usuarios/novo" className="flex-1">
                <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                  Criar outro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulário ───────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-8 flex items-start justify-center">
      <div className="w-full max-w-sm space-y-6">
        <BackButton href="/gestor/usuarios" label="Usuários" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Novo usuário</h2>
            <p className="text-xs text-slate-400">Uma senha provisória será gerada automaticamente.</p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input
                id="name" name="name" type="text"
                placeholder="Nome completo"
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.name && (
                <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">E-mail</label>
              <Input
                id="email" name="email" type="email"
                placeholder="usuario@email.com"
                required disabled={isPending}
                className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500"
              />
              {state.fieldErrors?.email && (
                <p className="text-xs text-red-400">{state.fieldErrors.email[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="role" className="text-sm font-medium text-slate-300">Perfil</label>
              <select
                id="role" name="role"
                required disabled={isPending}
                defaultValue=""
                className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50"
              >
                <option value="" disabled>Selecione um perfil</option>
                <option value="OPERATOR">Operador</option>
                <option value="TECHNICIAN">Técnico</option>
                <option value="MANAGER">Gestor</option>
              </select>
              {state.fieldErrors?.role && (
                <p className="text-xs text-red-400">{state.fieldErrors.role[0]}</p>
              )}
            </div>

            {state.error && (
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                {state.error}
              </p>
            )}

            <Button
              type="submit" disabled={isPending}
              className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
            >
              {isPending ? 'Criando…' : 'Criar usuário'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

```

---
## API ROUTES

### `src/app/api/auth/[...nextauth]/route.ts`
```ts
import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers

```

### `src/app/api/occurrences/[id]/photo/route.ts`
```ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

const TENANT_ID = 'default'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params

  const photo = await prisma.occurrencePhoto.findFirst({
    where: {
      occurrence_id: id,
      tenant_id:     TENANT_ID,
    },
    select: { filename: true, mime_type: true },
  })

  if (!photo) {
    return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
  }

  const filePath = path.join(process.cwd(), 'uploads', 'occurrences', photo.filename)

  try {
    const buffer = await fs.readFile(filePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        photo.mime_type,
        'Cache-Control':       'private, max-age=3600',
        'Content-Disposition': 'inline',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Arquivo não encontrado no disco' }, { status: 404 })
  }
}

```

### `src/app/api/shift-task-photos/[id]/route.ts`
```ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'

const TENANT_ID = 'default'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { id } = await params

  const photo = await prisma.shiftTaskPhoto.findFirst({
    where:  { id, tenant_id: TENANT_ID },
    select: { filename: true, mime_type: true },
  })

  if (!photo) {
    return NextResponse.json({ error: 'Foto não encontrada' }, { status: 404 })
  }

  const filePath = path.join(process.cwd(), 'uploads', 'tasks', photo.filename)

  try {
    const buffer = await fs.readFile(filePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type':        photo.mime_type,
        'Cache-Control':       'private, max-age=3600',
        'Content-Disposition': 'inline',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Arquivo não encontrado no disco' }, { status: 404 })
  }
}

```

---
## TESTES (VITEST)

### `src/lib/__tests__/analises.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { calcularNaoConformidade } from '@/lib/readings-utils'

// Os testes de análise reutilizam calcularNaoConformidade (mesma lógica que leituras).
// O que é específico de análises: snapshots imutáveis e is_non_conformant sempre boolean.

// ─── Cenário 1: análise conforme (dentro dos limites) ────────────────────────
describe('análise conforme — is_non_conformant deve ser false', () => {
  it('DBO5 = 30 mg/L dentro do limite máximo de 60 mg/L', () => {
    expect(calcularNaoConformidade(30, null, 60)).toBe(false)
  })

  it('pH = 7,5 dentro da faixa 6,0 – 9,0', () => {
    expect(calcularNaoConformidade(7.5, 6, 9)).toBe(false)
  })

  it('valor exatamente no limite máximo é conforme (boundary inclusive)', () => {
    expect(calcularNaoConformidade(60, null, 60)).toBe(false)
  })
})

// ─── Cenário 2: análise não-conforme ─────────────────────────────────────────
describe('análise não-conforme — is_non_conformant deve ser true', () => {
  it('pH = 11 acima do limite máximo 9 (critério de aceite da Fase 6)', () => {
    expect(calcularNaoConformidade(11, 6, 9)).toBe(true)
  })

  it('DBO5 = 120 mg/L excede o limite máximo de 60 mg/L', () => {
    expect(calcularNaoConformidade(120, null, 60)).toBe(true)
  })
})

// ─── Cenário 3: snapshots imutáveis — lógica de aplicação ────────────────────
// O snapshot é capturado no momento do save (Server Action).
// Este teste verifica que o cálculo usa os limites fornecidos, não os atuais do BD.
describe('snapshot de limites — cálculo usa os limites informados', () => {
  it('se o limite era 9 no momento da coleta, pH=10 é não-conforme mesmo que o limite atual seja 11', () => {
    const minLimitApplied = null
    const maxLimitApplied = 9   // snapshot do momento da coleta
    expect(calcularNaoConformidade(10, minLimitApplied, maxLimitApplied)).toBe(true)
  })

  it('parâmetro sem limites definidos → false (nunca null em análises)', () => {
    const result = calcularNaoConformidade(999, null, null) ?? false
    expect(result).toBe(false)
  })
})

```

### `src/lib/__tests__/auth.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/password'
import {
  isRateLimited,
  isRouteAllowedForRole,
  RATE_LIMIT_MAX_ATTEMPTS,
} from '@/lib/auth-utils'

// ─── Cenário 1: senha correta autentica ──────────────────────────────────────
describe('verifyPassword — senha correta', () => {
  it('retorna true quando a senha bate com o hash', async () => {
    const hash = await hashPassword('Solentis@2026')
    const result = await verifyPassword('Solentis@2026', hash)
    expect(result).toBe(true)
  })
})

// ─── Cenário 2: senha errada rejeita ─────────────────────────────────────────
describe('verifyPassword — senha errada', () => {
  it('retorna false quando a senha não bate com o hash', async () => {
    const hash = await hashPassword('Solentis@2026')
    const result = await verifyPassword('senhaErrada!', hash)
    expect(result).toBe(false)
  })
})

// ─── Cenário 3: rate limit bloqueia após MAX tentativas ──────────────────────
describe('isRateLimited — controle de tentativas', () => {
  it(`bloqueia com ${RATE_LIMIT_MAX_ATTEMPTS} ou mais falhas recentes`, () => {
    expect(isRateLimited(RATE_LIMIT_MAX_ATTEMPTS)).toBe(true)
    expect(isRateLimited(RATE_LIMIT_MAX_ATTEMPTS + 1)).toBe(true)
  })

  it(`libera com menos de ${RATE_LIMIT_MAX_ATTEMPTS} falhas`, () => {
    expect(isRateLimited(RATE_LIMIT_MAX_ATTEMPTS - 1)).toBe(false)
    expect(isRateLimited(0)).toBe(false)
  })
})

// ─── Cenário 4: controle de acesso por perfil ────────────────────────────────
describe('isRouteAllowedForRole — acesso por prefixo de rota', () => {
  it('MANAGER acessa /gestor', () => {
    expect(isRouteAllowedForRole('/gestor/dashboard', 'MANAGER')).toBe(true)
  })

  it('OPERATOR é bloqueado em /gestor', () => {
    expect(isRouteAllowedForRole('/gestor/dashboard', 'OPERATOR')).toBe(false)
  })

  it('TECHNICIAN é bloqueado em /gestor', () => {
    expect(isRouteAllowedForRole('/gestor/dashboard', 'TECHNICIAN')).toBe(false)
  })

  it('OPERATOR acessa /operador', () => {
    expect(isRouteAllowedForRole('/operador/dashboard', 'OPERATOR')).toBe(true)
  })

  it('MANAGER é bloqueado em /operador', () => {
    expect(isRouteAllowedForRole('/operador/dashboard', 'MANAGER')).toBe(false)
  })

  it('rotas sem prefixo de perfil são livres para qualquer role', () => {
    expect(isRouteAllowedForRole('/acesso-negado', 'OPERATOR')).toBe(true)
    expect(isRouteAllowedForRole('/login', 'MANAGER')).toBe(true)
  })
})

```

### `src/lib/__tests__/equipamentos.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { addDays, isOverdue } from '@/lib/equipment-utils'

// ─── addDays ─────────────────────────────────────────────────────────────────

describe('addDays — agendamento de preventivas', () => {
  it('adiciona 30 dias corretamente', () => {
    const base   = new Date('2026-01-01T00:00:00.000Z')
    const result = addDays(base, 30)
    expect(result.getUTCDate()).toBe(31)
    expect(result.getUTCMonth()).toBe(0) // janeiro
  })

  it('atravessa virada de mês', () => {
    const base   = new Date('2026-01-20T00:00:00.000Z')
    const result = addDays(base, 30)
    expect(result.getUTCMonth()).toBe(1) // fevereiro
    expect(result.getUTCDate()).toBe(19)
  })

  it('atravessa virada de ano', () => {
    const base   = new Date('2026-12-20T00:00:00.000Z')
    const result = addDays(base, 30)
    expect(result.getUTCFullYear()).toBe(2027)
  })

  it('não muta a data original', () => {
    const base    = new Date('2026-06-01T00:00:00.000Z')
    const original = base.toISOString()
    addDays(base, 15)
    expect(base.toISOString()).toBe(original)
  })

  it('frequência de 1 dia agenda para amanhã', () => {
    const base   = new Date('2026-05-21T12:00:00.000Z')
    const result = addDays(base, 1)
    expect(result.getUTCDate()).toBe(22)
  })
})

// ─── isOverdue ────────────────────────────────────────────────────────────────

describe('isOverdue — detecção de preventiva vencida', () => {
  it('data passada é considerada vencida', () => {
    const scheduled = new Date('2026-05-01')
    const today     = new Date('2026-05-21')
    expect(isOverdue(scheduled, today)).toBe(true)
  })

  it('data futura não é vencida', () => {
    const scheduled = new Date('2026-06-01')
    const today     = new Date('2026-05-21')
    expect(isOverdue(scheduled, today)).toBe(false)
  })

  it('data igual à hoje não é vencida (boundary inclusive)', () => {
    const scheduled = new Date('2026-05-21')
    const today     = new Date('2026-05-21')
    expect(isOverdue(scheduled, today)).toBe(false)
  })

  it('ignora a hora — apenas a data importa', () => {
    // Agendado às 23:59 do dia anterior → vencido hoje
    const scheduled = new Date('2026-05-20T23:59:59')
    const today     = new Date('2026-05-21T00:00:01')
    expect(isOverdue(scheduled, today)).toBe(true)
  })
})

```

### `src/lib/__tests__/estoque.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import {
  calcularEstoqueAtual,
  estaAbaixoMinimo,
  calcularDivergencia,
  formatarQuantidade,
} from '@/lib/stock-utils'

describe('calcularEstoqueAtual', () => {
  it('retorna diferença entre entradas e saídas', () => {
    expect(calcularEstoqueAtual(100, 30)).toBe(70)
  })

  it('retorna zero quando entradas igualam saídas', () => {
    expect(calcularEstoqueAtual(50, 50)).toBe(0)
  })

  it('retorna valor negativo quando saídas excedem entradas', () => {
    expect(calcularEstoqueAtual(10, 25)).toBe(-15)
  })

  it('retorna zero quando não há movimentação', () => {
    expect(calcularEstoqueAtual(0, 0)).toBe(0)
  })
})

describe('estaAbaixoMinimo', () => {
  it('dispara alerta quando calculado abaixo do mínimo', () => {
    expect(estaAbaixoMinimo(5, null, 10)).toBe(true)
  })

  it('dispara alerta quando físico abaixo do mínimo (mesmo calculado ok)', () => {
    expect(estaAbaixoMinimo(15, 4, 10)).toBe(true)
  })

  it('não dispara quando calculado e físico estão ok', () => {
    expect(estaAbaixoMinimo(15, 12, 10)).toBe(false)
  })

  it('não dispara quando físico é null e calculado está ok', () => {
    expect(estaAbaixoMinimo(20, null, 10)).toBe(false)
  })

  it('dispara quando calculado negativo e mínimo zero', () => {
    expect(estaAbaixoMinimo(-1, null, 0)).toBe(true)
  })

  it('não dispara quando tudo é zero e mínimo é zero', () => {
    expect(estaAbaixoMinimo(0, 0, 0)).toBe(false)
  })
})

describe('calcularDivergencia', () => {
  it('retorna null quando não há contagem física', () => {
    expect(calcularDivergencia(50, null)).toBeNull()
  })

  it('retorna zero quando físico igual ao calculado', () => {
    expect(calcularDivergencia(50, 50)).toBe(0)
  })

  it('retorna valor negativo quando físico menor que calculado (perda)', () => {
    expect(calcularDivergencia(50, 42)).toBe(-8)
  })

  it('retorna valor positivo quando físico maior que calculado (ganho/erro)', () => {
    expect(calcularDivergencia(30, 35)).toBe(5)
  })
})

describe('formatarQuantidade', () => {
  it('formata número inteiro sem decimais', () => {
    expect(formatarQuantidade(100)).toBe('100')
  })

  it('formata número decimal com 2 casas', () => {
    expect(formatarQuantidade(10.5)).toBe('10.50')
  })

  it('formata zero como inteiro', () => {
    expect(formatarQuantidade(0)).toBe('0')
  })

  it('formata valor negativo inteiro sem decimais', () => {
    expect(formatarQuantidade(-15)).toBe('-15')
  })
})

```

### `src/lib/__tests__/fase11-criticos.test.ts`
```ts
/**
 * Testes dos 13 cenários críticos — Briefing seção 5
 *
 * Cenários 1 e 2 (localStorage e reconexão automática): testes manuais — ver RUNBOOK
 * Cenário  4 (RUNBOOK com recomendação de no-break): documentação — ver RUNBOOK
 * Cenários 5, 10, 12 têm cobertura primária em analises/equipamentos/auth.test.ts;
 *   aqui são validados pelo ângulo dos critérios de aceite específicos do briefing.
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { calcularNaoConformidade } from '@/lib/readings-utils'
import { isOverdue, addDays }       from '@/lib/equipment-utils'
import { isRouteAllowedForRole, getDashboardRoute } from '@/lib/auth-utils'

// ── Schemas inline (espelham os das Server Actions; testam a lógica pura) ─────

const EditHandoverSchema = z.object({
  justification: z.string().min(10, 'Justificativa deve ter ao menos 10 caracteres'),
  outgoing_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  incoming_observations: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
})

const LeituraSchema = z.object({
  collection_point_id: z.string().min(1, 'Selecione o ponto de coleta'),
  parameter_id: z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().nullable(),
  ),
  value: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().nullable(),
  ),
  recorded_at: z.string().min(1, 'Informe a data/hora da leitura'),
}).refine(
  (d) => d.parameter_id === null || d.value !== null,
  { message: 'Informe o valor medido', path: ['value'] },
)

const OcorrenciaSchema = z.object({
  description: z.string().min(5, 'Descreva a ocorrência em pelo menos 5 caracteres'),
  severity:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
})

// Espelha normalizarData() de turnos/actions.ts — apenas data, sem hora
function normalizarParaMeiaNite(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── Cenário 3 — Integridade transacional ────────────────────────────────────
// A validação Zod ocorre ANTES de qualquer escrita no banco.
// Se o schema rejeita, a Server Action retorna erro e o $transaction nunca abre.

describe('Cenário 3 — Integridade transacional: Zod bloqueia antes do banco', () => {
  it('LeituraSchema rejeita quando ponto de coleta está vazio', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: '',
      parameter_id:        null,
      value:               null,
      recorded_at:         '2026-05-26T10:00',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('Selecione o ponto'))).toBe(true)
  })

  it('LeituraSchema rejeita quando parâmetro é informado mas valor está ausente', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: 'ponto-1',
      parameter_id:        'param-1',
      value:               null,
      recorded_at:         '2026-05-26T10:00',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('Informe o valor medido'))).toBe(true)
  })

  it('LeituraSchema rejeita data/hora ausente', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: 'ponto-1',
      parameter_id:        null,
      value:               null,
      recorded_at:         '',
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('data/hora'))).toBe(true)
  })

  it('OcorrenciaSchema rejeita descrição com menos de 5 caracteres', () => {
    const r = OcorrenciaSchema.safeParse({ description: 'abc', severity: 'LOW' })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('5 caracteres'))).toBe(true)
  })

  it('OcorrenciaSchema rejeita severidade fora do enum', () => {
    const r = OcorrenciaSchema.safeParse({ description: 'Descrição válida aqui', severity: 'ULTRA' })
    expect(r.success).toBe(false)
  })

  it('OcorrenciaSchema aceita dados completamente válidos', () => {
    const r = OcorrenciaSchema.safeParse({ description: 'Vazamento no reator', severity: 'HIGH' })
    expect(r.success).toBe(true)
  })
})

// ─── Cenário 5 — Análise fora do limite → is_non_conformant = true ────────────
// Cobertura primária: analises.test.ts (pH=11, DBO5=120, boundaries).
// Aqui: validação do critério de aceite literal do briefing.

describe('Cenário 5 — Não-conformidade detectada e sinalizada', () => {
  it('pH = 11 com limite máximo 9 → não-conforme (critério de aceite da Fase 6)', () => {
    expect(calcularNaoConformidade(11, null, 9)).toBe(true)
  })

  it('pH = 7 com faixa 6–9 → conforme', () => {
    expect(calcularNaoConformidade(7, 6, 9)).toBe(false)
  })

  it('valor exatamente no limite máximo → conforme (boundary inclusivo CONAMA)', () => {
    expect(calcularNaoConformidade(9, null, 9)).toBe(false)
  })
})

// ─── Cenário 6 — Non-MANAGER tenta editar turno fechado → bloqueado ──────────
// A rota /gestor/turnos/instancias/* exige MANAGER.
// O middleware (ROLE_PREFIXES) bloqueia OPERATOR e TECHNICIAN antes de chegar na action.

describe('Cenário 6 — Acesso por perfil: apenas MANAGER edita passagens de turno', () => {
  it('OPERATOR é bloqueado em /gestor/turnos/instancias', () => {
    expect(isRouteAllowedForRole('/gestor/turnos/instancias/abc/editar', 'OPERATOR')).toBe(false)
  })

  it('TECHNICIAN é bloqueado em /gestor/turnos/instancias', () => {
    expect(isRouteAllowedForRole('/gestor/turnos/instancias/abc/editar', 'TECHNICIAN')).toBe(false)
  })

  it('MANAGER acessa /gestor/turnos/instancias', () => {
    expect(isRouteAllowedForRole('/gestor/turnos/instancias/abc', 'MANAGER')).toBe(true)
  })
})

// ─── Cenário 7 — MANAGER edita sem justificativa → schema bloqueia ───────────

describe('Cenário 7 — EditHandoverSchema: justificativa obrigatória (≥ 10 chars)', () => {
  it('justificativa vazia → inválido', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         '',
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.message.includes('10 caracteres'))).toBe(true)
  })

  it('justificativa com 9 chars → inválido (um abaixo do mínimo)', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         '123456789', // 9 chars
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
  })

  it('campo justification ausente → inválido', () => {
    const r = EditHandoverSchema.safeParse({
      outgoing_observations: 'Obs válida',
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
  })
})

// ─── Cenário 8 — MANAGER edita com justificativa → schema aceita ─────────────

describe('Cenário 8 — EditHandoverSchema: justificativa válida é aceita', () => {
  it('justificativa com 10+ chars → válido', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         'Correção solicitada pelo supervisor após revisão.',
      outgoing_observations: 'Turno sem incidentes.',
      incoming_observations: null,
    })
    expect(r.success).toBe(true)
  })

  it('observações opcionais em branco são normalizadas para null pelo preprocess', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         'Ajuste de registro conforme auditoria 2026.',
      outgoing_observations: '',
      incoming_observations: '',
    })
    expect(r.success).toBe(true)
    if (r.success) {
      expect(r.data.outgoing_observations).toBeNull()
      expect(r.data.incoming_observations).toBeNull()
    }
  })

  it('justificativa exatamente com 10 chars → válido (boundary)', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         '1234567890', // exatamente 10 chars
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(true)
  })
})

// ─── Cenário 9 — Dois operadores tentam abrir o mesmo turno → bloqueado ──────
// A lógica de bloqueio usa $transaction com findFirst por (shift_id, date, status).
// Aqui testamos que a normalização de data garante que instâncias do mesmo dia
// colidam, independente do horário em que foram abertas.

describe('Cenário 9 — Turno duplicado: normalização de data garante unicidade diária', () => {
  it('abertura às 07h e às 15h no mesmo dia produzem a mesma meia-noite', () => {
    const manha = normalizarParaMeiaNite(new Date('2026-05-26T07:00:00'))
    const tarde = normalizarParaMeiaNite(new Date('2026-05-26T15:00:00'))
    expect(manha.getTime()).toBe(tarde.getTime())
  })

  it('abertura à 22h30 também cai na meia-noite do mesmo dia', () => {
    const noite   = normalizarParaMeiaNite(new Date('2026-05-26T22:30:00'))
    const referencia = normalizarParaMeiaNite(new Date('2026-05-26T00:00:00'))
    expect(noite.getTime()).toBe(referencia.getTime())
  })

  it('dias diferentes produzem meia-noites diferentes → não colidem', () => {
    const hoje   = normalizarParaMeiaNite(new Date('2026-05-26T10:00:00'))
    const amanha = normalizarParaMeiaNite(new Date('2026-05-27T06:00:00'))
    expect(hoje.getTime()).not.toBe(amanha.getTime())
  })
})

// ─── Cenário 10 — Equipamento com preventiva vencida → destaque vermelho ─────
// Cobertura primária: equipamentos.test.ts (addDays, isOverdue + boundaries).
// Aqui: critério de aceite do briefing — "equipamento vencido → destaque vermelho".

describe('Cenário 10 — isOverdue: equipamento com preventiva atrasada é sinalizado', () => {
  it('preventiva agendada para ontem → vencida', () => {
    const today = new Date()
    expect(isOverdue(addDays(today, -1), today)).toBe(true)
  })

  it('preventiva agendada para hoje → não vencida (boundary)', () => {
    const today = new Date()
    expect(isOverdue(today, today)).toBe(false)
  })

  it('preventiva agendada para amanhã → não vencida', () => {
    const today = new Date()
    expect(isOverdue(addDays(today, 1), today)).toBe(false)
  })
})

// ─── Cenário 11 — Primeiro login com credencial provisória → troca de senha ──
// O redirect para /trocar-senha quando mustChangePassword=true está no middleware.
// O test E2E manual está documentado no RUNBOOK.
// Aqui: getDashboardRoute garante que o destino pós-troca é o dashboard correto.

describe('Cenário 11 — must_change_password: dashboard correto após troca de senha', () => {
  it('MANAGER é direcionado para /gestor/dashboard', () => {
    expect(getDashboardRoute('MANAGER')).toBe('/gestor/dashboard')
  })

  it('TECHNICIAN é direcionado para /tecnico/dashboard', () => {
    expect(getDashboardRoute('TECHNICIAN')).toBe('/tecnico/dashboard')
  })

  it('OPERATOR é direcionado para /operador/dashboard', () => {
    expect(getDashboardRoute('OPERATOR')).toBe('/operador/dashboard')
  })

  it('role desconhecida cai no /login (fallback seguro)', () => {
    expect(getDashboardRoute('DESCONHECIDO')).toBe('/login')
  })
})

// ─── Cenário 12 — Login com perfil errado → mensagem clara ───────────────────
// Cobertura primária: auth.test.ts (isRouteAllowedForRole — 6 cenários).

describe('Cenário 12 — Acesso com perfil errado é bloqueado sem expor detalhes', () => {
  it('OPERATOR bloqueado em /gestor/usuarios', () => {
    expect(isRouteAllowedForRole('/gestor/usuarios', 'OPERATOR')).toBe(false)
  })

  it('TECHNICIAN bloqueado em /operador/leituras', () => {
    expect(isRouteAllowedForRole('/operador/leituras', 'TECHNICIAN')).toBe(false)
  })

  it('rotas sem prefixo de perfil são livres para qualquer role', () => {
    expect(isRouteAllowedForRole('/acesso-negado', 'OPERATOR')).toBe(true)
    expect(isRouteAllowedForRole('/login', 'MANAGER')).toBe(true)
  })
})

// ─── Cenário 13 — Importação de dado inválido → banco não é corrompido ────────
// O Zod valida antes de qualquer escrita; dados inválidos nunca chegam ao banco.

describe('Cenário 13 — Dado inválido: validação impede corrupção do banco', () => {
  it('LeituraSchema rejeita value não-numérico (preprocess converte para NaN)', () => {
    const r = LeituraSchema.safeParse({
      collection_point_id: 'ponto-1',
      parameter_id:        'param-1',
      value:               'não-é-um-número',
      recorded_at:         '2026-05-26T10:00',
    })
    expect(r.success).toBe(false)
  })

  it('OcorrenciaSchema rejeita severity inválida — qualquer string arbitrária', () => {
    const r = OcorrenciaSchema.safeParse({
      description: 'Descrição com mais de 5 chars',
      severity:    'EXTREMO',
    })
    expect(r.success).toBe(false)
  })

  it('EditHandoverSchema rejeita payload completamente vazio', () => {
    expect(EditHandoverSchema.safeParse({}).success).toBe(false)
  })

  it('EditHandoverSchema rejeita payload com tipos errados', () => {
    const r = EditHandoverSchema.safeParse({
      justification:         12345,   // deveria ser string
      outgoing_observations: null,
      incoming_observations: null,
    })
    expect(r.success).toBe(false)
  })
})

```

### `src/lib/__tests__/ocorrencias.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { calcularDeadline, isPrazoVencido, isMimeTypeValido, DEADLINE_HOURS } from '@/lib/occurrence-utils'

// ─── calcularDeadline ─────────────────────────────────────────────────────────

describe('calcularDeadline — prazo calculado por severidade', () => {
  const base = new Date('2026-05-22T10:00:00.000Z')

  it('CRITICAL → deadline = base + 24h (critério de aceite da Fase 8)', () => {
    const deadline = calcularDeadline('CRITICAL', base)
    const expected = new Date('2026-05-23T10:00:00.000Z')
    expect(deadline.getTime()).toBe(expected.getTime())
  })

  it('HIGH → deadline = base + 72h', () => {
    const deadline = calcularDeadline('HIGH', base)
    expect(deadline.getTime()).toBe(base.getTime() + 72 * 60 * 60 * 1000)
  })

  it('MEDIUM → deadline = base + 168h (7 dias)', () => {
    const deadline = calcularDeadline('MEDIUM', base)
    expect(deadline.getTime()).toBe(base.getTime() + 168 * 60 * 60 * 1000)
  })

  it('LOW → deadline = base + 720h (30 dias)', () => {
    const deadline = calcularDeadline('LOW', base)
    expect(deadline.getTime() - base.getTime()).toBe(DEADLINE_HOURS.LOW * 60 * 60 * 1000)
  })

  it('severidade desconhecida → usa fallback de 168h', () => {
    const deadline = calcularDeadline('UNKNOWN', base)
    expect(deadline.getTime()).toBe(base.getTime() + 168 * 60 * 60 * 1000)
  })
})

// ─── isPrazoVencido ───────────────────────────────────────────────────────────

describe('isPrazoVencido — detecção de prazo expirado', () => {
  it('deadline no passado → vencido', () => {
    const deadline = new Date('2026-05-20T00:00:00.000Z')
    const now      = new Date('2026-05-22T00:00:00.000Z')
    expect(isPrazoVencido(deadline, now)).toBe(true)
  })

  it('deadline no futuro → não vencido', () => {
    const deadline = new Date('2026-05-25T00:00:00.000Z')
    const now      = new Date('2026-05-22T00:00:00.000Z')
    expect(isPrazoVencido(deadline, now)).toBe(false)
  })

  it('deadline exatamente igual a now → não vencido (boundary exclusive)', () => {
    const t        = new Date('2026-05-22T10:00:00.000Z')
    expect(isPrazoVencido(t, t)).toBe(false)
  })
})

// ─── isMimeTypeValido ─────────────────────────────────────────────────────────

describe('isMimeTypeValido — rejeição de upload inválido', () => {
  it('image/jpeg → válido', () => {
    expect(isMimeTypeValido('image/jpeg')).toBe(true)
  })

  it('image/png → válido', () => {
    expect(isMimeTypeValido('image/png')).toBe(true)
  })

  it('image/webp → válido', () => {
    expect(isMimeTypeValido('image/webp')).toBe(true)
  })

  it('application/pdf → inválido', () => {
    expect(isMimeTypeValido('application/pdf')).toBe(false)
  })

  it('application/octet-stream (.exe) → inválido (critério de aceite da Fase 8)', () => {
    expect(isMimeTypeValido('application/octet-stream')).toBe(false)
  })

  it('string vazia → inválido', () => {
    expect(isMimeTypeValido('')).toBe(false)
  })
})

```

### `src/lib/__tests__/readings.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { calcularNaoConformidade } from '@/lib/readings-utils'

// ─── Cenário 1: valor conforme (dentro dos limites) ──────────────────────────
describe('calcularNaoConformidade — valor conforme', () => {
  it('retorna false para pH=7 dentro da faixa 6–9', () => {
    expect(calcularNaoConformidade(7, 6, 9)).toBe(false)
  })

  it('retorna false quando o valor é exatamente igual ao limite máximo (boundary)', () => {
    expect(calcularNaoConformidade(9, 6, 9)).toBe(false)
  })

  it('retorna false quando o valor é exatamente igual ao limite mínimo (boundary)', () => {
    expect(calcularNaoConformidade(6, 6, 9)).toBe(false)
  })
})

// ─── Cenário 2: valor não-conforme ───────────────────────────────────────────
describe('calcularNaoConformidade — valor fora do limite', () => {
  it('retorna true para pH=11 acima do limite máximo 9', () => {
    expect(calcularNaoConformidade(11, 6, 9)).toBe(true)
  })

  it('retorna true para pH=5 abaixo do limite mínimo 6', () => {
    expect(calcularNaoConformidade(5, 6, 9)).toBe(true)
  })

  it('retorna true com apenas limite máximo definido e valor acima (DBO5=120, máx=60)', () => {
    expect(calcularNaoConformidade(120, null, 60)).toBe(true)
  })

  it('retorna true com apenas limite mínimo definido e valor abaixo (pH=3, mín=5)', () => {
    expect(calcularNaoConformidade(3, 5, null)).toBe(true)
  })
})

// ─── Cenário 3: casos nulos e sem limites ────────────────────────────────────
describe('calcularNaoConformidade — sem valor ou sem limites', () => {
  it('retorna null quando value é null (leitura observacional sem parâmetro)', () => {
    expect(calcularNaoConformidade(null, 6, 9)).toBeNull()
  })

  it('retorna false quando nenhum limite está definido (null, null)', () => {
    expect(calcularNaoConformidade(100, null, null)).toBe(false)
  })
})

```

### `src/lib/__tests__/turnos.test.ts`
```ts
import { describe, it, expect } from 'vitest'
import { normalizarData, calcularTimeoutAt, isHandoverVencido } from '@/lib/shift-utils'

describe('normalizarData — meia-noite local', () => {
  it('preserva a data e zera o horário', () => {
    const d      = new Date('2026-05-22T15:30:00')
    const result = normalizarData(d)
    expect(result.getHours()).toBe(0)
    expect(result.getMinutes()).toBe(0)
    expect(result.getSeconds()).toBe(0)
    expect(result.getMilliseconds()).toBe(0)
    expect(result.getFullYear()).toBe(2026)
    expect(result.getMonth()).toBe(4) // maio = 4 (0-indexed)
    expect(result.getDate()).toBe(22)
  })

  it('não muta o original', () => {
    const original = new Date('2026-05-22T10:00:00')
    const original_time = original.getTime()
    normalizarData(original)
    expect(original.getTime()).toBe(original_time)
  })
})

describe('calcularTimeoutAt — prazo de confirmação', () => {
  const base = new Date('2026-05-22T08:00:00.000Z')

  it('30 minutos → timeout = base + 30min', () => {
    const result = calcularTimeoutAt(base, 30)
    expect(result.getTime()).toBe(base.getTime() + 30 * 60 * 1000)
  })

  it('60 minutos → timeout = base + 1h', () => {
    const result = calcularTimeoutAt(base, 60)
    expect(result.getTime()).toBe(base.getTime() + 60 * 60 * 1000)
  })

  it('0 minutos → timeout = base (sem prazo adicional)', () => {
    const result = calcularTimeoutAt(base, 0)
    expect(result.getTime()).toBe(base.getTime())
  })

  it('não muta o original', () => {
    const t = new Date('2026-05-22T08:00:00.000Z')
    const original_time = t.getTime()
    calcularTimeoutAt(t, 30)
    expect(t.getTime()).toBe(original_time)
  })
})

describe('isHandoverVencido — timeout expirado', () => {
  it('timeout no passado → vencido', () => {
    const timeoutAt = new Date('2026-05-22T07:00:00.000Z')
    const now       = new Date('2026-05-22T08:00:00.000Z')
    expect(isHandoverVencido(timeoutAt, now)).toBe(true)
  })

  it('timeout no futuro → não vencido', () => {
    const timeoutAt = new Date('2026-05-22T09:00:00.000Z')
    const now       = new Date('2026-05-22T08:00:00.000Z')
    expect(isHandoverVencido(timeoutAt, now)).toBe(false)
  })

  it('timeout igual a now → não vencido (boundary exclusive)', () => {
    const t = new Date('2026-05-22T08:00:00.000Z')
    expect(isHandoverVencido(t, t)).toBe(false)
  })
})

```

---
## SCRIPTS UTILITÁRIOS

### `scripts/backup.ts`
```ts
/**
 * Backup do banco SQLite — copia dev.db para backups/solentis-AAAA-MM-DD.db
 * Uso: npx tsx scripts/backup.ts
 *
 * Restaurar: veja RUNBOOK.md — seção "Backup e Restore".
 */

import fs   from 'fs/promises'
import path from 'path'

const ROOT       = path.resolve(import.meta.dirname, '..')
const SOURCE     = path.join(ROOT, 'prisma', 'dev.db')
const BACKUP_DIR = path.join(ROOT, 'backups')

function dateSuffix(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

async function main() {
  // Verifica banco de origem
  try {
    await fs.access(SOURCE)
  } catch {
    console.error(`Banco não encontrado: ${SOURCE}`)
    process.exit(1)
  }

  // Cria diretório de backups se não existir
  await fs.mkdir(BACKUP_DIR, { recursive: true })

  const dest = path.join(BACKUP_DIR, `solentis-${dateSuffix()}.db`)
  await fs.copyFile(SOURCE, dest)

  const { size } = await fs.stat(dest)
  const kb = (size / 1024).toFixed(1)
  console.log(`Backup criado: ${dest} (${kb} KB)`)
}

main().catch((err) => {
  console.error('Falha no backup:', err)
  process.exit(1)
})

```

---
## DOCUMENTAÇÃO

### `docs/MODELO_DE_DADOS.md`
```markdown
# Modelo de Dados — Solentis MVP

**Status:** APROVADO em 2026-05-12
**Tabelas:** 21 | **Enums:** 9 | **Multi-tenant:** sim (`tenant_id` em todas as tabelas operacionais)

---

## Visão geral dos domínios

| Domínio | Tabelas |
|---|---|
| a) Identidade & Autenticação | tenants, users, sessions, login_attempts |
| b) Configuração | quality_parameters, analysis_methods, equipment_categories, collection_points, shifts, occurrence_severity_defaults |
| c) Operação | readings, analyses, equipment, preventive_maintenances, corrective_maintenances, occurrences, occurrence_photos |
| d) Fluxo de Turno | shift_instances, shift_handovers |
| e) Rastreabilidade | audit_logs, parameter_history |

---

## a) Identidade & Autenticação

### `tenants`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| name | String | Sim | — | Ex: "Solentis" |
| slug | String | Sim | UNIQUE | URL-safe; ex: "solentis" |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |

Seed: `{ id: "default", name: "Solentis", slug: "solentis", is_active: true }`

---

### `users`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| email | String | Sim | UNIQUE* | *único por tenant: índice composto (tenant_id, email) |
| password_hash | String | Sim | — | bcrypt/argon2; nunca texto puro |
| name | String | Sim | — | Nome de exibição na UI |
| role | Role | Sim | Sim | OPERATOR / TECHNICIAN / MANAGER |
| must_change_password | Boolean | Sim | — | `true` na criação pelo Gestor |
| is_active | Boolean | Sim | — | Soft-delete; nunca hard delete se tiver dados operacionais |
| last_login_at | DateTime | Não | — | Registro de último acesso |
| created_at | DateTime | Sim | Sim | |
| updated_at | DateTime | Sim | — | |
| created_by | String (FK) | Não | — | → users.id; null apenas para o seed inicial |

---

### `sessions` *(NextAuth — sessões em banco para suportar timeout por inatividade)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| session_token | String | Sim | UNIQUE | |
| user_id | String (FK) | Sim | Sim | → users.id; CASCADE DELETE ao desativar o usuário |
| expires | DateTime | Sim | — | 30min (OPERATOR) / 60min (TECHNICIAN, MANAGER) |

---

### `login_attempts` *(rate limiting persistente — sobrevive a reinicializações)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| email | String | Sim | Sim | Email tentado |
| ip_address | String | Não | — | Para análise de segurança futura |
| success | Boolean | Sim | — | `true` = login bem-sucedido |
| attempted_at | DateTime | Sim | Sim | Consultado via (tenant_id, email, attempted_at) na janela de 15min |

```
Relações:
tenants ──< users            (1 tenant : N usuários)
tenants ──< sessions
tenants ──< login_attempts
users   ──< sessions         CASCADE DELETE ao desativar
users   ──< users            (created_by: auto-referência)
```

---

## b) Configuração

> Todas as tabelas deste domínio têm `tenant_id`, exceto `occurrence_severity_defaults` (global).

### `quality_parameters`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | — | Ex: "pH", "DBO" |
| unit | String | Sim | — | Ex: "mg/L", "–" para adimensional |
| min_limit | Float | Não | — | Null = sem limite mínimo |
| max_limit | Float | Não | — | Null = sem limite máximo |
| legal_reference | String | Não | — | Ex: "CONAMA 430/2011 Art. 16" |
| effective_date | DateTime | Sim | — | Início da vigência dos limites atuais |
| is_active | Boolean | Sim | — | Desativados somem de novos formulários |
| created_at | DateTime | Sim | Sim | |
| updated_at | DateTime | Sim | — | |
| created_by | String (FK) | Sim | — | → users.id |

---

### `analysis_methods`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | UNIQUE* | *único por tenant: (tenant_id, name) |
| description | String | Não | — | |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |

---

### `equipment_categories`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | UNIQUE* | *único por tenant: (tenant_id, name) |
| description | String | Não | — | Ex: "Equipamentos de recalque e circulação de fluidos" |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |

---

### `collection_points`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | — | Ex: "Entrada ETE", "Saída Final" |
| location | String | Não | — | Descrição física do local |
| description | String | Não | — | |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |

---

### `shifts` *(configuração dos turnos — não instâncias reais)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | — | Ex: "Manhã", "Tarde", "Noite" |
| start_time | String | Sim | — | "06:00" — String HH:mm; SQLite não tem tipo Time nativo |
| end_time | String | Sim | — | "14:00" |
| crosses_midnight | Boolean | Sim | — | `true` para Noite (22h–06h) |
| handover_timeout_minutes | Int | Sim | — | Default: 120 (2h); configurável por turno |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |

---

### `occurrence_severity_defaults` *(prazos configuráveis pelo Gestor — sem tenant_id, global)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| severity | OccurrenceSeverity | Sim | PK | Exatamente 4 linhas, uma por severidade |
| deadline_hours | Int | Sim | — | Crítica=24, Alta=72, Média=168, Baixa=720 |
| updated_at | DateTime | Sim | — | |
| updated_by | String (FK) | Sim | — | → users.id |

```
Relações:
quality_parameters ──< parameter_history  (histórico de alterações)
shifts             ──< shift_instances    (1 config : N instâncias)
collection_points  ──< readings
collection_points  ──< analyses
```

---

## c) Operação

### `readings` *(leituras de campo — mobile-first, Operador)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| collection_point_id | String (FK) | Sim | Sim | → collection_points.id |
| parameter_id | String (FK) | Não | Sim | → quality_parameters.id; null para obs. visual sem parâmetro formal (ex: "odor forte detectado") |
| shift_instance_id | String (FK) | Não | Sim | → shift_instances.id; associa leitura ao turno ativo |
| value | Float | Não | — | Null em leituras puramente observacionais |
| unit | String | Não | — | Copiado do parâmetro ao registrar |
| notes | String | Não | — | Texto livre (ex: "amostra coletada após chuva forte") |
| is_non_conformant | Boolean | Não | Sim | Null se sem parâmetro; calculado no save |
| origin | DataOrigin | Sim | — | MANUAL no MVP; SENSOR e IMPORT reservados para v2.0 |
| metadata_origin | Json | Não | — | Reservado: {device_id, topic, qos} para sensores futuros |
| recorded_by | String (FK) | Sim | Sim | → users.id |
| recorded_at | DateTime | Sim | Sim | Data/hora real da leitura de campo |
| created_at | DateTime | Sim | Sim | Data/hora do registro no sistema |

---

### `analyses` *(análises laboratoriais — Técnico)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| collection_point_id | String (FK) | Sim | Sim | → collection_points.id |
| parameter_id | String (FK) | Sim | Sim | → quality_parameters.id |
| method_id | String (FK) | Sim | — | → analysis_methods.id |
| value | Float | Sim | — | |
| unit | String | Sim | — | Snapshot da unidade do parâmetro no momento do registro |
| min_limit_applied | Float | Não | — | **Snapshot imutável do limite mínimo vigente em collected_at** — rastreabilidade legal |
| max_limit_applied | Float | Não | — | **Snapshot imutável do limite máximo vigente em collected_at** |
| report_text | String | Não | — | Laudo em texto livre |
| is_non_conformant | Boolean | Sim | Sim | Calculado no save; desnormalizado para performance em dashboards |
| approved_by | String (FK) | Não | — | → users.id; null = pendente de aprovação |
| approved_at | DateTime | Não | — | |
| origin | DataOrigin | Sim | — | MANUAL no MVP |
| metadata_origin | Json | Não | — | Reservado para sensores (v2.0) |
| collected_at | DateTime | Sim | Sim | Data/hora da coleta da amostra (pode diferir de created_at) |
| recorded_by | String (FK) | Sim | Sim | → users.id |
| created_at | DateTime | Sim | Sim | |

---

### `equipment`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | — | |
| category_id | String (FK) | Sim | Sim | → equipment_categories.id |
| serial_number | String | Não | — | |
| location | String | Não | — | Localização física na ETE |
| installation_date | DateTime | Não | — | |
| preventive_frequency_days | Int | Sim | — | Usado para agendar próxima preventiva automaticamente |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |
| created_by | String (FK) | Sim | — | → users.id |

---

### `preventive_maintenances`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| equipment_id | String (FK) | Sim | Sim | → equipment.id |
| scheduled_date | DateTime | Sim | Sim | Data prevista |
| completed_date | DateTime | Não | — | Preenchida ao concluir |
| completed_by | String (FK) | Não | — | → users.id |
| notes | String | Não | — | Anotações livres |
| status | MaintenanceStatus | Sim | Sim | SCHEDULED / COMPLETED / OVERDUE |
| created_at | DateTime | Sim | — | |
| updated_at | DateTime | Sim | — | |

---

### `corrective_maintenances`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| equipment_id | String (FK) | Sim | Sim | → equipment.id |
| description | String | Sim | — | Descrição do problema / serviço executado |
| responsible_id | String (FK) | Sim | — | → users.id |
| priority | Priority | Não | Sim | LOW / MEDIUM / HIGH / CRITICAL; default MEDIUM |
| start_date | DateTime | Sim | — | |
| end_date | DateTime | Não | — | |
| status | MaintenanceStatus | Sim | Sim | IN_PROGRESS / COMPLETED / CANCELLED |
| estimated_cost | Decimal | Não | — | Custo estimado antes da execução |
| actual_cost | Decimal | Não | — | Custo real após conclusão; Decimal (nunca Float — ver decisão 12) |
| notes | String | Não | — | Anotações livres adicionais |
| created_at | DateTime | Sim | — | |
| updated_at | DateTime | Sim | — | |

---

### `occurrences`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| description | String | Sim | — | Descrição estruturada do evento |
| severity | OccurrenceSeverity | Sim | Sim | LOW / MEDIUM / HIGH / CRITICAL |
| status | OccurrenceStatus | Sim | Sim | OPEN / IN_PROGRESS / RESOLVED |
| deadline | DateTime | Sim | — | Sugerido via occurrence_severity_defaults; editável por Técnico/Gestor |
| resolved_at | DateTime | Não | — | |
| resolved_by | String (FK) | Não | — | → users.id |
| responsible_id | String (FK) | Não | — | → users.id; SET NULL se responsável for desativado |
| reported_by | String (FK) | Sim | Sim | → users.id |
| created_at | DateTime | Sim | Sim | |
| updated_at | DateTime | Sim | — | |

---

### `occurrence_photos`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| occurrence_id | String (FK) | Sim | Sim | → occurrences.id; CASCADE DELETE |
| filename | String | Sim | — | UUID gerado no servidor; nunca o nome original (segurança) |
| original_name | String | Sim | — | Nome original para exibição; não usado em path de disco |
| mime_type | String | Sim | — | image/jpeg / image/png / image/webp |
| size_bytes | Int | Sim | — | Máx: 5.242.880 (5 MB) — validado no upload |
| uploaded_by | String (FK) | Sim | — | → users.id |
| uploaded_at | DateTime | Sim | — | |

```
Relações:
users                ──< readings               (recorded_by)
users                ──< analyses               (recorded_by, approved_by)
users                ──< equipment              (created_by)
users                ──< occurrences            (reported_by, responsible_id, resolved_by)
collection_points    ──< readings
collection_points    ──< analyses
quality_parameters   ──< readings               (opcional — null para obs. visual)
quality_parameters   ──< analyses
analysis_methods     ──< analyses
equipment_categories ──< equipment
equipment            ──< preventive_maintenances
equipment            ──< corrective_maintenances
occurrences          ──< occurrence_photos       CASCADE DELETE
shift_instances      ──< readings               (leitura pertence ao turno ativo)
```

---

## d) Fluxo de Turno

### `shift_instances` *(ocorrências reais — distinto da configuração em `shifts`)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| shift_id | String (FK) | Sim | Sim | → shifts.id (configuração) |
| date | DateTime | Sim | Sim | Data de início; para Noite (cruza meia-noite), é o dia que começa às 22h |
| opened_by | String (FK) | Sim | Sim | → users.id |
| opened_at | DateTime | Sim | — | |
| closed_at | DateTime | Não | — | |
| status | ShiftInstanceStatus | Sim | Sim | OPEN / HANDOVER_PENDING / CLOSED |
| created_at | DateTime | Sim | — | |

> **Regra de turno duplicado:** verificada em transação Prisma no MVP. Impede dois registros com mesmo `(tenant_id, shift_id, date)` e `status IN (OPEN, HANDOVER_PENDING)`. Será migrada para `PARTIAL UNIQUE INDEX ... WHERE status IN (...)` no PostgreSQL (v2.0). Ver decisão de design nº 7.

---

### `shift_handovers` *(passagem em 2 etapas)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| shift_instance_id | String (FK) | Sim | Sim | → shift_instances.id; CASCADE DELETE |
| outgoing_user_id | String (FK) | Sim | — | → users.id (turno sainte — Etapa 1) |
| incoming_user_id | String (FK) | Não | — | → users.id (turno entrante — null até Etapa 2) |
| checklist_data | Json | Sim | — | Etapa 1: leituras feitas, ocorrências em aberto, pendências |
| outgoing_observations | String | Não | — | Observações livres do sainte (Etapa 1) |
| handover_at | DateTime | Sim | — | Momento do registro da Etapa 1 |
| timeout_at | DateTime | Sim | — | `handover_at + shifts.handover_timeout_minutes` — calculado no save |
| incoming_observations | String | Não | — | Observações livres do entrante (Etapa 2) |
| confirmed_at | DateTime | Não | — | Momento da confirmação (Etapa 2) |
| status | HandoverStatus | Sim | Sim | PENDING / CONFIRMED / TIMED_OUT |
| created_at | DateTime | Sim | — | |

```
Relações:
shifts          ──< shift_instances    (1 config : N instâncias)
shift_instances ──1 shift_handovers    (1 instância : no máximo 1 handover; CASCADE DELETE)
users           ──< shift_instances    (opened_by)
users           ──< shift_handovers    (outgoing_user_id, incoming_user_id)
shift_instances ──< readings           (leituras associadas ao turno)
```

---

## e) Rastreabilidade

### `audit_logs` *(sem tenant_id — contexto recuperado via record_id)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| user_id | String (FK) | Não | Sim | → users.id; null para ações do sistema (ex: timeout de passagem) |
| table_name | String | Sim | Sim | Nome da tabela afetada |
| record_id | String | Sim | Sim | ID do registro afetado |
| action | AuditAction | Sim | — | CREATE / UPDATE / DELETE |
| before | Json | Não | — | Estado anterior (null em CREATE) |
| after | Json | Não | — | Estado posterior (null em DELETE) |
| ip_address | String | Não | — | |
| justification | String | Não | — | **Obrigatório** quando Gestor edita turno fechado |
| timestamp | DateTime | Sim | Sim | |

---

### `parameter_history` *(versionamento estruturado — sem tenant_id, herdado via parameter_id)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| parameter_id | String (FK) | Sim | Sim | → quality_parameters.id |
| min_limit_before | Float | Não | — | |
| max_limit_before | Float | Não | — | |
| min_limit_after | Float | Não | — | |
| max_limit_after | Float | Não | — | |
| effective_date_before | DateTime | Não | — | |
| effective_date_after | DateTime | Sim | — | Nova vigência após a alteração |
| changed_by | String (FK) | Sim | — | → users.id |
| changed_at | DateTime | Sim | Sim | |
| reason | String | Não | — | Justificativa da alteração de limite |

```
Relações:
users              ──< audit_logs         (user_id)
quality_parameters ──< parameter_history  (parameter_id)
```

---

## Enums

| Enum | Valores | Usado em |
|---|---|---|
| `Role` | OPERATOR / TECHNICIAN / MANAGER | users.role |
| `DataOrigin` | MANUAL / SENSOR / IMPORT | readings.origin, analyses.origin |
| `OccurrenceSeverity` | LOW / MEDIUM / HIGH / CRITICAL | occurrences.severity, occurrence_severity_defaults.severity |
| `OccurrenceStatus` | OPEN / IN_PROGRESS / RESOLVED | occurrences.status |
| `MaintenanceStatus` | SCHEDULED / IN_PROGRESS / COMPLETED / OVERDUE / CANCELLED | preventive_maintenances.status, corrective_maintenances.status |
| `Priority` | LOW / MEDIUM / HIGH / CRITICAL | corrective_maintenances.priority |
| `ShiftInstanceStatus` | OPEN / HANDOVER_PENDING / CLOSED | shift_instances.status |
| `HandoverStatus` | PENDING / CONFIRMED / TIMED_OUT | shift_handovers.status |
| `AuditAction` | CREATE / UPDATE / DELETE | audit_logs.action |

> `Priority` e `OccurrenceSeverity` têm os mesmos valores mas são tipos distintos — semântica diferente e evolução independente futura.

---

## Índices recomendados

| Tabela | Campo(s) | Tipo | Motivo |
|---|---|---|---|
| `users` | (tenant_id, email) | UNIQUE | Login por tenant |
| `users` | (tenant_id, role, is_active) | Composto | Listar equipe ativa por perfil |
| `sessions` | session_token | UNIQUE | NextAuth lookup |
| `sessions` | user_id | Simples | Invalidar sessões do usuário |
| `login_attempts` | (tenant_id, email, attempted_at) | Composto | Janela de bloqueio de 15min |
| `quality_parameters` | (tenant_id, is_active) | Composto | Listar parâmetros ativos |
| `analysis_methods` | (tenant_id, name) | UNIQUE | Unicidade por tenant |
| `equipment_categories` | (tenant_id, name) | UNIQUE | Unicidade por tenant |
| `readings` | (tenant_id, recorded_at) | Composto | Séries temporais por tenant |
| `readings` | collection_point_id | Simples | Filtro por ponto |
| `readings` | parameter_id | Simples | Filtro por parâmetro |
| `readings` | (tenant_id, is_non_conformant, created_at) | Composto | Dashboard não-conformidades |
| `analyses` | (tenant_id, parameter_id, collected_at) | Composto | Gráfico histórico por parâmetro |
| `analyses` | (tenant_id, is_non_conformant, approved_by) | Composto | Análises pendentes + alertas |
| `analyses` | collection_point_id | Simples | Filtro por ponto |
| `occurrences` | (tenant_id, severity, status) | Composto | Dashboard e filtros |
| `occurrences` | deadline | Simples | Detecção de prazos vencidos |
| `occurrences` | reported_by | Simples | Ocorrências por operador |
| `preventive_maintenances` | (equipment_id, scheduled_date, status) | Composto | Detecção de manutenção atrasada |
| `corrective_maintenances` | (equipment_id, status) | Composto | Manutenções em aberto por equipamento |
| `corrective_maintenances` | (tenant_id, priority, status) | Composto | Dashboard de prioridades |
| `shift_instances` | (tenant_id, shift_id, date) | Composto | Prevenção de turno duplicado (app-level) |
| `shift_instances` | opened_by | Simples | Turnos do operador |
| `shift_handovers` | (status, timeout_at) | Composto | Detecção de timeout de passagem |
| `audit_logs` | (table_name, record_id) | Composto | Histórico de um registro específico |
| `audit_logs` | (user_id, timestamp) | Composto | Filtro por usuário + período |
| `audit_logs` | timestamp | Simples | Filtro por período |
| `parameter_history` | (parameter_id, changed_at) | Composto | Limite vigente em data X |

---

## Regras de integridade referencial

**Princípio geral:** nada com histórico operacional é hard-deletado — apenas desativado (soft-delete via `is_active = false`) ou anonimizado (LGPD).

| Entidade | Ação | Impacto nas referências | Regra |
|---|---|---|---|
| `users` | Desativação | sessions → CASCADE DELETE; todos os dados operacionais → mantêm FK | Soft-delete (`is_active = false`); RESTRICT hard delete se existir dado operacional |
| `users` | LGPD — direito ao esquecimento | `name → "Usuário removido"`, `email → {uuid}@deleted.solentis.local` | Anonymização via script de manutenção (ver RUNBOOK); nunca DELETE do registro |
| `quality_parameters` | Desativação | readings.parameter_id (opcional) → SET NULL; analyses → mantêm FK | Soft-delete; RESTRICT hard delete se houver análises vinculadas |
| `equipment` | Desativação | preventive e corrective maintenances → mantêm FK | Soft-delete; RESTRICT hard delete |
| `collection_points` | Desativação | readings, analyses → mantêm FK | Soft-delete; RESTRICT hard delete |
| `occurrences` | Encerramento | occurrence_photos → CASCADE DELETE se a ocorrência for deletada | Ocorrências só são encerradas (status → RESOLVED), nunca deletadas |
| `shift_instances` | Fechamento | shift_handovers → CASCADE DELETE se a instância for deletada | Instâncias nunca deletadas; apenas fechadas (status → CLOSED) |
| `analysis_methods` | Desativação | analyses → mantêm FK | Soft-delete; RESTRICT hard delete |
| `equipment_categories` | Desativação | equipment → mantêm FK | Soft-delete; RESTRICT hard delete |
| `occurrence_severity_defaults` | Edição | Sem referências estruturais | Sempre 4 linhas fixas (uma por severidade); UPDATE apenas, nunca INSERT/DELETE |

---

## Decisões de design

**1. `shifts` (configuração) separado de `shift_instances` (ocorrência real)**
A configuração "Turno Manhã: 06h–14h" existe uma vez. "O Turno Manhã de 12/05/2026 aberto pelo Operador João" é uma instância. Misturar os dois tornaria impossível ter histórico, impedir duplicatas ou manter imutabilidade de turno fechado sem gambiarras.

**2. `min_limit_applied` / `max_limit_applied` imutáveis em `analyses`**
Quando um Gestor altera o limite do pH de 9 para 8,5 meses depois, uma análise antiga com pH 8,7 não pode retroativamente virar não-conforme. Capturar o limite vigente no momento de `collected_at` torna a determinação de não-conformidade imutável e auditável — requisito legal para rastreabilidade ambiental (CONAMA 430/2011).

**3. `parameter_history` separado de `audit_logs`**
`audit_logs` armazena `before`/`after` como JSON opaco — ótimo para rastreabilidade geral. Para a query "quais eram os limites do pH em 15/03/2026?", precisamos de campos estruturados e indexáveis. As duas tabelas são gravadas na mesma transação quando um parâmetro é editado.

**4. `is_non_conformant` desnormalizado em `readings` e `analyses`**
Poderia ser calculado na query. Mas o dashboard do Gestor precisa contar não-conformidades rapidamente em anos de histórico. O campo boolean indexado torna essa query trivial. É calculado no save e pode ser recalculado em batch se os limites mudarem.

**5. `occurrence_photos` como tabela separada**
Hoje o MVP tem 1 foto por ocorrência na prática, mas a regra de negócio não impõe esse limite. Tabela separada permite múltiplas fotos sem migração futura e mantém `occurrences` enxuta.

**6. `start_time` / `end_time` como String em `shifts`**
SQLite não tem tipo Time nativo — armazenar como DateTime introduziria uma data arbitrária espúria. String no formato "HH:mm" é simples, legível e suficiente para lógica de exibição e cálculo de intervalos.

**7. Turno duplicado via transação Prisma (não partial unique index)**
SQLite suporta partial indexes, mas Prisma não os expõe no schema DSL — exigiria edição manual de migration SQL. Com SQLite, escritas são serializadas, tornando a verificação em transação igualmente segura. Ao migrar para PostgreSQL (v2.0): `CREATE UNIQUE INDEX ON shift_instances(tenant_id, shift_id, date) WHERE status IN ('OPEN', 'HANDOVER_PENDING')`.

**8. Multi-tenant desde o MVP via `tenant_id`**
Adicionar `tenant_id` agora tem custo zero — um campo e um índice por tabela. Fazer após o MVP significa migrar centenas de milhares de linhas em produção, reescrever todas as queries e redefinir policies de autorização. O middleware Prisma injeta `tenant_id = "default"` automaticamente — nenhuma query do MVP precisa ser escrita de forma diferente.

**9. `occurrence_severity_defaults` sem tenant_id (global)**
Prazos por severidade são baseados em limites regulatórios, não em preferência operacional de cada ETE. Em v2.0 (multi-ETE), avaliar se cada tenant precisa de prazos próprios e adicionar `tenant_id` se necessário.

**10. `login_attempts` em banco (não em memória)**
Rate limiting em memória zera ao reiniciar o servidor — um atacante poderia reiniciar o processo para burlar o bloqueio de 15min. Banco persiste o histórico e é auditável.

**11. `metadata_origin` como Json (não colunas estruturadas)**
Diferentes tipos de sensores terão payloads completamente diferentes: MQTT tem tópico + QoS, Modbus tem endereço + registrador, importação tem nome de arquivo + linha. JSON único evita adicionar colunas a cada nova integração futura.

**12. Valores monetários como `Decimal`, não `Float`**
Float tem imprecisão de ponto flutuante: R$ 100,00 pode ser armazenado como R$ 99,99999…, corrompendo relatórios financeiros. Prisma armazena Decimal como string em SQLite, garantindo precisão exata. Regra: dinheiro nunca em Float.

```

### `docs/PLANO.md`
```markdown
# Plano de Desenvolvimento — Solentis MVP

**Status:** APROVADO em 2026-05-12
**Total estimado:** 29–44 horas em 12 fases
**Regra:** uma fase só fecha quando atende ao Definition of Done (seção 13 do BRIEFING.md)

---

## Fase 1 — Scaffold do projeto `(1–2h)`

**Objetivo:** projeto rodando localmente, estrutura de pastas pronta, sem nenhuma funcionalidade ainda.

**Entregáveis:**
- `create-next-app` com TypeScript, Tailwind, App Router
- shadcn/ui instalado e configurado (tema azul-petróleo/verde-água placeholder)
- Prisma + SQLite inicializado (banco vazio, só conexão testada)
- ESLint + configuração de paths (`@/`)
- Estrutura de pastas: `/app /components /lib /prisma /tests /docs`
- `/docs/RUNBOOK.md` inicial com: como rodar, como resetar banco, como ver logs
- Primeiro commit

**Critérios de aceite:**
- `npm run dev` sobe na porta 3000 sem erros
- Página inicial exibe "Solentis" (pode ser só o texto)
- `npx prisma studio` abre sem erro

---

## Fase 2 — Autenticação e gestão de usuários `(2–3h)`

**Objetivo:** os 3 perfis conseguem fazer login; Gestor consegue criar usuários.

**Nota:** esta fase cria o model `User` no Prisma — o schema completo (demais tabelas) vem na Fase 3. A separação é deliberada: auth testável de ponta a ponta antes de qualquer outra tabela existir.

**Entregáveis:**
- Model `User` no Prisma (id, email, passwordHash, role, mustChangePassword)
- Seed: `admin@solentis.local / Admin@123` com `mustChangePassword = true`
- NextAuth configurado com credenciais + roles
- Página de login (mobile-first, botões grandes)
- Tela de troca de senha obrigatória no 1º login
- Middleware de rota por perfil (`/gestor/*`, `/tecnico/*`, `/operador/*`)
- Sessão com timeout: 30min (Operador) / 60min (Técnico e Gestor)
- Rate limiting no endpoint de login: 5 tentativas → bloqueio 15min
- CRUD de usuários (só Gestor): criar, editar perfil/email, desativar
- Testes: login correto, login errado, bloqueio por tentativas, redirect por perfil

**Critérios de aceite:**
- Cada perfil só acessa suas rotas; rota errada redireciona com mensagem clara
- 6ª tentativa de login é bloqueada por 15min
- 1º login com admin obriga troca de senha antes de entrar
- Nenhum stack trace visível em erro

---

## Fase 3 — Schema completo + seed realista `(1–2h)`

**Objetivo:** todas as tabelas do banco definidas, indexadas e populadas com dados de teste.

**Entregáveis:**
- Todos os models Prisma: `User`, `QualityParameter`, `ParameterHistory`, `AnalysisMethod`, `EquipmentCategory`, `CollectionPoint`, `Reading`, `Analysis`, `Equipment`, `PreventiveMaintenance`, `CorrectiveMaintenance`, `Occurrence`, `OccurrencePhoto`, `Shift`, `ShiftHandover`, `AuditLog`
- Campos `origin` (enum: MANUAL/SENSOR/IMPORT) e `metadataOrigin` (JSON) em `Reading` e `Analysis`
- Índices nas colunas de consulta frequente: `created_at`, `status`, `user_id`, `shift_id`, `parameter_id`
- Seed com: 1 usuário por perfil, 8 parâmetros CONAMA, 3 métodos, 6 categorias de equipamento, 3 turnos (Manhã/Tarde/Noite)
- Migration rodando limpa

**Critérios de aceite:**
- `npx prisma migrate dev` sem erro
- `npx prisma studio` mostra todas as tabelas com dados de seed
- `npx prisma validate` sem warnings e confirma índices presentes

---

## Fase 4 — Parâmetros e listas gerenciadas pelo Gestor `(2–3h)`

**Objetivo:** Gestor consegue gerenciar as listas de referência do sistema.

**Entregáveis:**
- CRUD de parâmetros de qualidade (com versionamento de limites)
- CRUD de métodos de análise
- CRUD de categorias de equipamento
- CRUD de configuração de turnos (nome, horário, flag cruza-meia-noite, timeout de passagem)
- CRUD de pontos de coleta
- CRUD de prazo-padrão por severidade de ocorrência
- Todas as telas acessíveis só pelo perfil Gestor

**Critérios de aceite:**
- Gestor cria/edita/desativa um parâmetro; histórico de versões é gravado
- Tentativa de acesso por Operador/Técnico retorna 403
- Seed pré-carregado aparece nas listagens

---

## Fase 5 — Leituras de campo `(2–3h)`

**Objetivo:** Operador registra leituras rapidamente no celular; dado não se perde.

**Entregáveis:**
- Formulário de leitura: ponto de coleta, parâmetro, valor, unidade, observação, turno
- `origin` = MANUAL gravado automaticamente
- Mobile-first: botões grandes, campos simples, 1 tela
- Salvamento de rascunho em `localStorage` (recuperado ao reabrir)
- Lista de leituras com paginação
- Testes: leitura válida gravada, rascunho recuperado após reload

**Critérios de aceite:**
- Formulário funciona no Chrome DevTools modo celular (375px)
- Fecha aba no meio do formulário → reabre → dados estão lá
- Lista pagina corretamente com 50+ registros

---

## Fase 6 — Análises laboratoriais `(3–4h)`

**Objetivo:** Técnico registra análises; sistema detecta não-conformidades e alerta.

**Entregáveis:**
- Formulário de análise: parâmetro, método, valor, data coleta, ponto de coleta, laudo (texto), responsável
- Salvamento de rascunho em `localStorage` (formulário recuperado após reload ou queda de rede)
- Detecção automática de não-conformidade (valor fora do limite vigente do parâmetro)
- Badge vermelho na lista de análises e no dashboard do Gestor
- Fluxo de aprovação: Técnico registra → Técnico aprova
- Histórico com gráfico de linha por parâmetro (Recharts), limitado a 90 dias com opção de expandir
- `origin` = MANUAL por padrão
- Testes: valor fora do limite gera não-conformidade; valor dentro não gera

**Critérios de aceite:**
- Análise com pH = 11 (acima do limite) aparece destacada em vermelho
- Dashboard do Gestor mostra contador de não-conformidades em aberto
- Gráfico exibe os últimos 30 dias para o parâmetro selecionado
- Preencher metade do formulário → fechar aba → reabrir → campos recuperados

---

## Fase 7 — Equipamentos e manutenções `(3–4h)`

**Objetivo:** Técnico cadastra equipamentos e o sistema agenda manutenções preventivas.

**Entregáveis:**
- CRUD de equipamentos (Técnico/Gestor): nome, categoria, nº série, localização, data instalação, frequência de preventiva em dias
- Ao salvar equipamento, sistema cria automaticamente o próximo agendamento de preventiva
- Ao concluir preventiva, sistema agenda a próxima (data_conclusão + frequência)
- Registro de manutenção corretiva: descrição, responsável, data início/fim
- Destaque vermelho em equipamentos com preventiva atrasada
- Dashboard do Técnico mostra equipamentos que precisam de atenção

**Critérios de aceite:**
- Cadastrar equipamento com frequência 30 dias → preventiva aparece agendada para hoje + 30 dias
- Concluir preventiva → próxima já aparece no calendário
- Equipamento com data de preventiva vencida → aparece em vermelho

---

## Fase 8 — Ocorrências `(2–3h)`

**Objetivo:** Operador registra eventos anormais com severidade, prazo e foto.

**Entregáveis:**
- Formulário de ocorrência: descrição, severidade (Baixa/Média/Alta/Crítica), prazo (sugerido automaticamente, editável por Técnico/Gestor), responsável
- Salvamento de rascunho em `localStorage` (campos de texto recuperados após reload; foto precisa ser re-selecionada — limitação do browser, documentar no RUNBOOK)
- Upload de foto: até 5 MB, formatos jpg/png/webp, salvo em `/uploads` fora de `/public`
- Rota autenticada para servir a foto (`/api/occurrences/[id]/photo`)
- Fluxo de resolução: Técnico fecha a ocorrência
- Testes: upload de arquivo inválido rejeitado; foto não acessível sem sessão

**Critérios de aceite:**
- Registrar ocorrência Crítica → prazo sugerido = 24h a partir de agora
- Tentar acessar URL da foto sem estar logado → 401
- Upload de arquivo `.exe` → rejeitado com mensagem clara
- Preencher formulário → fechar aba → reabrir → campos de texto recuperados

---

## Fase 9 — Turnos `(3–4h)`

**Objetivo:** Operadores abrem, passam e fecham turnos com rastreabilidade completa.

**Entregáveis:**
- Abertura de turno (Operador): seleciona o turno, registra horário
- Impedimento de turno duplicado: se já há um turno aberto, bloqueia abertura
- Passagem em 2 etapas: sainte registra entrega (checklist + pendências + observações) → entrante confirma
- Alerta pro Gestor se confirmação não ocorrer dentro do timeout configurado
- Fechamento de turno: só após confirmação do entrante
- Turno fechado é imutável para Operador e Técnico
- Gestor pode editar turno fechado com justificativa obrigatória → auditoria registrada
- Testes: editar turno fechado sem ser Gestor → bloqueio; Gestor sem justificativa → bloqueio

**Critérios de aceite:**
- Dois operadores tentando abrir o mesmo turno → segundo recebe erro claro
- Gestor edita turno fechado com justificativa → `AuditLog` registra antes/depois
- Gestor tenta editar sem preencher justificativa → formulário bloqueia

---

## Fase 10 — Dashboards `(3–4h)`

**Objetivo:** cada perfil vê um painel com o que importa pra ele.

**Entregáveis:**
- **Operador:** leituras do dia, turno ativo, ocorrências em aberto (próprias)
- **Técnico:** análises pendentes de aprovação, não-conformidades em aberto, equipamentos com manutenção atrasada ou próxima
- **Gestor:** todos os alertas acima + contador de usuários ativos, equipamentos críticos, não-conformidades por parâmetro (gráfico), ocorrências por severidade

**Critérios de aceite:**
- Cada perfil ao fazer login vê o dashboard correspondente sem precisar navegar
- Badge vermelho aparece quando há não-conformidade em aberto
- Dashboard carrega em < 2s com banco populado com 6 meses de dados simulados
- Queries de dashboard verificadas no Prisma Studio: usam `count`/`groupBy`, não `findMany` sem `take`

---

## Fase 11 — Auditoria, testes e hardening `(4–5h)`

**Objetivo:** sistema rastreável, testado e seguro — sem esta fase o MVP não vai a produção.

**Princípio:** backup não testado não é backup.

**Entregáveis:**
- Middleware/interceptor que grava `AuditLog` em toda mutação (create/update/delete), com `userId`, `table`, `recordId`, `action`, `before` (JSON), `after` (JSON), `timestamp`
- Tela de visualização de auditoria para o Gestor (tabela paginada)
- Filtros: por usuário, por tabela/entidade, por período (date range picker)
- Testes automatizados para todas as 13 regras críticas da seção 5 do briefing
- Revisão de segurança: nenhum stack trace exposto, nenhum `.env` commitado, nenhum `console.log` solto, validação dupla (cliente + servidor) em todos os formulários
- Script de backup diário do SQLite → `/backups/solentis-AAAA-MM-DD.db`
- Procedimento de restore documentado no RUNBOOK + teste explícito: gerar backup → deletar registro → restaurar → confirmar que o registro voltou

**Critérios de aceite:**
- Executar 5 ações distintas → todas aparecem na tela de auditoria com before/after corretos
- Filtrar auditoria por usuário → mostra só ações dele
- `npm test` passa 100% cobrindo os 13 cenários críticos
- Teste de restore: banco restaurado tem o registro deletado de volta, sem corrupção
- Nenhum erro no console do browser após revisão manual

---

## Fase 12 — Polish mobile `(1–2h)`

**Objetivo:** garantir que o Operador — que usa no celular, às vezes com luvas — consegue usar o sistema sem frustração.

**Entregáveis:**
- Revisão de todas as telas no Chrome DevTools a 375px (iPhone SE — menor tela-alvo)
- Todos os elementos interativos com área de toque mínima de 44×44px (WCAG 2.5.5)
- Formulários com atributos corretos para teclado mobile:
  - `inputMode="numeric"` / `inputMode="decimal"` em campos de valor
  - `autoComplete` adequado em campos de texto
  - `type="email"` na tela de login
- Teste de envio com rede cortada no meio: formulário exibe mensagem de erro amigável e mantém os dados preenchidos
- Navegação principal acessível por menu hamburguer ou bottom nav em telas pequenas

**Critérios de aceite:**
- Fluxo completo do Operador (login → abrir turno → registrar leitura → registrar ocorrência) sem zoom ou scroll horizontal
- DevTools → Network → Offline → tentar enviar formulário → mensagem clara, dados preservados
- Inspecionar 10 botões aleatórios: todos ≥ 44px de altura no mobile

---

## Resumo

| Fase | Descrição | Estimativa |
|------|-----------|------------|
| 1 | Scaffold do projeto | 1–2h |
| 2 | Autenticação e usuários (inclui model User no Prisma) | 2–3h |
| 3 | Schema completo + seed + índices | 1–2h |
| 4 | Listas gerenciadas (Gestor) | 2–3h |
| 5 | Leituras de campo + localStorage | 2–3h |
| 6 | Análises laboratoriais + localStorage | 3–4h |
| 7 | Equipamentos e manutenções | 3–4h |
| 8 | Ocorrências + localStorage | 2–3h |
| 9 | Turnos | 3–4h |
| 10 | Dashboards + queries por agregação | 3–4h |
| 11 | Auditoria (UI + filtros) + testes + hardening + restore | 4–5h |
| 12 | Polish mobile | 1–2h |
| **Total MVP** | | **29–44h** |

```

### `docs/RUNBOOK.md`
```markdown
# RUNBOOK — Solentis

Comandos e procedimentos operacionais do projeto. Mantenha este arquivo atualizado a cada fase.

---

## 1. Comandos do dia a dia

### 1.1 Rodar servidor de desenvolvimento
```bash
npm run dev
```
Servidor disponível em: **http://localhost:3000**
Para encerrar: `Ctrl + C` no terminal.

### 1.2 Abrir Prisma Studio (visualizador do banco)
```bash
npx prisma studio
```
Interface disponível em: **http://localhost:5555** (ou porta aleatória disponível — veja o output do terminal).
Para encerrar: `Ctrl + C` no terminal.

### 1.3 Aplicar migrations (após alterar o schema.prisma)
```bash
npx prisma migrate dev --name <nome-descritivo>
```
Exemplo: `npx prisma migrate dev --name add-users-table`
Cria a migration SQL em `prisma/migrations/` e atualiza o banco.

### 1.4 Regenerar cliente Prisma (após alterar o schema.prisma)
```bash
npx prisma generate
```
Regenera os tipos TypeScript em `src/generated/prisma/`.
**Sempre rodar após clonar o repositório** (o cliente gerado não está no Git).

---

## 2. Banco de dados

### 2.1 Resetar banco (apagar tudo e recriar do zero)
```bash
npx prisma migrate reset
```
⚠️ **DESTRUTIVO** — apaga todos os dados e recria o banco do zero com seed.
Use apenas em desenvolvimento. Nunca em produção.

### 2.2 Fazer backup (script automatizado)
```bash
npx tsx scripts/backup.ts
```
Cria `backups/solentis-AAAA-MM-DD.db` (pasta ignorada pelo Git).
O script verifica a existência do banco de origem e imprime o tamanho do arquivo gerado.

**Recomendação de agendamento (produção):** configure um cron diário:
```
# Exemplo crontab (Linux/macOS) — 02:00 todo dia
0 2 * * * cd /caminho/do/projeto && npx tsx scripts/backup.ts >> logs/backup.log 2>&1
```
No Windows, use o **Agendador de Tarefas** ou o Windows Task Scheduler.

**Recomendação de infraestrutura:** use um **no-break (UPS)** no servidor que hospeda o banco.
Quedas de energia durante uma escrita SQLite podem corromper o arquivo `dev.db`.
O backup diário protege apenas contra corrupção silenciosa descoberta depois — não substitui UPS.

### 2.3 Restaurar backup (com teste de integridade)
```bash
# 1. Pare o servidor de desenvolvimento antes de restaurar
# 2. Substitua o banco atual pelo backup desejado (Windows PowerShell):
Copy-Item "backups\solentis-AAAA-MM-DD.db" "prisma\dev.db"

# 3. Verifique a integridade do banco restaurado:
npx prisma migrate status

# 4. Abra o Prisma Studio e confirme que os dados estão lá:
npx prisma studio

# 5. Suba o servidor e teste manualmente um fluxo crítico:
npm run dev
```
**Princípio:** backup não testado não é backup. Sempre confirme o restore antes de confiar.

### 2.4 Checklist de teste de restore
Execute este procedimento ao validar um backup antes de colocá-lo em uso:
- [ ] Servidor parado (`Ctrl+C`)
- [ ] `Copy-Item backups\solentis-AAAA-MM-DD.db prisma\dev.db` executado
- [ ] `npx prisma migrate status` — mostra "All migrations have been applied"
- [ ] `npx prisma studio` — tabelas `users`, `readings`, `shift_handovers` visíveis com dados
- [ ] `npm run dev` — servidor sobe sem erro na porta 3000
- [ ] Login com `tecnico@solentis.local` funciona
- [ ] Página `/tecnico/equipamentos` lista pelo menos um equipamento

---

## 3. Operações administrativas

### 3.1 Credencial seed e primeiro login

| Campo | Valor |
|-------|-------|
| E-mail | `admin@solentis.local` |
| Senha  | `Admin@123` |
| Perfil | Gestor |

⚠️ **O sistema obriga troca de senha no primeiro login.**
Esta credencial é apenas para o acesso inicial — nunca use em produção sem trocar.

Para recriar a credencial seed (se perdida):
```bash
npx prisma migrate reset
# (apaga tudo e roda o seed novamente)
```

### 3.2 Anonimizar usuário (LGPD — direito ao esquecimento)
Nunca delete o registro — ele pode ter dados operacionais vinculados (leituras, análises, ocorrências).
Em vez disso, substitua os campos pessoais:

| Campo  | Valor após anonimização |
|--------|------------------------|
| `name`  | `Usuário removido` |
| `email` | `{cuid}@deleted.solentis.local` |
| `password_hash` | hash de string aleatória (bloqueia acesso) |
| `is_active` | `false` |

Script de anonimização: será criado na Fase 11 (Auditoria + hardening).

---

## 4. Diagnóstico

### 4.1 Onde estão os logs
- **Servidor Next.js:** output do terminal onde `npm run dev` está rodando
- **Erros de runtime:** console do navegador (F12 → Console)
- **Queries do banco:** Prisma Studio → aba Console (SQL)
- **Logs de auditoria:** tabela `audit_logs` no banco (visível no Prisma Studio)

### 4.2 Resolução de problemas comuns

**Porta 3000 já em uso:**
```bash
# Windows — descubra o processo:
netstat -ano | findstr :3000
# Encerre pelo PID encontrado:
taskkill /PID <numero-pid> /F
```

**"Cannot find module '@/generated/prisma'":**
```bash
npx prisma generate
# O cliente gerado não está no Git — precisa ser gerado localmente.
```

**Banco corrompido ou em estado inconsistente:**
```bash
npx prisma migrate status   # veja o estado das migrations
npx prisma migrate reset    # ⚠️ reseta tudo (só em dev)
```

**Erro "Environment variable not found: DATABASE_URL":**
- Verifique se o arquivo `.env` existe na raiz do projeto
- Verifique se contém: `DATABASE_URL="file:./dev.db"`
- O `.env` não está no Git — recrie manualmente se necessário (veja `.env.example`)

---

## 5. Manutenção

### 5.1 Atualizar dependências (com cautela)
```bash
# Ver o que está desatualizado:
npm outdated

# Atualizar uma dependência específica (mais seguro):
npm install <pacote>@latest

# Após atualizar, sempre:
npm run build   # confirmar que não quebrou nada
npm run lint    # confirmar que não há erros de lint
```
⚠️ Nunca rode `npm update` ou `npm audit fix --force` sem testar depois — pode quebrar a build.

### 5.2 Limpar caches (se o servidor estiver se comportando de forma estranha)
```bash
# Limpar cache do Next.js:
Remove-Item -Recurse -Force .next

# Limpar node_modules e reinstalar (caso extremo):
Remove-Item -Recurse -Force node_modules
npm install
npx prisma generate   # necessário após reinstalar
```

---

## 6. Testes manuais dos cenários críticos (Briefing seção 5)

Os cenários abaixo não são cobertos por Vitest porque dependem de comportamento de browser
ou de infraestrutura externa. Execute-os manualmente antes de cada deploy.

---

### Cenário 1 — localStorage: rascunho de formulário sobrevive ao fechar a aba

**Pré-condição:** servidor rodando (`npm run dev`), usuário `operador@solentis.local` logado.

1. Acesse `/operador/leituras/nova`
2. Selecione um ponto de coleta e preencha o campo de data/hora
3. Feche a aba do navegador **sem submeter**
4. Reabra `http://localhost:3000/operador/leituras/nova`

**Critério de aceite:** os campos preenchidos no passo 2 aparecem automaticamente.

Repita para:
- `/operador/ocorrencias/nova` (campo Descrição)
- `/tecnico/analises/nova` (campo Valor medido)

---

### Cenário 2 — Reconexão automática: sessão persiste após queda de rede

**Pré-condição:** servidor rodando, usuário logado no Chrome.

1. Abra qualquer página autenticada (ex.: `/operador/dashboard`)
2. Desconecte o cabo de rede ou desative o Wi-Fi por 30 segundos
3. Reconecte a rede
4. Recarregue a página (`F5`)

**Critério de aceite:** a página carrega normalmente sem redirecionar para `/login`.
O token JWT está no cookie — sessões já estabelecidas sobrevivem a interrupções de rede.

> **Nota:** se o servidor Next.js reiniciar durante a queda, o usuário precisará logar novamente
> (comportamento esperado — sem modo offline no MVP).

---

### Cenário 4 — Recomendação de no-break (infraestrutura)

Este cenário é de infraestrutura, não de software. Documente-o como procedimento operacional:

**Risco:** queda de energia durante escrita no SQLite pode corromper `prisma/dev.db`.

**Mitigações implementadas:**
- Script `scripts/backup.ts` para backup diário do banco
- Checklist de restore documentado na seção 2.4

**Ação recomendada para produção:**
- Instalar no-break (UPS) no servidor que hospeda o banco
- Configurar script de backup no cron (ver seção 2.2)
- Testar restore completo mensalmente (ver checklist 2.4)
- Manter pelo menos 7 backups rotacionados antes de deletar os mais antigos

---

## 7. Limitações conhecidas de sessão (JWT)

### 7.1 Não usar 2 perfis na mesma janela do navegador

**Causa:** o Solentis usa JWT armazenado em cookie HTTP. O browser compartilha o mesmo cookie entre TODAS as abas da mesma origem (localhost:3000 ou o domínio em produção). Isso significa:

- Tab 1 logada como Gestor → cookie contém JWT do Gestor
- Tab 2 navega para `/login` → o middleware detecta a sessão do Gestor e redireciona para `/gestor/dashboard`
- Tab 2 NÃO consegue logar como Operador sem que o Gestor faça logout primeiro

**Comportamento esperado (não é bug):** ao acessar um perfil diferente, o sistema mostrará os dados do perfil logado, não do perfil desejado.

**Procedimento correto para testar múltiplos perfis:**
1. Use **abas anônimas/privadas** separadas (cada aba anônima tem cookies isolados)
2. OU use **perfis diferentes do Chrome/Firefox** (cada perfil tem cookies separados)
3. OU faça logout completo (`Sair`) antes de logar com outro perfil na mesma janela

**Por que o MANAGER aparece em páginas do Operador/Técnico:** o MANAGER tem permissão para acessar rotas `/operador/*` e `/tecnico/*` (para monitoramento). Ao navegar para essas rotas, o MANAGER vê o seu próprio nome (ex.: "Administrador") no layout, o que é comportamento correto.

### 7.2 Expiração de sessão por perfil

| Perfil | Duração da sessão |
|--------|-------------------|
| Operador | 30 minutos |
| Técnico / Gestor | 60 minutos |

Após a expiração, o usuário é redirecionado para `/login` na próxima navegação protegida.

```

---
## HISTÓRICO DE COMMITS

```
77cff0e feat: onda 2E e 2F â€” botÃ£o voltar no gestor e auditoria botÃ£o sair
389e5b2 feat: onda 2D â€” botÃ£o voltar nas telas do tÃ©cnico
437d532 feat: onda 2C â€” botÃ£o voltar nas telas do operador
c237d44 feat: onda 2B â€” logo Solentis clicÃ¡vel leva ao dashboard
93fcf20 feat: onda 2A â€” componente BackButton reutilizÃ¡vel
998cbb3 fix: corrige guards de role em tarefas e instÃ¢ncias + documenta limitaÃ§Ã£o JWT no RUNBOOK
0cefed3 fix: remove filtro date:today da listagem de turnos do Operador â€” mostra todos os turnos OPEN/HANDOVER_PENDING independente da data
832a277 fix: refatora SignOutButton â€” signOut(redirect:false) + redirect() explÃ­cito para evitar erro pÃ³s-logout
cad94e0 fix: varredura Bug3 â€” sem headers inline restantes; corrige tÃ­tulo 'Create Next App' â†’ 'Solentis'
72528e0 fix: corrige active state duplo no sidebar do Gestor (Turnos vs InstÃ¢ncias de Turno)
50a9301 fix: corrige link Turnos no bottom nav do TÃ©cnico (/tecnico/turnos â†’ /tecnico/turnos/instancias)
0d13743 chore: adiciona playwright como devDependency (screenshots de verificaÃ§Ã£o)
df86254 docs: fase 12 concluÃ­da â€” CLAUDE.md atualizado com status e padrÃµes
c4a9626 feat: fase 12E â€” touch targets mÃ­nimos nos botÃµes inline do TÃ©cnico
126b68f feat: fase 12A-D â€” bottom nav Operador e TÃ©cnico + polish mobile
dd32721 docs: fase 11 concluÃ­da â€” CLAUDE.md atualizado com status e prÃ³ximo passo
5abf39d feat: fase 11E â€” script de backup SQLite + restore documentado no RUNBOOK
e36b4d4 test: fase 11D â€” 35 testes para os 13 cenÃ¡rios crÃ­ticos do briefing
cfaf4bf feat: fase 11C â€” UI de auditoria para o Gestor
a6653b6 feat: fase 11A+B â€” helper logAudit + audit log nas mutaÃ§Ãµes crÃ­ticas
5640cb0 fix: MANAGER acessa todas as rotas + pÃ¡gina inicial redireciona
ddde376 fix: pÃ¡gina inicial redireciona pro login + corrigir acesso operador + card tarefas no dashboard
e19923c fix: atualizar dashboards â€” links funcionais em vez de placeholders Em breve
5966c91 docs: CLAUDE.md â€” fase 10 dashboards concluÃ­da
513f625 feat: fase 10 â€” dashboards completos por perfil
5a97064 docs: CLAUDE.md â€” feature Estoque de Produtos QuÃ­micos concluÃ­da
129b0ab feat: estoque de produtos quÃ­micos â€” schema, CRUD, movimentaÃ§Ã£o, alertas
51cf3fc feat: tarefas por turno â€” atribuiÃ§Ã£o, conclusÃ£o com fotos, integraÃ§Ã£o handover
a63e740 feat: tarefas por turno â€” schema, CRUD, UI operador mobile-first, integraÃ§Ã£o handover
71e3bf6 docs: CLAUDE.md â€” prÃ³ximo passo atualizado para Fase 10
074df49 feat: fase 9 completa â€” turnos, passagem em 2 etapas, lazy timeout, AuditLog
f0fecb7 feat: fase 8 completa â€” ocorrÃªncias + upload de foto + prazo automÃ¡tico + resoluÃ§Ã£o
f2c5372 feat: fase 7 completa â€” equipamentos + preventivas + corretivas + dashboard tÃ©cnico
269f312 feat: fase 6 completa â€” anÃ¡lises laboratoriais, aprovaÃ§Ã£o, grÃ¡fico Recharts
982eabe feat: fase 5 completa â€” leituras de campo, localStorage, paginaÃ§Ã£o, testes
e5f2f15 feat: fase 4 completa â€” 6 CRUDs gestor + sidebar + 0 erros TypeScript
c05fa59 feat: CRUDs de parametros, metodos, categorias, pontos, turnos e prazos de ocorrencia
31191c1 feat: sidebar lateral fixa + refactor paginas gestor (sem header duplicado)
bb02249 feat: fase 3 completa â€” 21 tabelas + seed operacional + 3/3 criterios validados
44f1959 feat: seed operacional completo (8 params CONAMA, 3 pontos, 3 turnos, 6 categorias)
98c6774 feat: schema Prisma completo â€” 21 tabelas + 9 enums TypeScript (Bloco A)
acde5ed feat: fase 2 completa â€” autenticaÃ§Ã£o, CRUD usuÃ¡rios, 10 testes passando
f044d54 test: 4 cenÃ¡rios crÃ­ticos de auth com Vitest (Sub-passo J)
9c9676e feat: CRUD de usuÃ¡rios para Gestor (Sub-passo I)
46d8c27 fix: remover emoji dos dashboards + anotar logo como pendÃªncia futura
112a854 feat: dashboards placeholder por perfil + botÃ£o de logout (Sub-passo H)
f25443b feat: tela de troca de senha obrigatÃ³ria (Sub-passo G)
23fbbd4 feat: pÃ¡gina de login mobile-first + Server Action (Sub-passo F)
634faf4 feat: middleware de rotas por perfil (Sub-passo E)
979f12c feat: seed com tenant default + admin@solentis.local (must_change_password)

```