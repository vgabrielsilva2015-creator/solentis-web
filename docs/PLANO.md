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
