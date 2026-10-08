# Solentis — Auditoria Técnica Passada 2
## Arquitetura, priorização e plano de correção

**Data:** 07/10/2026
**Base analisada:** `origin/main` = `f7962c1` (conferido com `git ls-remote` hoje — nada mudou desde a Passada 1), working tree local `meu-projeto` = `8ca8712` + WIP não commitado, relatório `AUDIT-PASS-1.md`, histórico Git completo e os resultados de runtime da Passada 1.
**Regra seguida:** nada foi implementado. Nenhum arquivo do projeto foi alterado (só este relatório foi criado).

Nesta passada fiz verificações adicionais para tirar dúvidas da Passada 1: inventário de todas as FKs que chegam do cliente, comparação de IDs de server actions entre dois builds independentes, leitura dos fluxos de estoque, contagem de guards, consultas e formulários numéricos, e conferência dos parâmetros da `DATABASE_URL` local (sem expor credenciais). Os resultados estão incorporados abaixo e geraram 5 achados novos (N-01 a N-05).

Esforço usa esta escala, pensada para um desenvolvedor solo com apoio de agentes de código:
**S** ≤ meio dia · **M** 1–2 dias · **L** 3–5 dias · **XL** mais de uma semana.

---

## 1. Validação da Passada 1

| ID | Problema | Veredito | Comentário da revalidação |
|---|---|---|---|
| P-01 | Sync offline descarta leituras | **CONFIRMADO** | Reproduzido. Problema maior por trás: contrato cliente↔servidor não tipado e fila em `localStorage` sem idempotência (RC-5, RC-10). |
| P-02 | Sessão sobrevive a desativação/troca de papel/planta | **CONFIRMADO** | Reproduzido nos 3 casos. Causa: JWT nunca revalidado (RC-2). |
| P-03 | Timeout de 30 min do operador inexistente | **CONFIRMADO** | Token com `exp - iat = 3600`. Mesma causa de P-02. |
| P-04 | Next 16.2.12 com advisories críticos; CI quebrado | **CONFIRMADO**, severidade **reclassificada para ALTO** | Na Vercel o Image Optimization roda na infraestrutura da plataforma e o app não usa `next/og`, então a exploração direta em produção é improvável. Continua P0 porque o gate de CI está vermelho e a correção é barata. |
| P-05 | Escrita cross-tenant via FK | **CONFIRMADO** e **maior que o reportado** | Além de análise, ocorrência, cronograma e equipamento, a revalidação achou o mesmo padrão em entrada e contagem de estoque (N-02). Causa-raiz: não existe um ponto único que garanta posse de referências (RC-1). |
| P-06 | Dashboard 47 MB / 14,7 s | **CONFIRMADO** | A causa não é falta de índice: é o padrão de carregar linhas brutas para montar a visão (RC-4). |
| P-07 | Banco não reproduzível | **CONFIRMADO** | O estado do unique global de e-mail em produção **PRECISA INVESTIGAÇÃO**. |
| P-08 | Service worker cacheia RSC autenticado | **CONFIRMADO**, impacto **reduzido para MÉDIO** | Os dados cacheados são do mesmo tenant (colegas da mesma planta já veem quase tudo). O risco real é aparelho perdido/roubado e dados de outro usuário servidos offline. Correção continua barata. |
| P-09 | Credenciais fixas, incluindo SUPER_ADMIN | **CONFIRMADO no código** / **PRECISA INVESTIGAÇÃO** em produção | Se existir em produção com a senha padrão, vira o problema mais grave do sistema. |
| P-10 | Lockout como DoS + enumeração | **CONFIRMADO** | |
| P-11 | Troca de senha sem senha atual | **CONFIRMADO** | |
| P-12 | Reset de senha sem rate limit | **CONFIRMADO** | A enumeração por tempo continua **PRECISA INVESTIGAÇÃO** (precisa de Resend real). |
| P-13 | Erro do Prisma na tela de login | **CONFIRMADO** | Faz parte de uma ausência geral de política de erro (RC-9). |
| P-14 | Busca não acha maiúsculas | **CONFIRMADO** | |
| P-15 | Vírgula decimal | **CONFIRMADO** no servidor | Afeta 24 arquivos / 27 campos `type="number"`. Comportamento do teclado em celular real **PRECISA INVESTIGAÇÃO**. |
| P-16 | Leitura cai no turno de outro operador | **CONFIRMADO** (código) | |
| P-17 | Limites de upload acima do limite da Vercel | **PRECISA INVESTIGAÇÃO** | O limite de 4,5 MB da Vercel é documentado, mas não testei em preview. Teste: subir PDF de 6 MB num preview. |
| P-18 | Blob público + URL no cliente | **CONFIRMADO** (código) | Agravante novo: as chaves do Blob não têm prefixo de tenant, o que impede apagar/exportar arquivos por cliente. |
| P-19 | Testes não testam o produto | **CONFIRMADO** | |
| P-20 | Sem observabilidade | **CONFIRMADO** | |
| B-01..B-12 | Bugs funcionais | **CONFIRMADO** (todos) | B-05 e B-12 confirmados por captura; os demais por código ou execução. |
| V-11 | `sendPushToRole/Users` sem auth | **CONFIRMADO** no código, risco **BAIXO** | Revalidei: os IDs das 85 actions **mudam a cada build** (0 de 85 iguais entre dois builds independentes) e esses dois não estão no JS público. Não dá para chamar sem vazamento do manifesto. Corrigir como higiene. |
| V-12 | HTML injection no e-mail de convite | **CONFIRMADO** (código) | Baixo (exige ser gestor). |
| V-13 | Erro cru em `editarUsuario` / enumeração cross-tenant de e-mail | **CONFIRMADO** (código) | |
| V-14 | `obterDetalhesPonto` sem checagem de papel | **FALSO POSITIVO** como vulnerabilidade | Não explorável (testado). Fica como endurecimento. |
| V-15 | Proxy não roda em caminhos com ponto | **FALSO POSITIVO** como vulnerabilidade | Páginas se protegem sozinhas (testado). |
| V-16..V-19 | Controles que funcionaram | **CONFIRMADO** (ok) | |

### Achados novos desta passada

| ID | Achado | Status | Severidade |
|---|---|---|---|
| N-01 | **Saída de estoque com condição de corrida**: `registrarSaida` calcula o saldo, compara e só depois insere, sem transação nem lock (`operador/estoque/actions.ts` linhas 62–97). Dois operadores registrando ao mesmo tempo deixam o estoque negativo. | CONFIRMADO (código) | 🟡 MÉDIO |
| N-02 | **Entrada e contagem de estoque aceitam `product_id` de outra planta** (`gestor/produtos-quimicos/actions.ts` ~linha 148; `operador/estoque/actions.ts` linha 139). A saída é barrada só por acaso (o saldo de outro tenant aparece como 0). | CONFIRMADO (código) | 🟠 ALTO (mesmo grupo de P-05) |
| N-03 | **Guards com nome enganoso e listas divergentes**: 21 guards locais. `requireOperator` aceita OPERATOR+MANAGER num arquivo e OPERATOR+MANAGER+TECHNICIAN em outro; `requireTechnicianOrManager` em `tecnico/equipamentos` também libera MAINTENANCE. A política de acesso não está escrita em lugar nenhum. | CONFIRMADO | 🟡 MÉDIO |
| N-04 | **`DATABASE_URL` local sem `connection_limit`** (só `?pgbouncer=true`), apontando para um pooler Supabase. Scripts rodados localmente usam o pool padrão do Prisma contra esse banco. | CONFIRMADO | 🔵 BAIXO |
| N-05 | **Identidade do usuário resolvida por e-mail em toda action**: 35 chamadas a `resolveUserId(session.user.email!)`, cada uma uma query extra, mesmo com `session.user.id` disponível. Somado às 226 chamadas a `getTenantId()`. | CONFIRMADO | 🔵 BAIXO (performance e clareza) |

---

## 2. Agrupamento — os sintomas e suas causas

Os ~50 itens da Passada 1 se reduzem a **12 causas-raiz**. Corrigir a causa resolve o grupo inteiro e impede que o sintoma volte.

| Causa-raiz | Sintomas que explica |
|---|---|
| **RC-1** Autorização e isolamento por convenção em cada action | P-05, N-02, N-03, N-05, V-11, V-14, pontos cegos do guardião, 226 `getTenantId()` |
| **RC-2** Sessão JWT sem revalidação no servidor | P-02, P-03, P-11 (troca não derruba outras sessões), reset não derruba sessões |
| **RC-3** Schema gerenciado por `db push` + SQL avulso, sem migrations | P-07, dúvida sobre unique de e-mail e índices em produção, ausência de staging, impossibilidade de testes de integração no CI |
| **RC-4** Visões montadas carregando linhas brutas para a memória; 3 tabelas de medição paralelas; nenhuma política de paginação | P-06, export sem limite, cron serial, 162 `findMany` sem `take`, busca sem índice |
| **RC-5** Contratos cliente↔servidor duplicados e não tipados | P-01, P-15, schemas copiados nos testes, mensagens Zod cruas |
| **RC-6** Pipeline de qualidade que não exercita o produto | P-19, P-01/P-14/B-05 chegaram na `main`, gate de audit quebrado sem ninguém ver |
| **RC-7** Operação de protótipo: planos gratuitos, sem staging, scripts com credenciais apontando para o banco real | P-09, P-20, N-04, itens de Vercel/Supabase não verificáveis |
| **RC-8** Nenhum controle de abuso na borda | P-10, P-12, B-09 (entrada sem tamanho máximo) |
| **RC-9** Nenhuma política de tratamento de erro | P-13, V-13, mensagens Zod em inglês |
| **RC-10** Estratégia PWA incompleta | P-08, P-01 (fila em `localStorage`, formulário que nem abre offline) |
| **RC-11** Modelo de acesso a arquivos | P-18, P-17, falta de prefixo por tenant |
| **RC-12** Duplicação por pasta de papel e God files | ~2.000 linhas duplicadas, bugs corrigidos só de um lado, B-05/B-12 |

