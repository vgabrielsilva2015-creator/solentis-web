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
⏳ Item (g) — EM ANDAMENTO: Fase 1 (scaffold) ~70% concluída — ver seção abaixo

## Decisões-chave (resumo)
- Nome: Solentis
- Stack: Next.js 14+, TypeScript, Tailwind, SQLite+Prisma, NextAuth, Zod, Recharts, shadcn/ui
- Idioma: técnico em inglês, usuário/comentários em pt-BR
- Modo offline: NÃO no MVP (talvez v1.0, "a avaliar")
- Sensores: NÃO no MVP, mas schema preparado (campos origem/metadata_origem)
- 3 perfis: Operador, Técnico, Gestor (matriz de permissões na seção 4 do briefing)
- Credencial inicial seed: admin@solentis.local / Admin@123 (sistema obriga troca no 1º login)
- Multi-tenant desde o MVP via tenant_id + middleware Prisma (seed: id="default")
- Servidor Next.js validado em :3000 — Fase 1 ~70% concluída
- Tailwind v4 instalado (config no CSS, não em tailwind.config.ts)

### Tabelas (21)
tenants, users, sessions, login_attempts, quality_parameters, analysis_methods,
equipment_categories, collection_points, shifts, occurrence_severity_defaults,
readings, analyses, equipment, preventive_maintenances, corrective_maintenances,
occurrences, occurrence_photos, shift_instances, shift_handovers, audit_logs, parameter_history

### Enums (9)
Role, DataOrigin, OccurrenceSeverity, OccurrenceStatus, MaintenanceStatus,
Priority, ShiftInstanceStatus, HandoverStatus, AuditAction

## Status da Fase 1 (Scaffold) — marco parcial 2026-05-12

### ✅ Concluído e validado
- create-next-app com TypeScript, Tailwind v4, App Router, ESLint
- Paths `@/*` configurados via tsconfig.json
- `.gitignore` mesclado (entradas críticas: *.db, uploads/, backups/)
- Estrutura `src/app/`, `public/` criada; `docs/` preservado
- Commit intermediário: `4869337` — ponto de retorno seguro
- **Critério de aceite #1:** `npm run dev` sobe em :3000 sem erros ✅ validado

### ⏳ Pendente para fechar a Fase 1
- shadcn/ui instalado e configurado
- Prisma + SQLite inicializado (banco vazio, conexão testada)
- Página inicial exibindo "Solentis" (limpar boilerplate)
- `/docs/RUNBOOK.md` criado com comandos úteis
- `.env.example` com variáveis documentadas
- Desativar telemetria do Next.js (`NEXT_TELEMETRY_DISABLED=1` no .env.example)
- **Critério de aceite #2:** página exibe "Solentis"
- **Critério de aceite #3:** `npx prisma studio` abre sem erro

### 📍 Próximo passo na retomada
Instalar shadcn/ui (comando: `npx shadcn@latest init`). Antes de rodar, resolver:

### Decisões pendentes para próxima sessão
- Paleta de cores definitiva do shadcn: azul-petróleo? slate? qual hex?
- Conteúdo da página inicial customizada "Solentis" (só texto? logo? card de login?)
- Estrutura do RUNBOOK.md (seções: rodar dev, resetar banco, backup, restore, LGPD anonymize)

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
