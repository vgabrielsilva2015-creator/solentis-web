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

### 📍 Próximo passo ao retomar
Iniciar Fase 9 — Turnos (abertura, passagem em 2 etapas, fechamento, imutabilidade para Operador/Técnico, edição pelo Gestor com justificativa + AuditLog).

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