---

## 3. Root causes

### RC-1 — Isolamento e autorização por convenção
```
Gestor da planta A vê nome de ponto da planta B
↓
Action grava collection_point_id vindo do formulário sem checar o dono
↓
Cada action decide sozinha o que validar; FK do Postgres é global
↓
Não existe camada de acesso a dados com contexto de tenant, nem regra de "toda referência recebida do cliente prova posse"
↓
SOLUÇÃO: contexto de requisição único (userId, tenantId, role) + helper de posse de referência obrigatório + guardião que entende FKs + (depois) FK composta (tenant_id, id) no banco
```

### RC-2 — Sessão sem revalidação
```
Operador desativado continua usando o app
↓
proxy e páginas confiam só no JWT
↓
role/tenantId/is_active gravados no token no login e nunca relidos
↓
Escolha de JWT stateless sem mecanismo de invalidação
↓
SOLUÇÃO: callback jwt no auth.ts revalida usuário e planta no banco a cada N segundos (60 s) e compara um session_version no usuário; timeout por papel via iat
```

### RC-3 — Schema sem disciplina de migração
```
Não dá para criar staging nem restaurar
↓
Migrations param em junho
↓
Alterações feitas com db push e SQL manual no SQL Editor
↓
Medo do `prisma migrate dev` resetar o banco (histórico incompleto)
↓
SOLUÇÃO: baseline gerado a partir do banco real, marcado como aplicado; daqui em diante só `migrate dev --create-only` + `migrate deploy` no pipeline
```

### RC-4 — Leitura sem agregação
```
Dashboard 47 MB
↓
findMany de todas as ocorrências abertas e de todas as leituras do período
↓
Agregação feita em JavaScript, para 3 tabelas de medição separadas
↓
Não existe camada de "read model" (agregados por dia/ponto/parâmetro) nem regra de paginação
↓
SOLUÇÃO: consultas agregadas no banco (GROUP BY dia), listas com take, tabela/visão de agregados diários, regra de projeto "nenhum findMany de usuário sem take"
```

### RC-5 — Contratos não compartilhados
```
Leituras offline perdidas
↓
SyncManager envia campos com nomes diferentes do schema
↓
Formulário, fila offline, action e testes mantêm cópias próprias do formato
↓
Schemas Zod vivem dentro dos arquivos de action e são redeclarados em outros lugares
↓
SOLUÇÃO: schemas em módulos compartilhados (`*.schema.ts`), fila e testes importam o mesmo schema; preprocess numérico único que aceita vírgula
```

### RC-6 — Pipeline que não testa o produto
```
Bug grave na main com 185 testes verdes
↓
Testes só cobrem funções puras e cópias de schemas
↓
Nenhum teste chama uma action com banco de verdade
↓
Não havia banco reproduzível para testar (RC-3) e CI só roda vitest+tsc
↓
SOLUÇÃO: depois do baseline, Postgres no CI + testes de integração das actions críticas + build + lint + E2E no preview
```

As outras causas (RC-7 a RC-12) têm cadeias curtas e estão detalhadas no plano de implementação.

---

## 4. Priorização

| Prioridade | Definição | Itens |
|---|---|---|
| **P0 — BLOQUEADOR** | Pode destruir dados, vazar entre clientes ou derrubar segurança. Nenhum cliente pagante antes disso. | P-01, P-02/P-03, P-04, P-05/N-02, P-09 (verificação em produção), RC-7 (planos, backup testado), P-13 |
| **P1 — CRÍTICO** | Essencial para operar com clientes reais e para conseguir corrigir o resto com segurança. | P-07 (baseline + staging), P-06, P-08, P-10, P-11, P-12, P-14, P-15, P-16, N-01, P-19 (harness de integração), P-20 (rastreamento de erros), CI completo |
| **P2 — IMPORTANTE** | Reduz risco e custo futuro; sem urgência imediata. | P-17, P-18, N-03, RC-1 estrutural (cliente Prisma com escopo), constraints e índices, export/cron, cache, B-05..B-12, limpeza de código morto e scripts, documentação, lint |
| **P3 — MELHORIA** | Escala de centenas/milhares de clientes e polimento. | RLS completo, particionamento, réplica de leitura, enums nativos, upgrade do Prisma, deduplicação total gestor/técnico, acessibilidade WCAG, fila de jobs |

---

## 5. O que NÃO deve ser alterado

Estas partes estão corretas e devem ser preservadas. Mexer nelas por estética só adiciona risco.

**Stack**
- Next.js App Router + Server Components + Server Actions. O padrão de "page busca, client renderiza, action grava" é adequado para o produto.
- PostgreSQL (Supabase) + Prisma 5.22. O upgrade do Prisma fica para depois do baseline; não misturar as duas coisas.
- NextAuth v5 com Credentials e JWT. O problema é a falta de revalidação, não a escolha de JWT.
- Tailwind v4 + shadcn/ui (Radix), Zod, Pino, Resend, Vercel Blob (mudando só o modo de acesso), Serwist (corrigindo só as regras), Recharts, `@react-pdf`.
- Vercel em `gru1` + Supabase `sa-east-1` (latência boa para o Brasil).

**Decisões e código que devem permanecer**
- `tenant_id` em todas as tabelas de negócio e índices começando por `tenant_id`.
- Snapshots imutáveis de limites legais (`min_limit_applied`/`max_limit_applied`) — correto para CONAMA 430.
- `OVERDUE`/`TIMED_OUT` calculados em query (com a ressalva de B-11).
- `logAudit()` dentro da mesma transação da mutação (`src/lib/audit.ts`).
- `src/lib/logger.ts` (JSON, redaction, `requestId`) — só será complementado.
- `src/lib/storage.ts` como abstração única (`saveUpload`/`readUpload`/`saveImageUpload`) e o `sniffImageType` por magic bytes.
- `csvSafe` contra formula injection em `/api/export`.
- Fluxo de reset/convite com token aleatório de 32 bytes, só hash no banco, uso único (`auth-tokens.ts`, `(auth)/actions.ts`).
- Hash anti-timing no login e `bcrypt` custo 12.
- `src/lib/shift-window.ts` e seus 23 testes; índices únicos parciais de turno (`add_unique_open_shift.sql`, `add_unique_turno_por_operador.sql`).
- `localInputToUTC()` em `date-utils.ts`.
- O guardião `tenant-isolation.test.ts` — continua, ganha regras novas.
- Headers de segurança do `next.config.mjs`, bloqueio de `/api/debug`, cron fail-closed com `CRON_SECRET`.
- Padrão de listagem admin (`DataTableRow` + `Sheet` + action de leitura sob demanda).
- Paginação já existente em `/gestor/ocorrencias`.
- Compressão de imagem no cliente (`compress-image.ts`) e validação do total antes do envio no formulário de leitura.
- O design do fluxo do operador no celular (visão nova aprovada em agosto).

---

## 6. O que deve ser refatorado

