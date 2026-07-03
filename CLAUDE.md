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
✅ Item (f) — Modelo de dados aprovado (multi-tenant) — ver /docs/MODELO_DE_DADOS.md
✅ Fase 1 — Scaffold 100% CONCLUÍDA
✅ Fase 2 — Autenticação e Usuários CONCLUÍDA
✅ Fase 3 — Schema Completo + Seed CONCLUÍDA
✅ Fase 4 — Listas Gerenciadas pelo Gestor CONCLUÍDA
✅ Fase 5 — Leituras de Campo CONCLUÍDA
✅ Fase 6 — Análises Laboratoriais CONCLUÍDA
✅ Fase 7 — Equipamentos e Manutenções CONCLUÍDA
✅ Fase 8 — Ocorrências CONCLUÍDA
✅ Fase 9 — Turnos CONCLUÍDA
✅ Feature extra — Tarefas por Turno CONCLUÍDA
✅ Feature extra — Controle de Estoque de Produtos Químicos CONCLUÍDA
✅ Fase 10 — Dashboards CONCLUÍDA
✅ Fase 11 — Auditoria, Testes e Hardening CONCLUÍDA
✅ Fase 12 — Polish Mobile CONCLUÍDA
✅ Ciclo 3 — Notificações, Filtros, Exportação para CSV, Ponto de Coleta e Categoria na Ocorrência CONCLUÍDA
✅ Onda 3 — Suporte PWA (Serwist), Modo Offline com Sincronização Automática, Extração IA com Gemini para Laudos Externos, Geração de PDF e CRUD de Pontos de Coleta CONCLUÍDA
✅ Sessão de Hardening (2026-06-26) — Segurança, fuso horário, uploads, cadastro por convite (ver seção abaixo)
✅ Feature (2026-07-01) — Templates de tarefa por turno (gestor pré-configura análises criadas na abertura), foto de comprovação obrigatória por template, e "repetir tarefa" preservando o histórico. Model `ShiftTaskTemplate` + campos em `ShiftTask` (template_id, requires_photo, repeated_from_id, repeat_reason). Migração aplicada via `prisma db execute` (SQL aditivo em `prisma/sql/`) — o histórico de migrations do repo está incompleto, então NÃO usar `prisma migrate dev` (resetaria); o schema é gerenciado por SQL aditivo / `db push`.

## 🔧 Sessão de Hardening — 2026-06-26

Análise crítica + correção dos problemas que impediam virar produto. Todos os itens abaixo estão commitados e no `main`/Vercel.

### Segurança
- **Reset de senha reescrito (era account takeover):** o token antigo era `base64(email)` (forjável) e o link aparecia na tela do `/forgot`. Agora: token aleatório de 32 bytes, guardado só como **hash SHA-256**, validade 60 min, **uso único**, enviado **só por e-mail**. Não revela mais se o e-mail existe. Nova tabela `PasswordResetToken` (migration `20260626140000_add_password_reset_token`).
- **Cadastro agora é APENAS por convite (B2B):** `/signup`, `/verify-email` e `/invite/[token]` eram **mock** (não criavam nada). Removidos/redirecionados. Ao criar usuário, o gestor dispara **e-mail de convite** (token de definir senha, validade 7 dias, reaproveita o fluxo `/reset`). Link "Solicitar acesso" removido do login.
- **Cron protegido:** `/api/cron/shifts` agora é *fail-closed* em produção (exige `CRON_SECRET` + header correto).
- **Stack trace não vaza mais** em `criarUsuario` nem no import de laudos (mensagens amigáveis + log só no servidor).
- **PENDENTE (só o dono faz):** revogar o token do GitHub que estava embutido no `git remote`.