| Arquivo(s) | Problema | Motivo | Estratégia | Risco | Depende de |
|---|---|---|---|---|---|
| `src/lib/auth.ts`, `src/lib/auth.config.ts`, `src/lib/auth-utils.ts` | JWT nunca revalidado; timeout por papel quebrado | P-02, P-03 | Callback `jwt` só no `auth.ts` (Node) relendo `is_active`, `role`, `tenant.is_active` e `session_version` a cada 60 s; o `auth.config.ts` (proxy) continua sem banco. Timeout por papel via `iat`. | Médio — afeta todo login. Mitigar com teste de integração e feature flag de intervalo. | Coluna `session_version` (migration) |
| `src/app/(auth)/login/actions.ts`, `(auth)/actions.ts`, `(auth)/trocar-senha/*` | Erro cru; lockout como DoS; reset sem limite; troca sem senha atual | P-10..P-13 | Mensagem genérica; rate limit por IP+e-mail com atraso progressivo; senha atual obrigatória; incrementar `session_version` em reset/troca | Baixo | Módulo de rate limit (T-13) |
| Todas as actions com FK do cliente (lista exata em T-05) | Escrita cross-tenant | P-05, N-02 | Helper `assertOwned(tx, 'collectionPoint', id, tenantId)` antes de gravar; teste de integração por action | Baixo por ponto, médio pelo volume | Harness de integração ajuda, mas não bloqueia |
| `src/lib/__tests__/tenant-isolation.test.ts` | Pontos cegos | RC-1 | Exigir `tenant_id` dentro do `where` (não em qualquer lugar), proibir literal, cobrir `$queryRaw`, sinalizar `formData.get('*_id')` sem `assertOwned` | Baixo | T-05 |
| 21 guards locais → `src/server/auth/guards.ts` | Políticas divergentes (N-03) | Fonte única da verdade | Um `requireRole(roles)` que retorna `{ userId, tenantId, role }` a partir da sessão; matriz de permissões em um arquivo; substituir arquivo por arquivo | Médio — erro aqui libera/bloqueia papel errado | Matriz aprovada por você |
| `src/app/gestor/dashboard/page.tsx` (camada de dados) | Carrega linhas brutas | P-06 | Reescrever só a parte de consultas (ver seção 7); manter os componentes visuais | Médio | Índices (T-17) |
| `src/app/sw.ts`, `src/components/sign-out-*.ts` | Cache de RSC autenticado | P-08 | `NetworkOnly` para requisições com header `RSC` e para `/manutencao`; `caches.delete` no logout | Baixo | — |
| `src/app/api/search/route.ts` | Case-sensitive, links por papel | P-14, B-08 | `mode: 'insensitive'`; href por papel; depois `pg_trgm` | Baixo | — |
| Actions com campos numéricos (10 preprocess, 27 campos) | Vírgula | P-15 | `numberPtBR` único em `src/lib/zod-helpers.ts`; inputs com `inputMode="decimal"` | Baixo | T-11 |
| `src/app/operador/leituras/actions.ts` (linhas 126–134) | Leitura no turno de outro | P-16 | Sem turno próprio → `shift_instance_id = null` (ou bloquear, decisão de produto) | Baixo | Decisão sua |
| `src/app/operador/estoque/actions.ts` | Corrida no saldo | N-01 | Transação com `SELECT ... FOR UPDATE` no produto (ou advisory lock por produto) | Baixo | — |
| `src/lib/storage.ts` + rotas de foto + páginas de equipamento | Blob público | P-18 | Blob privado (`access: 'private'` + leitura via SDK no servidor) ou URL assinada curta; prefixo `tenants/{tenantId}/`; nunca enviar URL ao cliente | Médio — migração dos arquivos existentes | Script de migração do Blob |
| Uploads grandes (manual, laudo IA) | > 4,5 MB | P-17 | Upload direto do navegador para o Blob (client upload com token emitido por action autenticada) | Médio | T-23 |
| `src/lib/push-actions.ts` | Funções internas expostas como action | V-11 | Separar em `push-actions.ts` (`'use server'`, só subscribe/unsubscribe) e `push-service.ts` (sem `'use server'`) | Baixo | — |
| `gestor/(sistema)/cronograma/novo/actions.ts` | Sem Zod, `created_by` errado | B-07 | Zod + guard + `assertOwned` + `created_by = ctx.userId` | Baixo | T-05 |
| Mensagens de erro (todas as actions) | Zod/Prisma cru na tela | RC-9 | `toUserError()` central + mapa de mensagens Zod em pt-BR | Baixo | — |
| `api/export/route.ts` | Ocorrências sem limite | RC-4 | Período obrigatório + streaming em páginas | Baixo | — |
| `api/cron/shifts/route.ts` | N+1 serial | RC-4 | Buscar escalas/gestores de uma vez (`IN`), `createMany ... skipDuplicates` | Baixo | — |
| Raiz e `scripts/` | Credenciais fixas, scripts mortos | P-09, código morto | Apagar mortos; scripts que ficam geram senha aleatória e recusam rodar contra produção sem flag explícita | Baixo | Verificação em produção (T-04) |

---

## 7. O que deve ser reescrito

Não recomendo reescrever o Solentis. Recomendo **três reescritas pequenas e delimitadas**, onde refatorar custa mais do que refazer.

### 7.1 Sincronização offline (`sync-manager.tsx` + trecho offline do `reading-form.tsx`)
- **Por que não refatorar:** o código atual não tem nada a aproveitar além da ideia. Contrato errado, fila em `localStorage` sem ID, apaga tudo no fim, `alert()` como feedback, e o formulário nem abre offline porque as rotas do operador são `NetworkOnly`.
- **Por que reescrever:** ~100 linhas novas com desenho correto custam menos do que remendar e continuar sem garantia.
- **Escopo:** fila em IndexedDB; cada item com `client_id` (UUID gerado no aparelho) usado como chave de idempotência no servidor (`readings.client_id` com unique por tenant); envio item a item usando o **mesmo schema** da action; remover só o que o servidor confirmou; tela "pendentes de envio" para o operador; decidir quais telas precisam funcionar offline e cachear só o shell delas (sem dados).
- **Riscos:** duplicar leituras se a idempotência falhar; dados antigos na fila de quem já usa a versão atual (a fila atual está sempre vazia na prática, porque ela é apagada).
- **Migração:** **antes da reescrita, desligar o modo offline** (o formulário avisa "sem conexão, tente de novo") para parar a perda de dados imediatamente. Depois publicar a versão nova.

### 7.2 Camada de dados do dashboard do gestor (`gestor/dashboard/page.tsx`, linhas ~37–330)
- **Por que não refatorar:** cada métrica é montada carregando linhas brutas de 3 tabelas e somando em JS. Colocar `take` em tudo quebra os números; o problema é o formato das consultas.
- **Escopo:** substituir por ~6 consultas agregadas (contagens por período já existem em SQL e ficam; série diária via `GROUP BY date_trunc('day', ...)`; top N de ocorrências abertas com `take` + contagem total; consumo químico via `groupBy`). Os componentes visuais (`components/*-block.tsx`, `dashboard-client.tsx`) continuam recebendo os mesmos formatos de dados.
- **Riscos:** números diferentes dos atuais. Mitigação: comparar as duas versões lado a lado no staging com a base de 1 M linhas antes de trocar.
- **Migração:** nova função `getDashboardData(ctx, filtros)` atrás de flag; ligar quando os números baterem.

### 7.3 Histórico de migrations (baseline)
- **Por que não "consertar" as 4 migrations:** elas não correspondem a nenhum estado real do banco.
- **Escopo:** `prisma migrate diff --from-empty --to-url <produção>` gera o SQL do banco real; vira `0000_baseline`; marcado como aplicado em produção com `prisma migrate resolve --applied`. As 4 migrations antigas e `prisma/sql/*.sql` vão para `prisma/legacy/` (histórico).
- **Riscos:** baseline gerado do banco errado (local em vez de produção). Mitigação: conferir host antes, gerar a partir de um dump restaurado no staging.

---

## 8. Arquitetura futura

```
                   ┌───────────────────────────────────────────────┐
 Navegador / PWA   │ Server Components (leitura)  Client Components │
 (operador, gestor)│ Forms → Server Actions        IndexedDB (fila) │
                   └──────────────┬───────────────────────┬────────┘
                                  │                       │ client upload direto
                         proxy.ts (sessão, rota×papel)    ▼
                                  │                Vercel Blob privado
                   ┌──────────────▼────────────────┐  tenants/{id}/...
                   │ Camada de entrada (actions /   │
                   │ route handlers) — fina:        │
                   │  ctx = await requireRole([...])│
                   │  input = Schema.parse(form)    │
                   │  return service(ctx, input)    │
                   └──────────────┬────────────────┘
                   ┌──────────────▼────────────────┐
                   │ Domínio  src/server/<módulo>/  │  leituras, análises, ocorrências,
                   │  service.ts  schema.ts         │  turnos, estoque, equipamentos,
                   │  queries.ts (read models)      │  usuários, plantas
                   └──────────────┬────────────────┘
                   ┌──────────────▼────────────────┐
                   │ Acesso a dados                 │
                   │  db(ctx) = prisma escopado     │──► Postgres (Supabase)
                   │  assertOwned()  logAudit()     │    tenant_id + FK composta
                   └───────────────────────────────┘    agregados diários, RLS deny
   Jobs: Vercel Cron → fan-out por tenant (fila quando > ~200 plantas)
   Observabilidade: Pino → log drain; Sentry (erros + traces); health + heartbeat do cron
```

| Camada | Decisão |
|---|---|
| **Frontend** | Server Components para leitura; Client Components só onde há interação (formulários, gráficos, kanban). Componentes de página compartilhados entre papéis (`components/equipamentos/EquipmentDetail`) com o papel como prop, em vez de pastas copiadas. |
| **Backend** | Actions e route handlers finos: autenticar → validar → chamar serviço → tratar erro. Nenhuma regra de negócio na action. |
| **Domínio** | `src/server/<módulo>/service.ts` com funções que recebem `ctx` explícito. Schemas Zod em `schema.ts` importados pelo formulário, pela fila offline, pela action e pelos testes. |
| **Serviços externos** | `email`, `storage`, `push`, `ai` atrás de módulos próprios (já existem quase todos); nenhum arquivo `'use server'` expõe função interna. |
| **Banco** | Postgres único com `tenant_id` em tudo; FK composta `(tenant_id, id)` nas relações críticas; `CHECK` nos campos de status; tabela de agregados diários para dashboard; RLS "deny all" para `anon`/`authenticated` desde já (o Prisma usa o dono e não é afetado). |
| **Autenticação** | NextAuth v5 JWT com revalidação a cada 60 s no servidor e `session_version`. Rate limit por IP+e-mail. |
| **Autorização** | Matriz `PERMISSIONS` única (`src/server/auth/permissions.ts`); proxy usa a mesma matriz para rotas; actions usam `requireRole`. |
| **Storage** | Blob privado, chave `tenants/{tenantId}/{módulo}/{uuid}.{ext}`, leitura sempre por rota autenticada, upload grande direto do navegador. |
| **Jobs** | Cron diário que só enfileira; processamento por tenant e idempotente. Até ~200 plantas o próprio cron dá conta com consultas em lote. |
| **Cache** | `unstable_cache` / `use cache` com tag `tenant:{id}:dashboard` e `revalidateTag` nas actions que gravam medição/ocorrência. Nunca cachear algo sem `tenantId` na chave. |
| **Observabilidade** | Logs JSON com `requestId`, `tenantId`, `userId`, `action`, `durationMs`; Sentry para erros e traces; health check; heartbeat do cron; alertas. |
| **Deployment** | GitHub → CI → preview por PR (banco de staging) → produção com `migrate deploy` antes do deploy; Vercel Pro; Supabase Pro com PITR. |

---

## 9. Escalabilidade

| Escala | O que acontece hoje | O que precisa existir |
|---|---|---|
| **10 clientes** | Funciona, se P0 estiver resolvido. Dashboard de planta com meses de histórico já fica lento. | Vercel Pro (Hobby proíbe uso comercial), Supabase Pro com PITR, `connection_limit=1` na Vercel, dashboard agregado, Sentry, backup testado. |
| **100 clientes** | Suporte sem observabilidade; deploy direto para todos; cron em série. | Staging + preview, testes de integração no CI, cron em lote, rate limit, export paginado, alertas. |
| **1.000 clientes** | Cron estoura tempo; isolamento por convenção vira questão de probabilidade; busca varre tabelas grandes. | Prisma escopado por tenant + FK composta, fila de jobs, `pg_trgm`, agregados diários mantidos por job, tamanho de instância do banco revisto, retenção de arquivos no Blob. |
| **10.000 clientes** | Tabelas de medição com centenas de milhões de linhas. | Particionamento de `readings`/`analyses` por mês, réplica de leitura para dashboards/relatórios, arquivamento de dados frios, possivelmente separar clientes grandes em banco próprio. |

Volume por tipo de dado:

- **Leituras/análises:** decisão agora = índices `(tenant_id, collection_point_id, parameter_id, recorded_at)`, agregados diários e nenhuma consulta de usuário sem período. Particionar só quando passar de ~50 M linhas.
- **Documentos (fotos, laudos, manuais):** decisão agora = prefixo por tenant e Blob privado. Mudar depois exige migrar todos os arquivos.
- **Usuários:** escala bem; decisão agora = e-mail único global no banco (ou trocar o login para "e-mail + planta", decisão de produto).
- **Relatórios/PDF:** gerar por período limitado; acima de alguns milhares de linhas, gerar em job e entregar por link.
- **Dashboards:** ler só de agregados; cache com tag por tenant.

**Decisões que precisam ser tomadas agora** (mudar depois custa muito mais):
1. Baseline de migrations e fim do `db push`.
2. Chave de Blob com tenant e Blob privado.
3. `client_id` (idempotência) nas medições, junto com a reescrita do offline.
4. Regra de que toda referência recebida do cliente prova posse, com helper e guardião.
5. Contexto de requisição único (`ctx`) como assinatura dos serviços novos.
6. Unicidade de e-mail: global no banco ou login por planta.

---

## 10. Plano de hardening de segurança

| Prioridade | Item | Área |
|---|---|---|
| **P0** | Atualizar Next e transitivos (P-04) | Dependências |
| **P0** | Revalidar sessão no servidor + `session_version` + timeout por papel (P-02, P-03) | Autenticação |
| **P0** | `assertOwned` em todas as FKs vindas do cliente (P-05, N-02) | Isolamento |
| **P0** | Verificar em produção: contas seed/SUPER_ADMIN com senha padrão, unique de e-mail, índices de turno, RLS (P-09, P-07) | Secrets / dados |
| **P0** | Mensagem genérica no login (P-13) | Logs/erros |
| **P1** | Rate limit por IP+e-mail no login e no reset; atraso progressivo em vez de bloqueio duro; mesma mensagem para tudo (P-10, P-12) | Rate limiting |
| **P1** | Senha atual obrigatória na troca; reset e troca incrementam `session_version` (P-11) | Autenticação |
| **P1** | Service worker sem cache de RSC autenticado; limpeza no logout (P-08) | Dados no aparelho |
| **P1** | `toUserError()` + mensagens pt-BR; nunca devolver `e.message` (RC-9, V-13) | Erros |
| **P1** | RLS deny-all para `anon`/`authenticated` (`enable_rls.sql` já existe — só aplicar e conferir) | Banco |
| **P1** | Rotacionar segredos que já passaram por máquinas/IA: `NEXTAUTH_SECRET`, `CRON_SECRET`, chave do Gemini, VAPID, token do Blob, senha do banco; revogar o token do GitHub que esteve no `git remote` | Secrets |
| **P1** | `docs/recovery-codes.txt` fora do repositório (e entrada no `.gitignore`) | Secrets |
| **P2** | Matriz de permissões única + guard único (N-03) | RBAC |
| **P2** | Blob privado + prefixo por tenant + URL nunca no cliente (P-18) | Uploads |
| **P2** | Limites de tamanho em todos os campos de texto (B-09); limites de upload coerentes (P-17) | Entrada |
| **P2** | Separar `push-service` de `push-actions` (V-11); escapar HTML do convite (V-12) | APIs |
| **P2** | `assertRole` também em `obterDetalhesPonto` e qualquer action de leitura (V-14) | Defesa em profundidade |
| **P2** | Guardião estendido; teste automático "cada action × cada papel" gerado a partir do manifesto | Isolamento / RBAC |
| **P2** | CSP de `Report-Only` para `Content-Security-Policy` depois de 2 semanas sem violação | Headers |
| **P2** | `logAudit` em login, logout, troca/reset de senha, desativação, ações do super admin | Auditoria |
| **P2** | Remover e-mail em texto do log de rate limit (PII) | Logs |
| **P3** | FK composta `(tenant_id, id)` no banco; RLS com `FORCE` + `SET LOCAL app.tenant_id` | Isolamento |
| **P3** | 2FA para gestor e super admin | Autenticação |
| **P3** | Política de retenção/exclusão por tenant (LGPD) | Dados |

---

## 11. Plano de performance

**Frontend**
- Bundle: medir com `@next/bundle-analyzer` antes de mexer. Suspeitos: Recharts, `@react-pdf/renderer` (precisa estar só no servidor ou em import dinâmico), `cmdk`.
- Rendering: o dashboard deixa de enviar listas completas ao cliente (top 20 + contagem).
- Server vs Client Components: 124 `'use client'`. Não é para reduzir por meta; revisar só páginas com payload grande (dashboard, escala, importação).
- Requests: parar de usar server action para leitura disparada no carregamento da página (vi POSTs em `/tecnico/analises`); usar dados do Server Component ou route handler `GET`.
- Tabelas: toda listagem com paginação no servidor (padrão de `/gestor/ocorrencias`).
- Fontes: 3 famílias Google no layout raiz; reduzir pesos.

**Backend**
- Dashboard agregado (seção 7.2).
- `ctx` com `userId` vindo da sessão: elimina as 35 consultas `resolveUserId(email)` (uma por action).
- Export com período obrigatório e streaming.
- Cron em lote.
- IA de laudos: remover modelos descontinuados da lista, `maxDuration` explícito, timeout por tentativa.

**Banco**
- Índices novos (lista na seção 12).
- Toda consulta de tela com `take` e período.
- Agregados diários quando o volume passar de ~5 M medições por planta.
- `pg_trgm` para busca.

**Infra**
- Vercel Pro; `connection_limit=1&pool_timeout=20` na `DATABASE_URL` de produção; `DIRECT_URL` só para migrations.
- Cache por tenant com tag no dashboard e relatórios.
- Medir cold start e duração por rota com Sentry/Vercel Speed Insights antes de otimizar o resto.

**Meta de aceitação:** dashboard do gestor < 1,5 s e < 500 KB com 1 M leituras e 20 k ocorrências abertas no staging (hoje: 14,7 s e 47 MB).

---

## 12. Banco

**Migrations**
1. Baseline a partir do banco de produção (seção 7.3).
2. Todo ajuste a seguir em migrations versionadas, aplicadas por `prisma migrate deploy` no pipeline. Fim do `db push` e do SQL Editor para schema.
3. SQL que o Prisma não expressa (índices parciais, `CHECK`, FK composta, trigram) entra como migration `--create-only` editada à mão.

**Mudanças de schema**
- `users.session_version INT NOT NULL DEFAULT 0` (RC-2).
- `readings.client_id TEXT NULL` + unique `(tenant_id, client_id)` (idempotência do offline).
- Decidir e aplicar: unique global em `users.email` no banco.
- Remover a tabela `sessions` (não usada com JWT) depois de confirmar que está vazia.
- Unificar `users.deleted_at` e `is_active` (manter só um conceito).

**Constraints**
- `CHECK` para status/severidade/papel/prioridade/matriz (hoje são `String` livres).
- `CHECK (quantity > 0)` em entradas/saídas de estoque.
- FK composta `(tenant_id, X_id) → X(tenant_id, id)` nas relações críticas (pontos, parâmetros, equipamentos, produtos, usuários responsáveis). **PRECISA INVESTIGAÇÃO** antes: confirmar que o `prisma migrate` não tenta remover constraints que não estão no schema. Se tentar, fica só no `assertOwned` da aplicação e no RLS futuro.

**Índices necessários**
- `occurrences (tenant_id, status, created_at DESC)`
- `occurrence_comments (occurrence_id)`
- `shift_handovers (shift_instance_id)`
- `maintenance_logs (corrective_maintenance_id)` e demais FKs sem índice
- `readings (tenant_id, collection_point_id, parameter_id, recorded_at)`
- `analyses (tenant_id, collection_point_id, collected_at)`
- `chemical_stock_counts (tenant_id, product_id, counted_at)` (confirmar)
- `pg_trgm` GIN em `equipment.name`, `collection_points.name`, `occurrences.description`
- Conferir em produção se `add_indexes.sql` e os índices parciais de turno estão aplicados.

**Relacionamentos**
- Manter `onDelete: Cascade` só em dependentes verdadeiros (fotos, comentários, logs). Medições nunca em cascata (já está assim).
- SUPER_ADMIN num tenant de sistema próprio, fora das plantas.