### Fuso horário (estava gravando/exibindo errado)
- **Gravação:** `localInputToUTC()` em `src/lib/date-utils.ts` converte o `datetime-local` (horário de Brasília) para UTC correto. Aplicado em leituras, análises, entradas/saídas/contagens de estoque. (Antes `new Date(string)` era interpretado como UTC no servidor da Vercel.)
- **Exibição:** `src/instrumentation.ts` define `process.env.TZ = 'America/Sao_Paulo'` no startup — corrige **todas** as telas server-rendered de uma vez. (A Vercel **reserva** a env `TZ`, não dá pra setar no painel; por isso é no código.)

### Infra / uploads
- **Uploads migrados para Vercel Blob** (`src/lib/storage.ts` → `saveUpload`/`readUpload`). Antes gravava em disco local, que **some no filesystem efêmero da Vercel**. Fallback para `./uploads` em dev. As fotos continuam servidas só por rotas autenticadas (não expõem a URL do Blob). **Requer criar o Blob Store na Vercel** (gera `BLOB_READ_WRITE_TOKEN`).

### Qualidade / build
- **Removido `typescript.ignoreBuildErrors`** do `next.config.mjs` — o build voltou a validar tipos. Corrigidos 4 erros reais (`recorded_by`/`created_by` podiam ser `null` → insert quebrava em runtime).
- **`middleware.ts` → `proxy.ts`** (convenção do Next 16; `middleware` está deprecated).
- Gráfico de tendência do dashboard: função `alpha()` gerava CSS inválido (`var(--x / 0.3)`) deixando o fundo preto → corrigida com `color-mix`; fontes dos eixos aumentadas.

### ⚠️ Ações pendentes na Vercel (Environment Variables)
`RESEND_API_KEY` + `EMAIL_FROM` (e-mails de reset/convite) · `BLOB_READ_WRITE_TOKEN` via Blob Store (uploads) · conferir `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` (push).

### ✅ Cron de turnos — OPERACIONAL (2026-07-01)
O cron `/api/cron/shifts` gera as instâncias `SCHEDULED` do dia. Estava quebrado por 3 motivos, todos corrigidos:
- **FK:** `opened_by` recebia a string `'CRON'` (viola FK User) → agora usa fallback escala→gestor, com `create` item-a-item e `console.warn` em quem for pulado.
- **Middleware:** `proxy.ts` redirecionava `/api/cron/*` ao `/login` → excluído do matcher (o handler já faz auth fail-closed via `CRON_SECRET`).
- **Horário:** `vercel.json` estava `0 0 * * *` (21h BRT) → agora `5 3 * * *` (03:05 UTC = 00:05 BRT).
Config viva: `CRON_SECRET` **setada na Vercel**; Cron Job registrado no painel (plano Hobby = janela flexível de 1h, ok); `ShiftSchedule` de Manhã/Tarde/Noite (todos os dias) criados no tenant Solentis. Depende da escala (`ShiftScale`) para o `opened_by` cair no operador certo; sem escala, cai no gestor.

### Próximos itens de robustez (não-bloqueantes)
- Reduzir os ~77 `any` aos poucos (não fazer sweep cego).
- Endurecer o service worker se o cache do PWA voltar a atrapalhar navegação de auth.

## 📊 Observabilidade — Logger estruturado (2026-07-01)