**Crescimento**
- Agregados diários (`daily_measurement_stats` por tenant/ponto/parâmetro/dia: contagem, não conformes, min, max, média), mantidos por job ou atualizados na gravação.
- Particionamento mensal de `readings` e `analyses` quando passar de ~50 M linhas.
- Política de retenção para `login_attempts` e `audit_logs` operacionais (os de negócio CONAMA ficam).

---

## 13. Testes

**Infraestrutura (pré-requisito):** Postgres em container no CI criado a partir das migrations (depende do baseline); helper que cria tenant/usuários/fixtures e chama as actions diretamente com `auth()` mockado (`vi.mock('@/lib/auth')`). É o mesmo método usado na Passada 1, só que versionado.

### P0 — destruir dados ou comprometer segurança
| Tipo | Teste |
|---|---|
| Integração | Fila offline: o item salvo pelo formulário passa no schema da action; reenvio do mesmo `client_id` não duplica; item rejeitado continua na fila |
| Integração | Para cada action com FK: ID de outro tenant → erro, nada gravado (análise, ocorrência, cronograma, equipamento, estoque entrada/contagem) |
| Integração | Sessão: usuário desativado / papel alterado / planta desativada → próxima requisição após 60 s é negada |
| Integração | Matriz action × papel gerada do manifesto: cada action chamada por cada papel tem o resultado esperado |
| Integração | Reset e troca de senha invalidam outras sessões; troca exige senha atual |
| Integração | Saída de estoque concorrente (2 promessas em paralelo) não deixa saldo negativo |
| Estático | Guardião de isolamento estendido |
| Unit | `numberPtBR`, `toUserError`, timeout por papel |

### P1 — fluxos essenciais
| Tipo | Teste |
|---|---|
| E2E (Playwright, celular) | Login → abrir turno → leitura (com vírgula) → ocorrência com foto → passagem de turno → confirmação pelo próximo operador |
| E2E | Gestor: dashboard carrega, filtros, export CSV, criar usuário, desativar usuário |
| E2E | Técnico: análise, aprovar análise, importação de laudo (IA mockada) |
| Integração | Cron de turnos idempotente (rodar 2 vezes = mesmo resultado) |
| Integração | Busca encontra maiúsculas/acentos |

### P2 — secundários
Estoque, equipamentos/manutenção, relatórios PDF, notificações, super admin, templates de tarefa.

### Carga
k6 (scripts já existem em `scripts/load/`) no staging com 1 M leituras e 20 k ocorrências: dashboard, listagens, gravação de leituras concorrentes (50 → 200 usuários). Rodar antes de cada marco de clientes (10, 100).

**Metas:** P0 100% antes de liberar clientes; cobertura medida (sem meta percentual) só nos módulos `src/server/*`.

---

## 14. CI/CD

```
push / PR
  ↓
install (npm ci, cache)
  ↓
lint (eslint — falha em erro)            ← FALTA (197 erros hoje; zerar antes de ligar)
  ↓
typecheck (tsc --noEmit)                 ← existe
  ↓
unit (vitest)                            ← existe
  ↓
integração (vitest + Postgres service)   ← FALTA (depende do baseline)
  ↓
build (next build)                       ← FALTA
  ↓
segurança: npm audit --omit=dev,         ← existe só o audit (hoje VERMELHO)
           gitleaks, dependency-review
  ↓
preview Vercel por PR + banco de staging ← FALTA staging
  ↓
E2E Playwright contra o preview          ← FALTA (specs existem, fora do CI)
  ↓
merge na main (branch protegida, checks obrigatórios)  ← FALTA proteção
  ↓
prisma migrate deploy (produção)         ← FALTA
  ↓
deploy produção + smoke test + Sentry release ← FALTA
```

Também falta: Dependabot com auto-merge para patch de segurança; os 12 branches de Dependabot parados precisam ser resolvidos ou fechados; política de não commitar direto na `main` (houve commit pela interface web).

---

## 15. Observabilidade

**Mínimo para operar profissionalmente** (tudo P1, exceto onde indicado):

| Item | O que fazer |
|---|---|
| **Erros** | Sentry (`@sentry/nextjs`) em servidor e cliente, com `tenantId`/`userId`/`role` como tags e release por commit. Substitui o `/api/logs` como canal principal. |
| **Logs** | Manter Pino; adicionar `durationMs` e `tenantId` em todas as actions via wrapper; log drain da Vercel para um serviço com retenção de 30+ dias (Axiom, Better Stack ou similar). |
| **Métricas** | Duração p50/p95 por rota/action, erros por rota, consultas lentas (Prisma `$extends` medindo duração e logando acima de 500 ms). Vercel Speed Insights para o frontend. |
| **Tracing** | Traces do Sentry (amostragem 10–20%) — suficiente para responder "o que estava lento às 14:32". (P2 para tracing completo de queries.) |
| **Alertas** | Taxa de erro > X% em 5 min; cron de turnos não executou até 00:30 (heartbeat); `/api/health` (novo: app + banco + Blob) fora do ar; falhas de e-mail do Resend; uso de conexões do Supabase. |
| **Auditoria** | `logAudit` existente + eventos de segurança (P2): login ok/falha, troca/reset de senha, desativações, ações do super admin, exportações. |

Com isso, a pergunta da Passada 1 passa a ter resposta: o Sentry mostra as transações lentas daquele horário, o trace mostra a consulta, o log com `requestId` mostra o tenant e o usuário.

---

## 16. Roadmap

### FASE 0 — Bloqueadores (antes de qualquer cliente pagante) · ~1 semana
- T-01 Desligar o modo offline (estancar perda de dados)
- T-02 Atualizar Next/transitivos e deixar o CI verde
- T-03 Mensagem genérica no login
- T-04 Verificação de produção (contas padrão, unique de e-mail, índices, RLS, backups)
- T-05 `assertOwned` em todas as FKs do cliente
- T-06 Revalidação de sessão + `session_version` + timeout por papel
- T-07 Planos pagos (Vercel Pro, Supabase Pro com PITR) e teste de restore
- T-08 Rotação de segredos e `recovery-codes.txt` fora do repo

### FASE 1 — Segurança e integridade · ~1 semana
- T-09 Baseline de migrations + banco de staging
- T-10 Rate limit e redesenho do lockout; reset limitado
- T-11 Troca de senha com senha atual; reset/troca invalidam sessões
- T-12 Service worker sem cache autenticado
- T-13 Estoque: transação com lock (N-01)
- T-14 RLS deny-all aplicado e conferido

### FASE 2 — Bugs e estabilidade · ~1 semana
- T-15 Reescrita do offline (IndexedDB + idempotência)
- T-16 Vírgula decimal + mensagens Zod/erros em pt-BR
- T-17 Busca (case/acentos, links por papel)
- T-18 Leitura sem turno próprio; cronograma com Zod; B-05/B-12 (botão escondido, voltar duplo)

### FASE 3 — Banco e backend · ~1–2 semanas
- T-19 Índices e `CHECK` constraints (via migrations)
- T-20 Guard único + matriz de permissões + `ctx` com `userId`
- T-21 Separar `push-service`; escapar HTML do convite; limites de tamanho de texto
- T-22 Export paginado; cron em lote

### FASE 4 — Performance · ~1 semana
- T-23 Camada de dados do dashboard (agregada) + cache por tenant
- T-24 Upload direto para o Blob (manual, laudo IA)

### FASE 5 — Arquitetura · contínuo, módulo a módulo
- T-25 `src/server/<módulo>` com `service.ts`/`schema.ts` (começar por leituras, estoque, ocorrências)
- T-26 Blob privado com prefixo por tenant + migração dos arquivos
- T-27 Componentes compartilhados gestor/técnico (equipamentos, ocorrência)

### FASE 6 — Testes · começa junto com a Fase 1 e acompanha tudo
- T-28 Harness de integração + testes P0
- T-29 E2E P1 no CI contra preview

### FASE 7 — Observabilidade · ~3 dias
- T-30 Sentry, log drain, health check, heartbeat do cron, alertas

### FASE 8 — UX/UI · ~1 semana
- T-31 Revisão do fluxo do operador em celular real; acessibilidade WCAG AA nas telas do operador; rótulos dos sinos; empty states e mensagens

### FASE 9 — Escalabilidade · quando o número de clientes exigir
- T-32 Agregados diários, `pg_trgm`, fila de jobs, particionamento, réplica de leitura, upgrade do Prisma

> As Fases 0–2 são o caminho até "pronto para clientes pagantes". Estimativa total: **3 a 4 semanas** de trabalho focado. Fase 6 (testes) não é uma etapa final: cada tarefa das Fases 0–4 só termina com o teste correspondente.

---

## 17. Matriz de risco

Impacto e probabilidade de 1 (baixo) a 5 (alto). Esforço: S/M/L/XL.

| ID | Problema | Impacto | Probabilidade | Esforço | Prioridade |
|---|---|---|---|---|---|
| P-01 | Perda de leituras offline | 5 | 5 (sempre que offline) | S para desligar, L para reescrever | **P0** |
| P-05/N-02 | Escrita cross-tenant por FK | 5 | 2 (exige ID de outra planta) | M | **P0** |
| P-02/P-03 | Sessão irrevogável | 4 | 4 (rotatividade de operadores) | M | **P0** |
| P-09 | Credenciais padrão em produção | 5 | ? (**investigar**) | S | **P0** |
| P-04 | Next com CVEs / CI vermelho | 4 | 2 em produção, 5 no CI | S–M | **P0** |
| RC-7 | Planos gratuitos, sem backup testado | 5 | 3 | S (custo) | **P0** |
| P-13 | Erro interno na tela de login | 2 | 3 | S | **P0** |
| P-07 | Banco não reproduzível | 4 | 5 (já é realidade) | M | **P1** |
| P-06 | Dashboard não escala | 4 | 4 com meses de uso | L | **P1** |
| P-10 | Lockout como DoS | 3 | 3 | M | **P1** |
| P-11 | Troca de senha sem senha atual | 3 | 3 (tablet compartilhado) | S | **P1** |
| P-12 | Reset sem limite | 3 | 2 | S | **P1** |
| P-08 | Cache SW autenticado | 3 | 2 | S | **P1** |
| N-01 | Estoque negativo por corrida | 3 | 2 | S | **P1** |
| P-14 | Busca quebrada | 2 | 5 | S | **P1** |
| P-15 | Vírgula decimal | 3 | 4 | S | **P1** |
| P-16 | Leitura no turno errado | 3 | 3 | S | **P1** |
| P-19 | Testes não cobrem o produto | 4 | 5 | L | **P1** |
| P-20 | Sem observabilidade | 4 | 5 | M | **P1** |
| B-05 | Botão "Registrar leitura" escondido no celular | 3 | 5 | S | **P1** |
| P-17 | Upload > 4,5 MB falha | 3 | 3 (**investigar**) | M | **P2** |
| P-18 | Blob público | 3 | 2 | M | **P2** |
| N-03 | Guards divergentes | 3 | 2 | M | **P2** |
| V-11 | Push sem auth | 2 | 1 | S | **P2** |
| V-12 | HTML no convite | 2 | 1 | S | **P2** |
| B-06..B-11 | Bugs menores | 2 | 3 | S cada | **P2** |
| RC-12 | Duplicação gestor/técnico | 2 | 4 (divergência) | L | **P3** |
| — | Particionamento / réplica | 3 | 1 hoje | XL | **P3** |

---

## 18. Plano de implementação

Cada tarefa vira um PR próprio, pequeno, com o teste correspondente. Nenhuma tarefa mistura correção com refatoração estética.

### T-01 — Desligar o modo offline das leituras
- **Objetivo:** parar a perda silenciosa de dados hoje, antes da reescrita.
- **Arquivos:** `src/components/sync-manager.tsx`, `src/app/operador/leituras/novo/reading-form.tsx`, layout que monta o `SyncManager`.
- **Dependências:** nenhuma.
- **Risco:** baixo. Operador sem sinal não consegue registrar (hoje ele "registra" e perde).
- **Estratégia:** sem conexão, o formulário mostra "Sem conexão — a leitura não foi enviada. Anote e tente novamente" e mantém o rascunho; `SyncManager` deixa de ser montado.
- **Sucesso:** nenhum caminho do código grava ou apaga `solentis_offline_leituras`.
- **Teste:** E2E com `context.setOffline(true)`: o envio é bloqueado com a mensagem e o rascunho continua no campo.
- **Rollback:** reverter o PR.

### T-02 — Atualizar Next.js e dependências com advisory; CI verde
- **Objetivo:** fechar P-04 e destravar o pipeline.
- **Arquivos:** `package.json`, `package-lock.json` (`next` 16.4.x ou a versão corrigida mais recente da linha 16, `eslint-config-next` alinhado, `sharp` e `undici` via override/transitivos).
- **Dependências:** nenhuma.
- **Risco:** médio (mudança de minor do Next pode alterar comportamento de cache/actions).
- **Estratégia:** branch própria; rodar tsc, vitest, build e o roteiro manual curto (login de cada papel, leitura, ocorrência, dashboard) no preview.
- **Sucesso:** `npm audit --omit=dev --audit-level=high` = 0; CI verde; preview funcional.
- **Teste:** CI + smoke manual no preview.
- **Rollback:** promover o deploy anterior na Vercel; reverter o lockfile.

### T-03 — Mensagem genérica no login
- **Objetivo:** P-13.
- **Arquivos:** `src/app/(auth)/login/actions.ts` (linhas 147–153), `src/lib/auth.ts` (envolver `findUnique` em try/catch com log).
- **Dependências:** nenhuma.
- **Risco:** baixo.
- **Estratégia:** só `RATE_LIMITED` tem mensagem própria; todo o resto vira "Não foi possível entrar agora. Tente novamente." e vai para o log com `requestId`.
- **Sucesso:** com banco parado, a tela não mostra nada técnico.
- **Teste:** integração com Prisma mockado lançando erro.
- **Rollback:** reverter o PR.

### T-04 — Verificação de produção (somente leitura)
- **Objetivo:** fechar as dúvidas de P-09, P-07 e infraestrutura.
- **Arquivos:** nenhum (consultas no Supabase SQL Editor e no painel da Vercel, feitas por você ou comigo com sua autorização).
- **Dependências:** nenhuma.
- **Risco:** nenhum, se for só `SELECT`.
- **Estratégia:** conferir: existem `super@solentis.local`, `admin@solentis.local`, `tecnico@`, `operador@`, `manutencao@` e há quanto tempo a senha não muda; índice unique de `users.email`; `uniq_shift_instance_ativa`, `uniq_turno_ativo_por_operador`, índices de `add_indexes.sql`; `rowsecurity` nas tabelas; plano Vercel e Supabase; PITR ligado; variáveis de ambiente (`connection_limit`, `CRON_SECRET`, Resend, Blob, VAPID).
- **Sucesso:** checklist preenchido; contas padrão desativadas ou com senha trocada.
- **Teste:** —
- **Rollback:** —

### T-05 — Prova de posse para toda referência recebida do cliente
- **Objetivo:** fechar P-05 e N-02.
- **Arquivos:** novo `src/lib/ownership.ts` (`assertOwned`); `src/app/tecnico/analises/actions.ts` (`collection_point_id`), `src/app/operador/ocorrencias/actions.ts` (`collection_point_id`, usada pelos 3 papéis), `src/app/gestor/(sistema)/cronograma/novo/actions.ts` (`collection_point_id`, `parameter_id`), `src/app/tecnico/equipamentos/actions.ts` (`category_id`, `responsible_id` em criar e editar), `src/app/gestor/produtos-quimicos/actions.ts` (`registrarEntrada.product_id`), `src/app/operador/estoque/actions.ts` (`registrarSaida` e `registrarContagem.product_id`); `tenant-isolation.test.ts` (nova regra).
- **Dependências:** nenhuma (o harness da T-28 melhora a cobertura, mas não bloqueia).
- **Risco:** baixo por ponto. Um ponto esquecido mantém a falha — por isso a regra no guardião.
- **Estratégia:** validar antes de abrir a transação; mensagem "não encontrado". Guardião passa a falhar quando um `formData.get('<x>_id')` chega ao `create/update` sem `assertOwned`.
- **Sucesso:** os cenários [7] e [8] da Passada 1 retornam erro e nada é gravado.
- **Teste:** integração por action com ID de outro tenant.
- **Rollback:** reverter o PR (sem migration).

### T-06 — Revalidação de sessão no servidor
- **Objetivo:** fechar P-02 e P-03.
- **Arquivos:** `prisma/schema.prisma` (`users.session_version`), `src/lib/auth.ts` (callback `jwt` com releitura a cada 60 s), `src/lib/auth.config.ts` (proxy continua sem banco), `src/lib/auth-utils.ts` (timeout por papel via `iat`), `src/app/gestor/(sistema)/usuarios/actions.ts` e `src/app/admin/plantas/actions.ts` (incrementar `session_version` ao desativar, trocar papel, resetar senha, desativar planta).
- **Dependências:** coluna nova. Se o baseline (T-09) ainda não existir, aplicar como SQL aditivo documentado e incorporar ao baseline depois.
- **Risco:** médio — erro aqui desloga todo mundo ou não desloga ninguém.
- **Estratégia:** token guarda `sv` e `checkedAt`; a cada 60 s relê usuário + planta; divergência → sessão nula → login. Intervalo configurável por env.
- **Sucesso:** cenários [1], [2] e [3] da Passada 1 negados após no máximo 60 s; operador expira após 30 min de inatividade.
- **Teste:** integração simulando o relógio; E2E de desativação.
- **Rollback:** env com intervalo infinito desliga a checagem sem novo deploy de código.

### T-07 — Infraestrutura mínima para cliente pagante
- **Objetivo:** fechar RC-7.
- **Arquivos:** nenhum no código (`.env.example` documenta `connection_limit`).
- **Dependências:** T-04.
- **Risco:** custo mensal.
- **Estratégia:** Vercel Pro, Supabase Pro com PITR; `connection_limit=1&pool_timeout=20` na `DATABASE_URL` de produção; restaurar um backup num projeto separado e abrir o app apontando para ele.
- **Sucesso:** restore testado e documentado com data.
- **Teste:** o próprio restore.
- **Rollback:** —

### T-08 — Rotação de segredos
- **Objetivo:** reduzir exposição acumulada (segredos passaram por máquina local, agentes de IA e conversas).
- **Arquivos:** `.gitignore` (`docs/recovery-codes.txt`); envs na Vercel.
- **Dependências:** T-06 (trocar `NEXTAUTH_SECRET` desloga todos — fazer junto).
- **Risco:** baixo; todos precisam logar de novo.
- **Estratégia:** trocar `NEXTAUTH_SECRET`, `CRON_SECRET`, chave do Gemini, VAPID (exige re-inscrição de push), token do Blob, senha do banco; revogar o token do GitHub antigo; mover `recovery-codes.txt` para um gerenciador de senhas.
- **Sucesso:** segredos antigos não funcionam mais.
- **Teste:** smoke em produção.
- **Rollback:** —