Camada de log profissional adicionada (PR #14, branch `feat/observabilidade-logger`). Antes: só `console.*` solto (38 ocorrências), sem estrutura, contexto ou masking, e alguns catches engolindo o erro sem rastro.

### `src/lib/logger.ts` (Pino)
- **Saída JSON** no stdout → cai no painel **Logs** da Vercel, filtrável por campo.
- **Data masking** via `redact`: `password`, `senha`, `password_hash`, `token`, `tempPassword`, `authorization`, `cookie`, `secret` (inclusive aninhados `*.token`) → `[REDACTED]`. **Regra: nunca logar segredo/PII.**
- **Níveis**: `trace<debug<info<warn<error<fatal`. `fatal`=dependência crítica fora · `error`=exceção que quebrou a operação · `warn`=degradação tolerada (retry, fail-open, notificação não enviada) · `info`=evento de negócio.
- **`getLogger({ userId, tenantId, action })`** → logger-filho com `requestId` (usa `x-vercel-id` p/ correlação). Nunca lança. Use em Server Actions/rotas.
- **`logger`** (base) → para código module-level ou fire-and-forget (fora do escopo de request).
- **Nível configurável** via env `LOG_LEVEL` na Vercel (sem deploy).

### ⚠️ Regras de uso
- **NUNCA importar o logger em código Edge** (`src/proxy.ts`) — Pino é Node-only. Server Actions e rotas rodam em Node (Prisma), lá é seguro.
- **Componentes client** (`push-manager`, `sync-manager`, `command-menu`, `error.tsx`) **seguem no `console`** de propósito — rodam no browser.
- Complementa (não substitui) o `logAudit()` (`src/lib/audit.ts`), que é auditoria **de negócio** (CONAMA), não observabilidade operacional.

### Estado
Zero `console.*` em código server-side (migração completa nas Fases 1–4). Falhas antes silenciosas agora deixam rastro (ex.: reset de senha, toggle de usuário, `getNotifications` que retornava `[]` mudo).

### ✅ Decisão — fail-open do rate-limit (2026-07-01)
Em `src/lib/auth.ts`, se a checagem de rate-limit no banco falhar, o login **prossegue sem proteção de brute-force** (*fail-open*), registrado em `WARN`. **Decidido manter fail-open** (prioriza disponibilidade — não trava operadores em campo por um soluço do banco; o risco de brute-force é estreito, pois um banco instável já derrubaria os outros passos do login). Se um dia quiser fail-closed, é ~1 linha + ajuste de teste.

## 🎨 Padrão de tabela de listagem do admin (2026-07-01)

Tabelas de listagem do Gestor usam um padrão único (PRs #23/#24). Ao criar uma nova listagem admin, **siga este padrão** em vez de coluna "Editar" navegando para página.

### Primitivas reutilizáveis (`src/components/ui/`)
- `sheet.tsx` — drawer lateral (Radix Dialog ancorado à direita) para edição in-place.
- `dropdown-menu.tsx` — menu de ações secundárias (kebab).
- `tooltip.tsx` — `<Tooltip label="…">{trigger}</Tooltip>`.
- `data-table-row.tsx` — `<DataTableRow onEdit={} actions={RowAction[]}>{...tds}</DataTableRow>`: linha clicável + **Pencil** (tooltip "Editar") + kebab **MoreVertical**; `hover:bg-muted/50`; **área de toque 44px** no kebab (PWA mobile). A célula de ações é anexada automática à direita.

### Como aplicar numa tela (ver Categorias como referência)
1. A `page.tsx` (Server Component) continua buscando os dados **e mantém a query intacta** (tenant-safe).
2. Criar um `<x>-table.tsx` (Client) que recebe `items`, renderiza `<DataTableRow>` por item e um `<Sheet>` com o form.
3. Criar um `<x>-sheet-form.tsx` (Client) que **reusa a MESMA server action** de edição (`editar…`), fecha o Sheet no sucesso (`onSaved` + `router.refresh()`).
4. Ativar/Desativar (soft-delete) e navegações extras vão como itens do **kebab**.
5. **Formulário pesado** (ex.: Parâmetros precisa de `method`/`collection_points` que a lista não carrega): **NÃO inchar a query da lista** — criar uma action de leitura tenant-safe (`carregar…`, guard de role) que o Sheet busca sob demanda ao abrir (com skeleton).
6. **Preservar as rotas `[id]` antigas** (deep-links e páginas que hospedam seções extras, ex.: schedule de Turnos, continuam funcionando).

## ⚠️ CORREÇÕES ao restante deste documento (estado REAL em 2026-06-26)
As seções antigas abaixo contêm afirmações **desatualizadas**. O estado real é:
- **Banco: PostgreSQL (Supabase)** — NÃO é mais SQLite. A "regra inviolável 3.1 (Prisma v5 / SQLite)" está **superada**: `provider = "postgresql"`. (Prisma client ainda na linha v5.)
- **5 perfis, não 3:** OPERATOR, TECHNICIAN, MANAGER, **MAINTENANCE**, **SUPER_ADMIN** (ver `ROUTE_ACCESS` em `src/lib/auth-utils.ts`).
- **Proteção de rotas:** `src/proxy.ts` (não `middleware.ts`).
- **Enums/JSON nativos do Postgres** podem ser usados (a limitação era do SQLite).
Trate o texto histórico abaixo como registro de fases, não como verdade atual de infra.

## Decisões-chave (resumo)
- Nome: Solentis
- Stack: Next.js 16.2.6, React 19, TypeScript, Tailwind v4, PostgreSQL/Supabase, NextAuth v5, Zod, Recharts, shadcn/ui, Pino (logs estruturados)
- Idioma: técnico em inglês, usuário/comentários em pt-BR
- Modo offline e PWA: IMPLEMENTADO com Serwist (sincronização automática de leituras ao voltar online)
- Sensores: NÃO no MVP, mas schema preparado (campos origem/metadata_origem)
- 3 perfis: Operador, Técnico, Gestor (matriz de permissões na seção 4 do briefing)
- Credencial inicial seed: admin@solentis.local / Admin@123 (sistema obriga troca no 1º login)
- Multi-tenant desde o MVP via tenant_id + middleware Prisma
- Servidor Next.js validado na porta :3000
- Tailwind v4 instalado (config no CSS, não em tailwind.config.ts)
- shadcn/ui v4.7 preset Nova + Radix + base neutral

### Tabelas (33)
tenants, users, login_attempts, sessions, push_subscriptions, quality_parameters, parameter_limits, parameter_history, parameter_aliases, analysis_methods, equipment_categories, collection_points, shifts, shift_schedules, occurrence_severity_defaults, equipment, shift_instances, readings, analyses, external_analyses, monitoring_schedules, preventive_maintenances, corrective_maintenances, occurrences, occurrence_photos, shift_handovers, shift_tasks, shift_task_photos, chemical_products, chemical_stock_entries, chemical_stock_exits, chemical_stock_counts, audit_logs

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
- ~~**Pós-MVP — Notificação Nível 3 (push/email de não-conformidade)**~~ ✅ CONCLUÍDO (2026-07-01): leitura fora do limite dispara push aos gestores (`sendPushToRole`) além da ocorrência automática; push de análises também corrigido/reforçado. Ver `operador/leituras/actions.ts` e `tecnico/analises/actions.ts`.
- ~~**Pós-MVP — Abertura automática de turno no login**~~ ✅ CONCLUÍDO (2026-07-01): abertura assistida de 1 clique no dashboard do operador — o turno da faixa horária atual (via `encontrarTurnoAtual` em `shift-utils.ts`) vem pré-selecionado. Não cria instância silenciosamente (evita turno errado/duplicado).
- **Pós-MVP — Repensar fluxo de turno e passagem:** Revisar o fluxo de abertura/fechamento de turno e checklist de passagem com base no feedback dos operadores em campo.
- ~~**Pós-MVP — Resumo do turno anterior para o entrante**~~ ✅ CONCLUÍDO (2026-07-01): card "Resumo do turno anterior" no dashboard do operador quando não há turno ativo (leituras, ocorrências em aberto, tarefas não concluídas e observações do último turno encerrado).


# SOLENTIS — Relatório de Handoff Técnico
### Documento de transferência de contexto para colaboração entre IAs
**Última atualização:** 2026-07-01 — Ondas 1–4 concluídas (itens acionáveis); falta QA de campo com usuários reais
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
Pasta:    C:\Users\Vitor\projetos\solentis  (Windows, pt-BR)
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

### 7.2 CONCLUÍDA — Onda 3 (mudanças de fluxo / regras de negócio)
Verificada no código em 2026-07-01 (os 5 itens já estavam implementados em commits posteriores à última atualização destes docs):
- ✅ Técnico também registra **saída** de produtos químicos — rota `/tecnico/estoque/[id]/saida` (page + `exit-form`); o action `registrarSaida` (em `operador/estoque/actions.ts`) libera `OPERATOR` e `TECHNICIAN` e revalida `/tecnico/estoque`
- ✅ Técnico **e** Gestor também registram ocorrências — rotas `/tecnico/ocorrencias/nova` e `/gestor/ocorrencias/nova` importam `registrarOcorrencia`; o guard `requireAuthenticated` aceita `OPERATOR/TECHNICIAN/MANAGER`
- ✅ Atribuir tarefa **sem abrir o turno** (pré-agendamento) — rota `/gestor/turnos/tarefas/pre-agendar` (page + `pre-agendar-form`) chama o action `preAgendarTurno`, criando uma instância de turno com data futura para atribuir tarefas antecipadamente
- ✅ Repensar o uso de "ocorrências" — reformuladas com kanban (`updateOccurrenceStatus`), comentários (`addOccurrenceComment`), tipos (`OPERATIONAL/LABORATORY/EQUIPMENT/ENVIRONMENTAL/SAFETY`), categoria, ação imediata obrigatória em severidade Alta/Crítica e alerta WhatsApp para gestores
- ✅ Estoque: mostra **quem registrou** cada movimento — detalhe do produto (`gestor/produtos-quimicos/[id]/page.tsx`) lista cada movimentação com `{data} · {recorder.name}` em entradas, saídas e contagens

### 7.3 CONCLUÍDA — Onda 4 (pós-MVP, features grandes)
Itens acionáveis concluídos e verificados no código/QA em 2026-07-01:
- ✅ **Leitura de laudos com IA** — implementado com Gemini (`gemini-2.5-flash` + fallbacks, retries) em `/gestor/laudos/importar`
- ✅ **Abertura automática de turno no login** — abertura *assistida* de 1 clique no dashboard do operador (turno da faixa horária atual via `encontrarTurnoAtual`); decisão deliberada de NÃO criar instância silenciosamente (evita turno errado/duplicado). Ver `operador/dashboard/abrir-turno-rapido.tsx`
- ✅ **Resumo do turno anterior para o entrante** — card no dashboard do operador (leituras, ocorrências em aberto, tarefas não concluídas, observações do último turno encerrado)
- ✅ **Notificações push para não-conformidade** — leitura fora do limite CONAMA dispara push aos gestores (`sendPushToRole`, tenant-safe via relação `user`); análises também notificam. Infra: `web-push.ts` / `push-actions.ts` (VAPID)
- ✅ **PWA (instalação + offline parcial)** — Serwist
- ✅ **Deploy + migração para PostgreSQL** — rodando na Vercel com Supabase (Postgres)
- ⏸️ **DBO5 como "último resultado com data"** — pendente (refinamento de UX; avaliar com uso real)
- ⏸️ **Sensores online** (DBO, OD, pH) — FORA de escopo por decisão do briefing (prazo LONGO; DBO exige 5 dias de incubação)
- ⏸️ **Repensar fluxo de turno/passagem** — pendente; precisa de feedback de operadores em campo (não é tarefa de código)

### 7.4 Validação obrigatória antes de "produção"
O sistema é um **protótipo funcional**. Antes de uso real: validação em campo numa ETE parceira por pelo menos 3 meses, com feedback dos 3 perfis. As Ondas 1–4 (itens acionáveis) estão concluídas; falta o QA de campo com usuários reais.

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
**Última atualização:** 2026-07-01 — Ondas 1–4 concluídas (itens acionáveis); falta QA de campo com usuários reais
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
Pasta:    C:\Users\Vitor\projetos\solentis  (Windows, pt-BR)
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

### 7.2 CONCLUÍDA — Onda 3 (mudanças de fluxo / regras de negócio)
Verificada no código em 2026-07-01 (os 5 itens já estavam implementados em commits posteriores à última atualização destes docs):
- ✅ Técnico também registra **saída** de produtos químicos — rota `/tecnico/estoque/[id]/saida` (page + `exit-form`); o action `registrarSaida` (em `operador/estoque/actions.ts`) libera `OPERATOR` e `TECHNICIAN` e revalida `/tecnico/estoque`
- ✅ Técnico **e** Gestor também registram ocorrências — rotas `/tecnico/ocorrencias/nova` e `/gestor/ocorrencias/nova` importam `registrarOcorrencia`; o guard `requireAuthenticated` aceita `OPERATOR/TECHNICIAN/MANAGER`
- ✅ Atribuir tarefa **sem abrir o turno** (pré-agendamento) — rota `/gestor/turnos/tarefas/pre-agendar` (page + `pre-agendar-form`) chama o action `preAgendarTurno`, criando uma instância de turno com data futura para atribuir tarefas antecipadamente
- ✅ Repensar o uso de "ocorrências" — reformuladas com kanban (`updateOccurrenceStatus`), comentários (`addOccurrenceComment`), tipos (`OPERATIONAL/LABORATORY/EQUIPMENT/ENVIRONMENTAL/SAFETY`), categoria, ação imediata obrigatória em severidade Alta/Crítica e alerta WhatsApp para gestores
- ✅ Estoque: mostra **quem registrou** cada movimento — detalhe do produto (`gestor/produtos-quimicos/[id]/page.tsx`) lista cada movimentação com `{data} · {recorder.name}` em entradas, saídas e contagens

### 7.3 CONCLUÍDA — Onda 4 (pós-MVP, features grandes)
Itens acionáveis concluídos e verificados no código/QA em 2026-07-01:
- ✅ **Leitura de laudos com IA** — implementado com Gemini (`gemini-2.5-flash` + fallbacks, retries) em `/gestor/laudos/importar`
- ✅ **Abertura automática de turno no login** — abertura *assistida* de 1 clique no dashboard do operador (turno da faixa horária atual via `encontrarTurnoAtual`); decisão deliberada de NÃO criar instância silenciosamente (evita turno errado/duplicado). Ver `operador/dashboard/abrir-turno-rapido.tsx`
- ✅ **Resumo do turno anterior para o entrante** — card no dashboard do operador (leituras, ocorrências em aberto, tarefas não concluídas, observações do último turno encerrado)
- ✅ **Notificações push para não-conformidade** — leitura fora do limite CONAMA dispara push aos gestores (`sendPushToRole`, tenant-safe via relação `user`); análises também notificam. Infra: `web-push.ts` / `push-actions.ts` (VAPID)
- ✅ **PWA (instalação + offline parcial)** — Serwist
- ✅ **Deploy + migração para PostgreSQL** — rodando na Vercel com Supabase (Postgres)
- ⏸️ **DBO5 como "último resultado com data"** — pendente (refinamento de UX; avaliar com uso real)
- ⏸️ **Sensores online** (DBO, OD, pH) — FORA de escopo por decisão do briefing (prazo LONGO; DBO exige 5 dias de incubação)
- ⏸️ **Repensar fluxo de turno/passagem** — pendente; precisa de feedback de operadores em campo (não é tarefa de código)

### 7.4 Validação obrigatória antes de "produção"
O sistema é um **protótipo funcional**. Antes de uso real: validação em campo numa ETE parceira por pelo menos 3 meses, com feedback dos 3 perfis. As Ondas 1–4 (itens acionáveis) estão concluídas; falta o QA de campo com usuários reais.

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