### T-09 — Baseline de migrations e banco de staging
- **Objetivo:** fechar P-07 / RC-3.
- **Arquivos:** `prisma/migrations/0000_baseline/`, `prisma/legacy/` (migrations e SQL antigos), `package.json` (scripts `db:migrate`), `.github/workflows/ci.yml`.
- **Dependências:** T-04 (confirmar banco de origem), T-07 (projeto de staging).
- **Risco:** médio — gerar do banco errado. Nunca rodar `migrate dev`/`reset` contra produção.
- **Estratégia:** dump de produção → restaurar no staging → `migrate diff --from-empty --to-url <staging>` → baseline → `migrate resolve --applied` em produção e staging → conferir `migrate diff` vazio contra o `schema.prisma`.
- **Sucesso:** um banco vazio criado só com `migrate deploy` é idêntico ao de produção.
- **Teste:** CI cria banco do zero com `migrate deploy`.
- **Rollback:** remover a linha do baseline de `_prisma_migrations` (não altera tabelas).

### T-10 — Rate limit e novo lockout
- **Objetivo:** fechar P-10 e P-12.
- **Arquivos:** novo `src/lib/rate-limit.ts` (tabela `rate_limits` no Postgres ou Upstash/Vercel KV), `src/lib/auth.ts`, `src/app/(auth)/actions.ts`, `src/app/(auth)/login/actions.ts`.
- **Dependências:** T-09 se usar tabela nova.
- **Risco:** baixo.
- **Estratégia:** chaves por IP e por e-mail; atraso progressivo após 5 falhas em vez de bloqueio da senha correta; mesma mensagem para e-mail inexistente; reset limitado a 3/hora por e-mail e 10/hora por IP, envio de e-mail fora do caminho da resposta.
- **Sucesso:** cenário [12] da Passada 1 não tranca o dono; mensagens idênticas.
- **Teste:** integração.
- **Rollback:** flag desliga o limitador.

### T-11 — Troca de senha segura
- **Objetivo:** fechar P-11.
- **Arquivos:** `src/app/(auth)/trocar-senha/actions.ts` e `page.tsx`, `src/app/(auth)/actions.ts`.
- **Dependências:** T-06 (`session_version`).
- **Risco:** baixo.
- **Estratégia:** senha atual obrigatória quando `mustChangePassword` é falso; uma única política de senha (`passwordSchema`); incrementar `session_version`.
- **Sucesso:** cenário [15] da Passada 1 falha.
- **Teste:** integração.
- **Rollback:** reverter.

### T-12 — Service worker sem cache autenticado
- **Objetivo:** fechar P-08.
- **Arquivos:** `src/app/sw.ts`, `src/components/sign-out-button.tsx`/`sign-out-action.ts`.
- **Dependências:** nenhuma.
- **Risco:** baixo; navegação um pouco mais dependente de rede (já é, na prática).
- **Estratégia:** `NetworkOnly` para qualquer requisição same-origin com header `RSC` ou caminho em `/(operador|tecnico|gestor|admin|manutencao)`; logout chama `caches.keys()` → `caches.delete`.
- **Sucesso:** o teste de cache da Passada 1 não encontra rotas autenticadas.
- **Teste:** Playwright inspecionando `caches`.
- **Rollback:** reverter (SW novo substitui o antigo com `skipWaiting`).

### T-13 — Estoque sem corrida
- **Objetivo:** fechar N-01.
- **Arquivos:** `src/app/operador/estoque/actions.ts`, `src/lib/stock-queries.ts`.
- **Dependências:** nenhuma.
- **Risco:** baixo.
- **Estratégia:** `$transaction` com `SELECT id FROM chemical_products WHERE id=$1 AND tenant_id=$2 FOR UPDATE`, recalcular saldo e inserir dentro da transação.
- **Sucesso:** 20 saídas simultâneas nunca deixam saldo negativo.
- **Teste:** integração concorrente.
- **Rollback:** reverter.

### T-14 — RLS deny-all
- **Objetivo:** fechar a API do PostgREST do Supabase.
- **Arquivos:** migration a partir de `prisma/sql/enable_rls.sql`.
- **Dependências:** T-09.
- **Risco:** baixo (o Prisma conecta como dono; confirmar no staging).
- **Estratégia:** aplicar no staging, rodar E2E, aplicar em produção.
- **Sucesso:** `rowsecurity = true` em todas as tabelas; app funcionando.
- **Teste:** E2E no staging.
- **Rollback:** bloco de rollback que já está no arquivo.

### T-15 — Reescrita do offline
- **Objetivo:** P-01 definitivo (seção 7.1).
- **Arquivos:** `src/components/sync-manager.tsx` (novo), `src/lib/offline-queue.ts` (IndexedDB), `src/server/leituras/schema.ts`, `src/app/operador/leituras/actions.ts`, `schema.prisma` (`readings.client_id`), `src/app/sw.ts` (shell offline).
- **Dependências:** T-01, T-09, T-12.
- **Risco:** médio (duplicidade).
- **Estratégia:** seção 7.1.
- **Sucesso:** 10 leituras offline → reconexão → 10 gravadas, 0 duplicadas, fila vazia; item inválido permanece com erro visível.
- **Teste:** integração (idempotência) + E2E offline/online.
- **Rollback:** voltar para o comportamento da T-01.

### T-16 — Números com vírgula e mensagens em pt-BR
- **Objetivo:** P-15, RC-9.
- **Arquivos:** `src/lib/zod-helpers.ts` (`numberPtBR`), `src/lib/errors.ts` (`toUserError`), as 10 actions com `Number(...)` em preprocess, os 24 componentes com `type="number"` (`inputMode="decimal"`), `src/app/gestor/(sistema)/usuarios/actions.ts` (linha 187).
- **Dependências:** nenhuma.
- **Risco:** baixo.
- **Estratégia:** um helper, trocado arquivo por arquivo; mapa de erros do Zod em pt-BR configurado uma vez.
- **Sucesso:** "7,2" grava 7.2; nenhuma mensagem em inglês ou do Prisma chega à tela.
- **Teste:** unit do helper + E2E da leitura com vírgula.
- **Rollback:** reverter.

### T-17 — Busca
- **Objetivo:** P-14, B-08.
- **Arquivos:** `src/app/api/search/route.ts`, `src/components/ui/command-menu.tsx`.
- **Dependências:** nenhuma (trigram fica para T-19).
- **Risco:** baixo.
- **Estratégia:** `mode: 'insensitive'`; links montados conforme o papel; checagem de papel explícita.
- **Sucesso:** "Entrada" e "entrada" encontram "Entrada ETE".
- **Teste:** integração.
- **Rollback:** reverter.

### T-18 — Bugs de fluxo do operador e do cronograma
- **Objetivo:** P-16, B-05, B-06, B-07, B-11, B-12.
- **Arquivos:** `src/app/operador/leituras/actions.ts` (126–134), `reading-form.tsx` (espaço inferior para a barra fixa), página Nova leitura (voltar duplicado), `gestor/dashboard/page.tsx` (126–131), `gestor/(sistema)/cronograma/novo/actions.ts`, `operador/turnos/actions.ts` (`aplicarTimeouts`).
- **Dependências:** decisão sua sobre leitura sem turno (bloquear ou permitir sem vínculo).
- **Risco:** baixo.
- **Sucesso:** cada bug com teste que falhava antes e passa depois.
- **Teste:** integração/E2E por item.
- **Rollback:** reverter.

### T-19 — Índices e constraints
- **Objetivo:** seção 12.
- **Arquivos:** migrations novas.
- **Dependências:** T-09.
- **Risco:** médio (`CHECK` falha se houver dado inválido — rodar `SELECT` de validação antes; índices com `CREATE INDEX CONCURRENTLY`).
- **Sucesso:** `EXPLAIN` das consultas principais usa os índices; constraints criadas.
- **Teste:** CI aplica migrations do zero; staging com 1 M linhas.
- **Rollback:** migration inversa (`DROP INDEX`/`DROP CONSTRAINT`).

### T-20 — Guard único, matriz de permissões e `ctx`
- **Objetivo:** N-03, N-05, parte de RC-1.
- **Arquivos:** novo `src/server/auth/{guards,permissions}.ts`; os 21 guards locais; `src/lib/auth-utils.ts` (`ROUTE_ACCESS` passa a derivar da matriz); actions que usam `resolveUserId(email)`.
- **Dependências:** T-06; você aprovar a matriz (quem pode o quê).
- **Risco:** médio — permissões mudam de verdade onde hoje estão divergentes.
- **Estratégia:** escrever a matriz primeiro; teste "action × papel" gerado do manifesto antes da troca; substituir arquivo por arquivo.
- **Sucesso:** zero guards locais; teste da matriz verde.
- **Teste:** matriz automatizada.
- **Rollback:** por arquivo.

### T-21 — Higiene de segurança
- **Objetivo:** V-11, V-12, B-09, PII no log.
- **Arquivos:** `src/lib/push-actions.ts` → `push-service.ts`; `usuarios/actions.ts` e `admin/plantas/actions.ts` (escape de HTML); schemas com `.max()` em textos; `src/lib/auth.ts` (log sem e-mail).
- **Dependências:** nenhuma.
- **Risco:** baixo.
- **Sucesso:** nenhuma função interna em arquivo `'use server'`; descrição > limite rejeitada.
- **Teste:** unit/integração.
- **Rollback:** reverter.

### T-22 — Export e cron
- **Objetivo:** RC-4 fora do dashboard.
- **Arquivos:** `src/app/api/export/route.ts`, `src/app/api/cron/shifts/route.ts`.
- **Dependências:** nenhuma.
- **Risco:** baixo.
- **Estratégia:** período obrigatório e streaming no export; cron com consultas em lote e `createMany` com `skipDuplicates`.
- **Sucesso:** export de 50 k ocorrências sem pico de memória; cron com número constante de consultas por tenant.
- **Teste:** integração + carga.
- **Rollback:** reverter.

### T-23 — Dashboard agregado
- **Objetivo:** P-06 (seção 7.2).
- **Arquivos:** novo `src/server/dashboard/queries.ts` (substitui o `queries.ts` morto), `src/app/gestor/dashboard/page.tsx`.
- **Dependências:** T-19, staging com 1 M linhas.
- **Risco:** médio (números divergentes).
- **Estratégia:** comparar versão nova e antiga no staging; flag; cache com tag por tenant.
- **Sucesso:** < 1,5 s e < 500 KB no cenário da Passada 1, números iguais.
- **Teste:** comparação automatizada dos números + k6.
- **Rollback:** flag.

### T-24 — Upload direto para o Blob
- **Objetivo:** P-17.
- **Arquivos:** `src/lib/storage.ts`, `tecnico/equipamentos/*`, `gestor/(resultados)/laudos/importar/*` (ou `gestor/importacao` do WIP).
- **Dependências:** confirmar P-17 em preview; T-26 se já for privado.
- **Risco:** médio.
- **Sucesso:** PDF de 9 MB sobe e o laudo é processado.
- **Teste:** E2E no preview.
- **Rollback:** reverter.

### T-25 — Camada de domínio, módulo a módulo
- **Objetivo:** RC-1/RC-5 estrutural, sem big bang.
- **Arquivos:** `src/server/<módulo>/{service,schema,queries}.ts`; actions do módulo ficam finas.
- **Dependências:** T-20, T-28.
- **Risco:** baixo por módulo.
- **Estratégia:** só refatorar módulo que já vai ser mexido por outra tarefa (leituras na T-15, estoque na T-13, dashboard na T-23). Nada de migrar módulo parado.
- **Sucesso:** módulo migrado com testes de integração; action com menos de ~30 linhas.
- **Teste:** os do módulo.
- **Rollback:** por PR.

### T-26 — Blob privado com prefixo por tenant
- **Objetivo:** P-18.
- **Arquivos:** `src/lib/storage.ts`, rotas de foto, páginas de equipamento, script de migração dos arquivos existentes.
- **Dependências:** T-09.
- **Risco:** médio (arquivos antigos).
- **Estratégia:** novos uploads já no formato novo; script copia os antigos e atualiza o banco; leitura aceita os dois formatos durante a transição; depois apaga os públicos.
- **Sucesso:** nenhuma URL de Blob no HTML/RSC; URL antiga não abre mais.
- **Teste:** integração + verificação manual.
- **Rollback:** manter leitura compatível até o fim da migração.

### T-27 — Componentes compartilhados entre papéis
- **Objetivo:** RC-12.
- **Arquivos:** pares duplicados da Passada 1 (equipamentos `[id]`, `edit-form`, `status-button`, `corrective-form`, `occurrence-form`, escala, entrada/saída de estoque).
- **Dependências:** T-20.
- **Risco:** baixo/médio.
- **Estratégia:** extrair para `src/components/<módulo>/` com papel como prop; páginas de papel viram wrappers.
- **Sucesso:** ~2.000 linhas a menos; E2E de cada papel verde.
- **Rollback:** por par.

### T-28 — Harness de integração + testes P0
- **Objetivo:** RC-6.
- **Arquivos:** `vitest.integration.config.ts`, `src/test/{db,factories,auth-mock}.ts`, `.github/workflows/ci.yml` (serviço Postgres).
- **Dependências:** T-09.
- **Risco:** baixo.
- **Sucesso:** testes P0 da seção 13 rodando no CI.
- **Rollback:** —

### T-29 — CI completo + E2E
- **Objetivo:** seção 14.
- **Arquivos:** `.github/workflows/ci.yml`, `playwright.config.ts`, `tests/*`; correção dos 197 erros de lint (só os erros; avisos depois).
- **Dependências:** T-02, T-09, T-28; staging para preview.
- **Risco:** baixo.
- **Sucesso:** PR não mergeia sem lint, typecheck, unit, integração, build, audit e E2E verdes; `main` protegida.
- **Rollback:** —

### T-30 — Observabilidade
- **Objetivo:** seção 15.
- **Arquivos:** `@sentry/nextjs` (`sentry.*.config.ts`, `instrumentation.ts`), `src/app/api/health/route.ts`, wrapper de action com `durationMs`, heartbeat no cron.
- **Dependências:** nenhuma.
- **Risco:** baixo (cuidar para não enviar PII ao Sentry).
- **Sucesso:** erro forçado no preview aparece no Sentry com tenant; alerta de cron dispara quando o cron é desligado.
- **Rollback:** remover DSN.

### T-31 — UX/UI do operador
- **Objetivo:** seção 13 da Passada 1.
- **Arquivos:** telas do operador.
- **Dependências:** T-16, T-18.
- **Risco:** baixo.
- **Estratégia:** teste com operador real na estação; auditoria WCAG AA (contraste, alvos de toque, rótulos).
- **Sucesso:** operador completa turno inteiro sem ajuda.
- **Rollback:** —

### T-32 — Escala
- **Objetivo:** seção 9.
- **Dependências:** métricas de T-30 mostrando necessidade.
- **Estratégia:** agregados diários → `pg_trgm` → fila de jobs → particionamento → réplica, nessa ordem, cada um só quando os números pedirem.

---

## 19. Ordem exata

Se eu fosse responsável pelo Solentis, eu faria exatamente nesta ordem:

1. **T-01** — desligar o offline hoje. É uma mudança pequena que para a perda de dados enquanto o resto é feito.
2. **T-04** — olhar produção (contas padrão, unique de e-mail, índices, RLS, backups). Se a conta SUPER_ADMIN padrão existir, desativá-la vira o passo 1.
3. **T-02 + T-03** — Next atualizado, CI verde e login sem erro interno. Sem CI verde nenhuma das próximas mudanças tem rede de proteção.
4. **T-05** — prova de posse em todas as FKs. Fecha o único caminho de escrita entre plantas.
5. **T-06 + T-08** — revalidação de sessão e, no mesmo deploy, rotação de segredos (os dois deslogam todo mundo uma vez só).
6. **T-07 + T-09** — planos pagos, PITR, restore testado, baseline de migrations e staging. A partir daqui, toda mudança de banco passa por migration e por staging.
7. **T-28** — harness de integração com os testes P0. A partir daqui, toda tarefa nova entra com teste de verdade.
8. **T-10, T-11, T-12, T-13, T-14** — rate limit, troca de senha, service worker, estoque, RLS. Pequenas, independentes, uma por PR.
9. **T-15, T-16, T-17, T-18 + T-30** — offline reescrito, vírgula/mensagens, busca, bugs do operador e Sentry/alertas. Aqui o produto fica pronto para clientes pagantes.
10. **T-19 → T-23 → T-29** — índices/constraints, dashboard agregado e CI completo com E2E. Depois disso, T-20/T-25/T-26/T-27 entram aos poucos, sempre junto de uma mudança de produto no mesmo módulo.

---

## 20. Decisão final

### O Solentis está pronto para produção?
**NÃO — para clientes pagantes. COM RESSALVAS — para o piloto acompanhado que já existe.**

O piloto pode continuar porque há supervisão direta, um único cliente e você por perto para corrigir dados. Para clientes pagantes, não: hoje o sistema perde leituras feitas sem internet, não consegue tirar o acesso de quem foi desligado, permite que uma planta grave dados apontando para registros de outra, roda uma versão do Next com advisories críticos, não tem backup testado nem banco reproduzível, e qualquer problema em produção é invisível. Nenhum desses itens é difícil; juntos, as Fases 0–2 levam de 3 a 4 semanas.

### O Solentis precisa de rewrite?
**PARCIAL — e pequeno.**

A base está certa: stack, modelo multi-tenant, padrão de actions com guard, auditoria em transação, snapshots de limites, fluxo do operador. Reescrever tudo jogaria fora meses de regras de negócio validadas em campo. Só três partes devem ser refeitas do zero, porque refatorar custa mais: a sincronização offline (~100 linhas), a camada de consultas do dashboard do gestor (os componentes visuais ficam) e o histórico de migrations (vira um baseline). Todo o resto é refatoração incremental, módulo a módulo, sempre junto de uma mudança de produto.

### A arquitetura atual consegue suportar crescimento?
**COM ALTERAÇÕES.**

Até ~10 clientes ela aguenta, desde que o P0 e o dashboard sejam resolvidos e a infraestrutura saia dos planos gratuitos. Para 100 clientes ela precisa de staging, testes de integração, rate limit e observabilidade. Para 1.000, precisa que o isolamento deixe de depender da memória de quem escreve cada action (contexto único, prova de posse, guardião estendido, FK composta), de agregados para os dashboards e de uma fila para os jobs. Para 10.000, de particionamento e réplica de leitura. Nada disso exige trocar de framework, de banco ou de provedor; exige tomar agora as decisões listadas na seção 9 (migrations, chave do Blob por tenant, idempotência das medições, prova de posse, contexto único e unicidade de e-mail), porque mudar essas seis coisas depois, com muitos clientes e dados, custa muito mais.

---

*Nenhuma alteração foi implementada. Aguardando autorização explícita para começar a implementação.*
