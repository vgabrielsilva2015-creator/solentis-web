# Solentis — Auditoria Técnica Passada 1

**Data:** 07/10/2026
**Escopo:** repositório `vgabrielsilva2015-creator/solentis-web` — `origin/main` em `f7962c1` (merge do PR #40, 04/09/2026), mais o working tree local de `C:\Users\Vitor\projetos\meu-projeto` (branch `feat/super-admin-e-hardening`, `8ca8712` + alterações não commitadas).
**Regra seguida:** nenhum arquivo do projeto foi alterado, nenhum commit, nenhuma migration, nenhum acesso ao banco de produção. Tudo que foi executado rodou numa cópia descartável, fora do seu computador.

## Como esta auditoria foi feita

O código e o histórico Git foram copiados (sem `.env`, sem `backups/`, sem `docs/recovery-codes.txt`) para um ambiente isolado. Lá:

- rodei `npm ci`, `tsc --noEmit`, `eslint`, `vitest run`, `npm audit` e `next build` no código da `main`, sem modificação;
- subi um PostgreSQL 16 local descartável, criei o schema a partir do `schema.prisma`, rodei o `prisma/seed.ts`, criei uma segunda planta ("Planta B") e um SUPER_ADMIN, e subi a aplicação em modo produção (`next start`);
- testei como usuário real (HTTP direto, server actions chamadas fora da UI e navegador headless Chromium em viewport de celular);
- carreguei **1.000.000 de leituras** e **50.000 ocorrências** numa planta para medir onde o sistema começa a sofrer.

Limitação do ambiente: o sandbox bloqueia `binaries.prisma.sh`, `fonts.googleapis.com` e o domínio `solentis.app`. Para rodar o app, a cópia de teste usou o query engine WASM do próprio `@prisma/client` com o adapter `pg` (só no harness — o código auditado continua o mesmo), e o build usou um mock offline das Google Fonts. Produção, Vercel e Supabase **não puderam ser consultados** (ver seção 19).

Legenda de status: **CONFIRMADO** = reproduzido em execução ou provado por teste; **CONFIRMADO (código)** = evidente pela leitura do código, sem reprodução em runtime; **INFERIDO** = alta probabilidade pela análise, sem prova; **NÃO VERIFICADO** = depende de algo que não pude acessar.

---

## 1. Executive Summary

Respondendo à pergunta "se eu colocasse clientes reais usando o Solentis amanhã, o que poderia dar errado?":

1. **Leituras feitas offline são perdidas em 100% dos casos.** O sincronizador manda os campos com nomes errados, o servidor rejeita, e o código apaga a fila mesmo assim. Nenhum aviso aparece para o operador. Para um sistema que registra dados de conformidade ambiental, isso é o problema mais grave encontrado.
2. **Desativar um usuário, rebaixar o papel dele ou desativar uma planta inteira não derruba quem já está logado.** A sessão continua válida e se renova a cada uso. Um operador demitido que continua usando o app mantém acesso indefinidamente; o gestor rebaixado continua gestor até deslogar.
3. **O Next.js em produção (16.2.12) tem 3 advisories críticos (RCE) publicados.** O gate de CI (`npm audit --omit=dev --audit-level=high`) hoje **falha**: o próximo push na `main` fica vermelho.
4. **Dá para gravar dados apontando para registros de outra planta.** Análises, ocorrências, cronogramas e equipamentos aceitam IDs de ponto de coleta/categoria/responsável de outro tenant. Reproduzi: um técnico da planta A gravou uma análise com o ponto da planta B, e o **nome do ponto da planta B apareceu no dashboard, na lista de análises e no CSV do gestor da planta A**. Exige conhecer um ID da outra planta, mas o guardião de isolamento não pega isso.
5. **O dashboard do gestor não escala.** Com 1 milhão de leituras e 20 mil ocorrências abertas, a página levou **14,7 s e gerou 47 MB de HTML** (o 1 dia gerou 34 MB). Ele serializa todas as ocorrências abertas e todas as leituras do período para o navegador.
6. **O banco não é reproduzível a partir do repositório.** As migrations param em junho; desde então o schema foi alterado via `db push` e SQL avulso. Faltam 1 tabela e 7 colunas nas migrations, e 2 colunas não estão versionadas em lugar nenhum. Não existe caminho confiável para subir um ambiente novo, um staging ou restaurar um desastre.
7. **O service worker guarda páginas autenticadas no cache por 24 h**, ao contrário do que o comentário do código afirma. Em tablet compartilhado entre operadores, os dados do operador anterior ficam no aparelho após o logout.
8. Há uma série de problemas de segurança de severidade média confirmados: troca de senha sem pedir a senha atual, bloqueio de conta por força bruta usável como ataque de negação de serviço (5 tentativas erradas trancam a conta do colega, e a senha certa também é recusada), reset de senha sem limite de envio, e mensagem de erro do Prisma com host e porta do banco exibida na tela de login quando o banco cai.
9. Bugs funcionais confirmados: a **busca global não encontra nada** que tenha letra maiúscula (ou seja, quase tudo); **vírgula decimal ("7,2") é rejeitada** com mensagem crua em inglês; o botão "Registrar leitura" fica **escondido atrás da barra de navegação** no celular.
10. Infra de produção e operação ainda são de protótipo: sem rastreamento de erros, sem métricas, sem alertas, testes que não exercitam o código de produção, CI sem lint/build/E2E, plano Vercel Hobby e Supabase Free (segundo a própria documentação do projeto).

O lado bom, também verificado: o isolamento de **leitura** entre plantas resistiu a todos os acessos diretos que tentei (URLs, APIs de foto, exportação, busca); as páginas se defendem sozinhas mesmo quando o proxy não roda; React escapou o XSS armazenado; as server actions de gestor/admin recusam operador; typecheck, testes e build passam; não há segredo real no histórico do Git.

**Veredito:** o Solentis funciona bem como piloto acompanhado, mas **não está pronto para clientes pagantes sem supervisão**. Os itens 1 a 6 precisam ser resolvidos antes.

---

## 2. Nota Geral

# 44 / 100

---

## 3. Scorecard

| Área | Nota | Comentário curto |
|---|---|---|
| Arquitetura | 55 | Next.js App Router bem usado no geral; isolamento multi-tenant só por convenção; ~2.000 linhas duplicadas entre pastas de papel |
| Código | 50 | 197 erros de lint, 108 `any`, arquivos mortos, scripts soltos na raiz |
| Segurança | 50 | Leitura cross-tenant bloqueada; escrita cross-tenant possível; sessão irrevogável; Next com CVEs críticos |
| Performance | 40 | Dashboard explode com volume; consultas sem limite; busca sem índice |
| Banco | 38 | Migrations quebradas, schema não reproduzível, sem constraints de enum, índices faltando |
| Frontend | 58 | Mobile razoável; botão escondido; dois "voltar"; mensagens cruas do Zod |
| Backend | 55 | Server actions com guard de papel; validação de FK por tenant inconsistente |
| UX | 60 | Fluxo do operador limpo; erros técnicos aparecem para o usuário |
| Testes | 28 | 185 testes verdes, mas testam cópias de schemas e funções puras; zero teste de action, banco ou integração |
| DevOps | 35 | CI sem lint/build/E2E; gate de audit hoje falha; deploy sem staging |
| Documentação | 35 | README é o template do create-next-app; CLAUDE.md com 85 KB e trechos contraditórios |
| Escalabilidade | 30 | Plano Free/Hobby; cron serial; dashboard e exportação sem limite |
| Observabilidade | 30 | Pino estruturado ok; sem Sentry, métricas, tracing ou alertas |

---

## 4. Top 20 Problemas

### P-01 — Sincronização offline descarta todas as leituras
- **Severidade:** 🔴 CRÍTICO — **CONFIRMADO**
- **Categoria:** Bug / perda de dados
- **Arquivo:** `src/components/sync-manager.tsx` linhas 25 e 42; `src/app/operador/leituras/novo/reading-form.tsx` linhas 195–207
- **Evidência:** o formulário grava na fila `{ collection_point_id, parameter_id, value, unit, notes, recorded_at }`. O `SyncManager` reenvia `point_id` (lendo `item.point_id`, que não existe → `"undefined"`), `equipment_id`, `parameter_id`, `value` — sem `collection_point_id` e sem `recorded_at`. `registrarLeitura` exige os dois. Depois do laço, `localStorage.removeItem('solentis_offline_leituras')` apaga a fila inteira, independentemente do resultado.
- **Reprodução:** enviei exatamente o FormData que o SyncManager monta. Resposta do servidor: `{"fieldErrors":{"collection_point_id":["...received null"],"recorded_at":["...received null"]}}`. Nenhuma leitura gravada, fila apagada, nenhum alerta (o `alert` só aparece se `successCount > 0`).
- **Impacto:** toda leitura registrada sem internet desaparece. O operador acredita que salvou ("Leitura salva localmente e será sincronizada"). Em auditoria de órgão ambiental, isso vira lacuna de monitoramento.
- **Recomendação:** alinhar o payload com o schema, remover da fila só o que deu certo, mostrar erro quando falhar, e cobrir com teste de integração. Avaliar também se a página do formulário sequer carrega offline (as navegações de `/operador` são `NetworkOnly`).

### P-02 — Sessões não são revogadas (usuário desativado, papel alterado, planta desativada)
- **Severidade:** 🟠 ALTO — **CONFIRMADO**
- **Categoria:** Segurança / autorização
- **Arquivo:** `src/lib/auth.config.ts` linhas 13–33; `src/proxy.ts`
- **Evidência:** `role`, `tenantId` e `mustChangePassword` são gravados no JWT no login e nunca mais conferidos no banco. O Auth.js renova o cookie a cada requisição (sessão deslizante de 60 min).
- **Reprodução:** (a) operador logado → `is_active=false` no banco → `/operador/turnos` continuou 200 e `/api/auth/session` emitiu token novo com mais 3600 s; (b) gestor rebaixado para OPERATOR no banco → `/gestor/usuarios` continuou 200; (c) planta B desativada → gestor B com sessão aberta continuou 200 (novo login, corretamente, foi bloqueado).
- **Impacto:** "Desativar usuário" e "Desativar planta" (inclusive o botão do super admin) não cortam quem já está dentro. Funcionário demitido, cliente inadimplente ou credencial vazada continuam ativos enquanto houver uso a cada hora.
- **Recomendação:** checar `is_active` do usuário e da planta (e o papel atual) no callback `jwt` com cache curto, ou manter uma versão de sessão no usuário e invalidar ao desativar/trocar senha/trocar papel.

### P-03 — Timeout de 30 min do operador não funciona
- **Severidade:** 🟡 MÉDIO — **CONFIRMADO**
- **Arquivo:** `src/lib/auth.config.ts` linha 21; `src/lib/auth-utils.ts` linha 3
- **Evidência:** o código define `token.exp = now + 30min` para OPERATOR, mas o Auth.js sobrescreve o `exp` com `session.maxAge` ao assinar. Token decodificado do operador: `exp - iat = 3600`.
- **Impacto:** a política documentada (30 min em tablet compartilhado) não existe na prática.
- **Recomendação:** implementar o limite por papel no callback `jwt` comparando `iat` ou um campo próprio, não `exp`.

### P-04 — Next.js 16.2.12 com advisories críticos e gate de CI quebrado
- **Severidade:** 🔴 CRÍTICO — **CONFIRMADO** (npm audit de 07/10/2026)
- **Arquivo:** `package.json` (`"next": "16.2.12"`), `.github/workflows/ci.yml`
- **Evidência:** `npm audit --omit=dev` = 1 crítico + 4 altos. Para `next`: GHSA-p293-qw3h-jr36 (RCE em servidores Windows, <16.3.3), GHSA-2xp9-vwfh-vxw4 (RCE no Image Optimization com AVIF, <16.3.3), GHSA-vcvr-r3jv-pc5j (RCE em `next/og`, <16.3.6). Também `sharp` <0.35.5 e `undici` <6.28.1 (via `@vercel/blob`). Correção sugerida pelo npm: `next@16.4.0`.
- **Impacto:** na Vercel a otimização de imagem roda na infraestrutura deles e o app não usa `next/og`, então a exploração direta em produção é **INFERIDA como reduzida**. Mas o `next dev` roda no seu Windows, o projeto usa `next/image`, e o step "Gate de segurança" do CI hoje falha → o próximo push/PR na `main` fica vermelho.
- **Recomendação:** atualizar Next (e transitivos) já. Isso é correção de dependência, fora do escopo desta passada.

### P-05 — Escrita com referência a registros de outra planta (cross-tenant FK)
- **Severidade:** 🟠 ALTO — **CONFIRMADO**
- **Categoria:** Segurança / isolamento multi-tenant / integridade
- **Arquivos:** `src/app/tecnico/analises/actions.ts` linha 95; `src/app/operador/ocorrencias/actions.ts` linha 135; `src/app/gestor/(sistema)/cronograma/novo/actions.ts` linhas 12–13; `src/app/tecnico/equipamentos/actions.ts` linhas 158, 170, 254, 264
- **Evidência:** `collection_point_id`, `category_id`, `responsible_id` e `parameter_id` (cronograma) vão direto do formulário para o `create`/`update` sem checar se pertencem ao tenant da sessão. A FK do Postgres é global, então aceita.
- **Reprodução:** técnico da planta A chamou `registrarAnalise` com o `collection_point_id` da planta B → análise criada no tenant A apontando para o ponto de B. Em seguida o gestor da planta A viu **"PONTO SECRETO B"** no `/gestor/dashboard`, no `/gestor/analises` e no CSV de `/api/export?type=analyses`. O mesmo aconteceu com `registrarOcorrencia`.
- **Impacto:** quebra de integridade entre plantas e vazamento de nomes de outra empresa. Exige que o atacante conheça um ID (cuid) da outra planta — IDs vazam por URL, print, CSV, suporte.
- **Recomendação:** validar toda FK recebida do cliente com `findFirst({ id, tenant_id })` antes de gravar; incluir esse caso no guardião (hoje ele só confere se `tenant_id` aparece em algum lugar do bloco).

### P-06 — Dashboard do gestor sem limites (47 MB / 14,7 s)
- **Severidade:** 🟠 ALTO — **CONFIRMADO**
- **Categoria:** Performance / escalabilidade
- **Arquivo:** `src/app/gestor/dashboard/page.tsx` linhas 150–168 e 330
- **Evidência:** `prisma.occurrence.findMany` de todas as ocorrências abertas sem `take`; `reading/analysis/externalAnalysis.findMany` de todas as linhas do período para o gráfico; leituras de 7 dias buscadas linha a linha só para contar por dia; heatmap traz todas as leituras das últimas 24 h por ponto. Tudo é serializado para o client component.
- **Reprodução (harness local, 1 M leituras, 20 k ocorrências abertas):** `/gestor/dashboard` = **14,70 s, 46.910 KB**; `?dias=1` = **7,39 s, 33.886 KB** (as 20.000 ocorrências aparecem duas vezes no payload).
- **Impacto:** com uma planta de volume real (ou sensores no futuro), o dashboard trava o celular do gestor e estoura tempo e memória da função na Vercel. Com `connection_limit=1` (recomendado no `.env.example`) as ~25 queries paralelas viram seriais.
- **Recomendação:** agregar no banco (COUNT/GROUP BY por dia), limitar listas (`take`), amostrar séries, paginar ocorrências.

### P-07 — Schema do banco não é reproduzível pelo repositório
- **Severidade:** 🟠 ALTO — **CONFIRMADO**
- **Categoria:** Banco / DevOps / recuperação de desastre
- **Arquivos:** `prisma/migrations/` (4 migrations, última em 26/06), `prisma/sql/*.sql`, `prisma/schema.prisma`
- **Evidência:** apliquei as 4 migrations num banco vazio e comparei com o schema. Faltam: tabela `shift_task_templates` (11 colunas), `shift_tasks.{template_id, requires_photo, repeated_from_id, repeat_reason, occurrence_id}`, `readings.photo_filename`, `users.receive_nc_push`. As duas últimas (`occurrence_id`, `receive_nc_push`) **não existem em nenhum arquivo SQL do repo**. A migration `remove_global_email_unique` remove o unique global de e-mail, mas o schema declara `email @unique` e o login depende disso (`findUnique({ where: { email } })`).
- **Impacto:** impossível subir staging, ambiente de teste de carga, ou restaurar em outro projeto com confiança. Se o banco de produção não tiver o unique global de e-mail (**NÃO VERIFICADO**), dois usuários de plantas diferentes podem ter o mesmo e-mail e o login pega um qualquer.
- **Recomendação:** gerar um baseline a partir do banco real (`prisma migrate diff --from-url ... --to-schema-datamodel`), marcar como aplicado e voltar a usar migrations.

### P-08 — Service worker guarda páginas autenticadas no cache
- **Severidade:** 🟠 ALTO — **CONFIRMADO**
- **Categoria:** Segurança / privacidade (LGPD)
- **Arquivo:** `src/app/sw.ts` linhas 13–29
- **Evidência:** a regra `NetworkOnly` só cobre `request.mode === "navigate"` e não inclui `/manutencao`. As requisições RSC da navegação client-side caem no `defaultCache` do Serwist (`NetworkFirst`, 24 h). O logout (`handleSignOut`) não limpa caches.
- **Reprodução:** no Chromium headless, logado como operador e navegando pelo menu, os caches `pages-rsc` e `pages-rsc-prefetch` passaram a conter `/operador/dashboard`, `/operador/turnos/escala`, `/operador/estoque`, `/operador/ocorrencias`...
- **Impacto:** em tablet compartilhado, o payload das telas do operador A fica no aparelho e pode ser servido offline depois do logout. O comentário do arquivo diz o contrário.
- **Recomendação:** `NetworkOnly` também para requisições com header `RSC` nas rotas autenticadas (incluindo `/manutencao`) e `caches.delete` no logout.

### P-09 — Credenciais padrão versionadas, incluindo SUPER_ADMIN
- **Severidade:** 🟠 ALTO — **CONFIRMADO (código)**; presença em produção **NÃO VERIFICADA**
- **Arquivos:** `create-super.ts` linha 7 (SUPER_ADMIN `super@solentis.local` com senha fixa e `must_change_password: false`, dentro do tenant `default`, que é a planta do cliente); `prisma/seed.ts` linhas 17–20 (gestor obriga troca; técnico, operador e manutenção com senha fixa e **sem** troca obrigatória, senhas que nem passam na política do próprio app); `scripts/seed-admin.js` (padrão `admin123`, bcrypt custo 10). As mesmas senhas aparecem em `CLAUDE.md` e nos testes E2E.
- **Impacto:** se algum desses scripts rodou no banco de produção e a senha não foi trocada, qualquer pessoa com acesso ao repositório (ou a uma cópia do CLAUDE.md) entra — e o SUPER_ADMIN enxerga e altera todas as plantas.
- **Recomendação:** conferir no banco de produção se essas contas existem; remover senhas fixas dos scripts (gerar aleatória e imprimir uma vez); SUPER_ADMIN num tenant próprio.

### P-10 — Bloqueio por força bruta vira ataque de negação de serviço e enumeração
- **Severidade:** 🟡 MÉDIO — **CONFIRMADO**
- **Arquivo:** `src/lib/auth.ts` linhas 83–108; `src/app/(auth)/login/actions.ts` linhas 147–153
- **Reprodução:** 6 senhas erradas para `operador@...` → "Muitas tentativas falhas". Em seguida a **senha correta também foi recusada**. Para um e-mail inexistente, 6 tentativas seguem dizendo "E-mail ou senha incorretos".
- **Impacto:** qualquer pessoa tranca a conta de qualquer operador por 15 min, em loop, sem precisar de senha (ex.: na troca de turno). A mensagem diferente revela quais e-mails existem. Não há limite por IP.
- **Recomendação:** limite por IP + e-mail, atraso progressivo em vez de bloqueio duro, mensagem idêntica para todos os casos.

### P-11 — Troca de senha sem pedir a senha atual
- **Severidade:** 🟡 MÉDIO — **CONFIRMADO**
- **Arquivo:** `src/app/(auth)/trocar-senha/actions.ts` linhas 30–84
- **Reprodução:** com a sessão do técnico, `trocarSenhaAction` com só a nova senha → login com a nova senha funcionou.
- **Impacto:** em tablet compartilhado com sessão aberta, qualquer um troca a senha do dono da sessão e toma a conta. A troca também não invalida outras sessões (ver P-02).
- **Recomendação:** exigir a senha atual quando `mustChangePassword` for falso.

### P-12 — Reset de senha sem limite de envio
- **Severidade:** 🟡 MÉDIO — **CONFIRMADO** (envio simulado no harness)
- **Arquivo:** `src/app/(auth)/actions.ts` linha 28
- **Reprodução:** 20 chamadas anônimas seguidas de `sendPasswordResetLink` para o mesmo e-mail, todas aceitas, cada uma gerando token e e-mail.
- **Impacto:** bombardeio de e-mails para usuários, consumo da cota do Resend, possível bloqueio do domínio remetente. Em produção, a chamada ao Resend só acontece para e-mails existentes, o que deve criar diferença de tempo mensurável (**INFERIDO**). O reset também não invalida sessões abertas.
- **Recomendação:** limite por IP/e-mail e resposta em tempo constante (enviar em background).

### P-13 — Erro interno do Prisma exibido na tela de login
- **Severidade:** 🟡 MÉDIO — **CONFIRMADO**
- **Arquivo:** `src/app/(auth)/login/actions.ts` linha 153 (`return { error: msg ?? ... }`)
- **Reprodução:** banco parado → a tela de login recebeu `"Invalid prisma.user.findUnique() invocation: connect ECONNREFUSED 127.0.0.1:5433"`.
- **Impacto:** em produção, qualquer instabilidade do Supabase mostra host e porta do pooler a quem estiver na tela de login, e o operador vê uma mensagem incompreensível.
- **Recomendação:** mensagem genérica para qualquer erro que não seja o rate-limit; log só no servidor.

### P-14 — Busca global não encontra nada com letra maiúscula
- **Severidade:** 🟡 MÉDIO — **CONFIRMADO**
- **Arquivo:** `src/app/api/search/route.ts` linhas 16, 24–25, 36, 46
- **Evidência:** o termo é convertido para minúsculas e usado com `contains` sem `mode: 'insensitive'` (no Postgres é case-sensitive).
- **Reprodução:** com o ponto "Entrada ETE" cadastrado, buscar "Entrada" e "entrada" → 0 resultados nos dois. Os links dos resultados também apontam para `/gestor/...` e `/tecnico/...` independentemente do papel de quem buscou.
- **Recomendação:** `mode: 'insensitive'` + índice trigram (`pg_trgm`) quando o volume crescer.

### P-15 — Vírgula decimal rejeitada com mensagem em inglês
- **Severidade:** 🟡 MÉDIO — **CONFIRMADO** (servidor); comportamento do teclado do celular **NÃO VERIFICADO**
- **Arquivo:** `src/app/operador/leituras/actions.ts` linhas 34–36 (`Number(v)`)
- **Reprodução:** leitura com `value = "7,2"` → `"Invalid input: expected number, received NaN"`. A correção de vírgula registrada em agosto (patch `solentis-fotos-e-virgula`) **não está na `main`**.
- **Recomendação:** normalizar vírgula no preprocess e traduzir mensagens do Zod (o mesmo problema aparece em todas as actions: "expected string, received null" chega cru ao usuário).

### P-16 — Leitura vinculada ao turno de outro operador
- **Severidade:** 🟡 MÉDIO — **CONFIRMADO (código)**
- **Arquivo:** `src/app/operador/leituras/actions.ts` linhas 126–134
- **Evidência:** se o operador não tem turno aberto, o código pega **qualquer** turno aberto do tenant (`findFirst({ tenant_id, status: 'OPEN' })`). A tela também permite registrar leitura sem turno ativo.
- **Impacto:** registros atribuídos ao turno errado, passagem de turno e relatórios inconsistentes.

### P-17 — Limites de upload incompatíveis com o limite de 4,5 MB da Vercel
- **Severidade:** 🟡 MÉDIO — **INFERIDO**
- **Arquivos:** `src/app/tecnico/equipamentos/actions.ts` linha 140 (manual até 10 MB); `src/app/gestor/(resultados)/laudos/importar/actions.ts` linha 23 (base64 até 14 MB); `next.config.mjs` (`bodySizeLimit: '6mb'`)
- **Impacto:** manuais em PDF e laudos para a IA acima de ~3–4 MB falham em produção com erro genérico da plataforma, antes de chegar na validação. O formulário de leitura já trata isso; os outros não.
- **Recomendação:** upload direto para o Blob pelo cliente (client upload com token) ou limites coerentes com a plataforma.

### P-18 — Arquivos no Vercel Blob são públicos e a URL vai para o navegador
- **Severidade:** 🟡 MÉDIO — **CONFIRMADO (código)**
- **Arquivos:** `src/lib/storage.ts` linha 56 (`access: 'public'`); `src/app/gestor/(manutencao)/equipamentos/[id]/page.tsx` linhas 377–378 e a versão de `tecnico` (passam `photo_url`/`manual_url` completos para o client component); `next.config.mjs` (CSP libera `*.public.blob.vercel-storage.com`)
- **Impacto:** quem tiver o link acessa a foto/manual sem login, para sempre, inclusive ex-funcionários. As rotas autenticadas de foto existem, mas a URL pública vaza no payload. Fotos de ocorrência e leitura passam por rota autenticada, mas o objeto no Blob continua público.
- **Recomendação:** Blob privado (ou URL assinada de curta duração) e nunca enviar a URL bruta ao cliente.

### P-19 — Testes não exercitam o código de produção
- **Severidade:** 🟡 MÉDIO — **CONFIRMADO**
- **Arquivos:** `src/lib/__tests__/*` (13 arquivos, 185 testes), `tests/*.spec.ts`, `.github/workflows/ci.yml`
- **Evidência:** nenhum teste importa de `src/app` — nenhuma server action é testada. `fase11-criticos.test.ts` e `pontos.test.ts` redeclaram schemas Zod (testam cópias). Nenhum teste toca banco. Os 6 specs Playwright não rodam no CI e usam as senhas do seed. Sem medição de cobertura. O CI não roda `eslint` nem `next build`.
- **Impacto:** P-01, P-05, P-14 e P-15 passariam no CI hoje. O "185 testes verdes" dá uma segurança que não existe.

### P-20 — Sem observabilidade de produção
- **Severidade:** 🟡 MÉDIO — **CONFIRMADO (código)**
- **Evidência:** Pino com JSON e `requestId` (bom), mas não há Sentry/rastreamento de erros, métricas, tracing, alertas, nem log de duração de query. O `x-vercel-id` é o único correlacionador. Retenção de logs no plano Hobby é curta (**NÃO VERIFICADO** o plano atual).
- **Impacto:** "o sistema ficou lento às 14:32 de ontem" hoje não tem resposta.

---

## 5. Bugs Confirmados

| ID | Bug | Status |
|---|---|---|
| B-01 | Fila offline de leituras perdida (P-01) | CONFIRMADO |
| B-02 | Busca global retorna zero com maiúsculas (P-14) | CONFIRMADO |
| B-03 | Vírgula decimal rejeitada (P-15) | CONFIRMADO |
| B-04 | Timeout de sessão do operador ignorado (P-03) | CONFIRMADO |
| B-05 | Botão "Registrar leitura" fica coberto pela barra de navegação inferior no celular (Pixel 7) | CONFIRMADO (captura) |
| B-06 | Contagem de ocorrências do dashboard com filtro de ponto: `open_total` aplica o filtro, `open_critical`/`open_other` não — os números não fecham (`dashboard/page.tsx` linhas 126–131) | CONFIRMADO (código) |
| B-07 | `createMonitoringSchedule` grava `created_by` = primeiro usuário qualquer do tenant (TODO deixado no código), sem Zod, `frequency` livre, `days_of_week` pode virar `NaN` (`cronograma/novo/actions.ts`) | CONFIRMADO (código) |
| B-08 | Links de notificação e busca levam MANUTENÇÃO/OPERADOR para `/gestor/...` → "acesso negado" | CONFIRMADO (código) |
| B-09 | Descrição de ocorrência sem tamanho máximo: aceitou 200 KB | CONFIRMADO |
| B-10 | Lista de modelos da IA inclui modelos descontinuados (`gemini-1.5-pro`, `gemini-pro`), gerando tentativas e esperas inúteis antes de falhar | CONFIRMADO (código) |
| B-11 | `aplicarTimeouts` grava no banco durante a renderização da página (efeito colateral em GET) | CONFIRMADO (código) |
| B-12 | Duas setas "voltar" na tela Nova leitura ("← Leituras" e "← Voltar para leituras") | CONFIRMADO (captura) |

---

## 6. Vulnerabilidades

| ID | Sev. | Descrição | Status |
|---|---|---|---|
| V-01 | 🔴 | Next 16.2.12 com 3 advisories críticos; `sharp`, `undici` altos (P-04) | CONFIRMADO |
| V-02 | 🟠 | Sessão irrevogável após desativar usuário/planta/trocar papel (P-02) | CONFIRMADO |
| V-03 | 🟠 | Escrita cross-tenant via FK não validada, com vazamento de nome (P-05) | CONFIRMADO |
| V-04 | 🟠 | Cache do service worker com páginas autenticadas (P-08) | CONFIRMADO |
| V-05 | 🟠 | Credenciais fixas de SUPER_ADMIN e usuários seed no repo (P-09) | CONFIRMADO (código) / prod NÃO VERIFICADO |
| V-06 | 🟡 | Lockout como DoS + enumeração de e-mails (P-10) | CONFIRMADO |
| V-07 | 🟡 | Troca de senha sem senha atual (P-11) | CONFIRMADO |
| V-08 | 🟡 | Reset de senha sem rate limit; reset/troca não invalidam sessões (P-12) | CONFIRMADO |
| V-09 | 🟡 | Erro do Prisma com host:porta na tela de login (P-13) | CONFIRMADO |
| V-10 | 🟡 | Blob público + URL enviada ao cliente (P-18) | CONFIRMADO (código) |
| V-11 | 🔵 | `sendPushToRole(tenantId, role, payload)` e `sendPushToUsers(userIds, payload)` estão num arquivo `'use server'` → são server actions públicas **sem autenticação**. Hoje o ID delas não aparece no JS público (verifiquei: 78 de 85 actions estão no bundle público, essas duas não), então a exploração exige descobrir o ID. | CONFIRMADO (código) / exploração INFERIDA difícil |
| V-12 | 🔵 | HTML do e-mail de convite interpola o nome do usuário sem escapar (`usuarios/actions.ts` linha 104) — gestor pode injetar link/HTML num e-mail com o remetente oficial | CONFIRMADO (código) |
| V-13 | 🔵 | `editarUsuario` devolve `e.message` cru do Prisma para a tela (linha 187); a mensagem de e-mail duplicado ("já cadastrado nesta planta") revela que o e-mail existe em **outra** planta, porque o unique é global | CONFIRMADO (código) |
| V-14 | 🔵 | `obterDetalhesPonto` só exige login, não papel. **Testei e não é explorável hoje**: a action só é registrada na página `/gestor/dashboard`, que o proxy bloqueia para não-gestores. Falta defesa em profundidade. | CONFIRMADO não explorável |
| V-15 | ⚪ | O proxy não roda em caminhos com ponto (`.*\..*` no matcher). Testei `/gestor/usuarios/abc.def` e similares anônimos: as páginas se protegeram sozinhas (redirect). Server actions não dependem do proxy. | CONFIRMADO ok |
| V-16 | ⚪ | Leitura cross-tenant: `/gestor/ocorrencias/<id de B>`, `/api/readings/<id de B>/photo`, `/api/occurrences/<id de B>/photo`, export e busca — todos bloqueados | CONFIRMADO ok |
| V-17 | ⚪ | XSS armazenado (`<img onerror>`, `<script>`) na descrição de ocorrência foi escapado na tela do gestor | CONFIRMADO ok |
| V-18 | ⚪ | Server actions de gestor chamadas por operador (`criarUsuario`) → redirect, nada criado | CONFIRMADO ok |
| V-19 | ⚪ | SQL bruto (`$queryRaw`) usa `Prisma.sql` parametrizado; sem injeção | CONFIRMADO (código) |

SSRF, command injection e path traversal: não encontrei caminho explorável. `readUpload` faz `fetch` de qualquer URL salva no banco, mas hoje esses valores só vêm do próprio servidor; fica como ponto de atenção se algum dia um campo de URL vier do formulário.

---

## 7. Performance

Medições no harness local (PostgreSQL local, engine WASM — valores **relativos**, não absolutos de produção), planta com 1 M leituras e 50 k ocorrências (20 k abertas):

| Rota | Tempo | Tamanho |
|---|---|---|
| `/gestor/dashboard` (30 dias) | 14,70 s | 46.910 KB |
| `/gestor/dashboard?dias=1` | 7,39 s | 33.886 KB |
| `/api/export?type=occurrences&status=all` | 3,75 s | 7.379 KB (sem `take`) |
| `/gestor/ocorrencias` | 0,85 s | 266 KB (paginada — ok) |
| `/gestor/leituras`, `/operador/*`, `/gestor/relatorios`, `/gestor/auditoria` | 0,03–0,16 s | ok |

Outros pontos:

- **Dashboard** (P-06): ~25 queries por carregamento; listas sem limite; leituras de 7 dias buscadas inteiras só para contar.
- **Server actions usadas como leitura**: a cada página o cliente dispara POSTs de action (vi em `/tecnico/analises`) — não cacheáveis e enfileirados.
- **Busca** com `LIKE '%termo%'` sem índice trigram.
- `src/app/gestor/dashboard/queries.ts` tem versões com `unstable_cache` das mesmas queries, mas **ninguém importa esse arquivo** — o dashboard roda sem cache.
- 124 componentes `'use client'`; `next/font` com 3 famílias Google no layout raiz.
- Payload do dashboard repete os dados (HTML + RSC).

---

## 8. Banco

- **Migrations quebradas / schema não reproduzível** (P-07).
- **Sem constraints de domínio**: status, severidade, papel, matriz etc. são `String` sem `CHECK` — qualquer valor entra pelo banco ou por um bug.
- **Índices faltando** (Postgres não indexa FK automaticamente): `occurrence_comments.occurrence_id`, `shift_handovers.shift_instance_id`, `maintenance_logs.*`; `occurrences (tenant_id, status, created_at)` para a listagem ordenada; nada para busca textual.
- **Índices fora do schema** (`prisma/sql/add_indexes.sql`, uniques parciais de turno) — se não foram aplicados no Supabase, a proteção contra turno duplicado não existe (**NÃO VERIFICADO** em produção).
- **Tabela morta**: `sessions` (a sessão é JWT); `users.deleted_at` coexiste com `is_active`.
- **RLS desligado** no Supabase (pendência registrada pelo próprio projeto); o isolamento é 100% na aplicação.
- **Escala imaginada:**
  - 100 mil registros por planta: tudo bem, exceto busca.
  - 1 milhão: dashboard já inviável (medido).
  - 10 milhões: export, relatórios e qualquer `findMany` por período sem limite passam a estourar memória/timeout; `readings (tenant_id, recorded_at)` ainda segura as listagens.
  - 100 milhões: sem particionamento por tenant/tempo e sem rotinas de arquivamento, o Supabase Free/Pro pequeno não comporta; contagens `COUNT(*) FILTER` varrem o período inteiro.
- **Cron** (`/api/cron/shifts`): 3–4 queries por escala, em série, num único processo — com milhares de plantas não termina dentro do tempo da função.

---

## 9. GitHub / Git

- 281 commits na `main`, 20 merges, autor único (três identidades: `Vitor <v.gabriel...>`, `Vitor <vitor@solentis.local>`, conta do GitHub).
- **Nenhum segredo real encontrado no histórico** (procurei tokens GitHub, URLs Postgres com senha, chaves Google/Resend/Blob, chaves privadas, JWTs). Os dois acertos são o placeholder `NEXTAUTH_SECRET=troque...` no `.env.example` e em `docs/EXPORT_COMPLETO.md`. `.env`, bancos e backups nunca foram commitados.
- **`docs/recovery-codes.txt`** no `meu-projeto` está **fora do `.gitignore`** e não versionado — um `git add .` publica no GitHub. Não li o conteúdo.
- **`docs/EXPORT_COMPLETO.md`** (950 KB) é um dump do código-fonte inteiro, versionado 5 vezes — duplicata desatualizada do próprio repo.
- **20 branches remotas não mergeadas**, incluindo `fix/idor-laudos-tenant-scope` (a correção foi refeita na `main` por outro caminho — verifiquei que não há tenant fixo hoje) e 12 branches do Dependabot não mergeadas (algumas desde julho).
- Commit direto na `main` pela interface web (`0f38245 Modify hasBlob to include VERCEL check`), sem PR.
- Sinais de código temporário que entrou e saiu: rota `/api/debug/email` criada, liberada para MANAGER e removida (`278d3a9` → `934d45d`); `5ef3a2b chore: expoe mensagem de erro real na criacao de usuario para debug`; migração enum/Json revertida (`18451bd`).
- `public/worker-408b122eed8ea4e1.js` é artefato de build do antigo `next-pwa`, versionado e pré-cacheado pelo SW. `worker/index.js` também é desse plugin antigo.
- A `main` não recebe commit desde 04/09.
- **Clone desatualizado**: `C:\Users\Vitor\projetos\solentis-web` está parado em julho (`934d45d`), centenas de commits atrás. Fácil de abrir a pasta errada e trabalhar em código velho.
- **Working tree do `meu-projeto`**: 61 linhas alteradas e não commitadas (laudos/importação movidos para `/gestor/importacao`, kanban, navegação) + `scripts/load/node-load.mjs` novo. Os arquivos estão em CRLF (checkout Windows).
- GitHub Actions, PRs e releases via API: **NÃO VERIFICADO** (sem acesso ao repositório pela API).

---

## 10. Vercel

**NÃO VERIFICADO** — `solentis.app` foi bloqueado tanto pelo ambiente de análise quanto pela rede do seu computador nesta sessão, e não há acesso ao painel. O que dá para afirmar pelo repositório:

- `vercel.json`: região `gru1`, um cron diário 03:05 UTC. Sem `maxDuration` em nenhuma rota (import de laudo com IA faz retries com espera).
- Segundo o `CLAUDE.md`: plano **Hobby** (os termos da Vercel proíbem uso comercial no Hobby) e Supabase **Free** (sem PITR, sujeito a pausa). Ambos precisam mudar antes de cobrar cliente.
- Pendências que o próprio projeto lista e que não pude conferir: `connection_limit` na `DATABASE_URL`, `CRON_SECRET`, `RESEND_API_KEY`/`EMAIL_FROM`, Blob store, chaves VAPID, RLS, backup testado.
- `.env` local aponta `DATABASE_URL` para um pooler Supabase `sa-east-1` (porta 6543). Se for o mesmo banco de produção, rodar scripts locais (`create-super.ts`, `normalize-emails.js`, `run-indexes.js`, seeds) altera produção. **NÃO VERIFICADO** se é o mesmo projeto.
- Comparação LOCAL → GITHUB → VERCEL → PRODUÇÃO: local (`meu-projeto`) = `8ca8712` + WIP; GitHub `main` = `f7962c1`; Vercel/produção: desconhecido.

---

## 11. Arquitetura

- **Stack:** Next.js 16.2.12 (App Router, webpack), React 19.2.7, TypeScript 5 strict, Prisma 5.22 + PostgreSQL (Supabase, pooler), NextAuth v5 beta (JWT, Credentials), Tailwind v4 + shadcn/ui, Serwist (PWA), Vercel Blob, Resend, Gemini, web-push, Pino, Recharts, @react-pdf.
- **Tamanho:** 433 arquivos versionados, ~40 mil linhas TS/TSX, 99 páginas, 31 arquivos de server action (85 actions), 8 route handlers, 39 modelos.
- **Isolamento multi-tenant só por convenção**: `src/lib/prisma.ts` é um `PrismaClient` puro — sem extensão que injete `tenant_id`. A proteção é o teste estático `tenant-isolation.test.ts`, que tem pontos cegos: aceita qualquer bloco onde a palavra `tenant_id` apareça (inclusive dentro de `select` ou `data`), aceita valor fixo (`tenant_id: 'default'`), não olha `$queryRaw`, não valida FKs vindas do cliente (P-05), e é desligado por um comentário `@tenant-checked`.
- **Duplicação por papel**: ~2.000 linhas quase idênticas entre `gestor/` e `tecnico/` (equipamentos 98–100%, formulário de ocorrência 99%, escala 91–95%, entrada/saída de estoque 88–91%). Um bug corrigido de um lado fica do outro.
- **God files**: `gestor/dashboard/dashboard-client.tsx` (860 linhas), `operador/turnos/actions.ts` (786), `gestor/turnos/escala/escala-gestor-client.tsx` (732), `laudos/importar/page.tsx` (541).
- **Regras de domínio espalhadas**: guards de papel redeclarados em cada arquivo de action (`requireManager`, `requireOperator` com listas diferentes); `resolveUserId` existe em dois lugares com assinaturas diferentes; getDashboard duplicado entre `auth-utils.ts` e `trocar-senha/actions.ts`.
- **SUPER_ADMIN** criado dentro do tenant de cliente (`create-super.ts`), misturando administração do sistema com dados de planta.

---

## 12. Código

- `eslint`: **197 erros e 101 avisos** (108 `no-explicit-any`, 32 `require` em TS, 22 `set-state-in-effect`, 6 `react-hooks/purity`, 2 `static-components`, 16 `no-unescaped-entities`, 88 variáveis não usadas).
- `tsc --noEmit`: **0 erros** (19 s). `next build`: **ok** (82 s com mock de fontes).
- 97 usos de `any` no código de produção; 2 `@ts-ignore` (`push-actions.ts`); 46 `session.user.email!`; 1 `as unknown as`.
- **Arquivos mortos/soltos**: `replace.js`, `normalize-emails.js`, `create-super.ts`, `test-gemini.js`, `run-indexes.js` na raiz; `scripts/merge.js`, `refactor_tenant.js`, `fix-imports.js`, `update_export.js`, `update_export2.js`, `generate_export.js`; `worker/index.js`; `src/app/gestor/dashboard/queries.ts` (não usado); páginas `signup`, `verify-email`, `invite/[token]` que só redirecionam; SVGs do template (`next.svg`, `vercel.svg`, `window.svg`, `file.svg`, `globe.svg`) pré-cacheados pelo SW.
- `string-similarity` está deprecado.
- Comentário de arquitetura em `auth.ts` ainda fala em "OPERATOR, TECHNICIAN, MANAGER, MAINTENANCE" e "Tenant Isolation garantido no tenant.ts" — não é verdade.

---

## 13. UX/UI

Avaliado no celular (Pixel 7) com o operador:

- Fluxo de turnos limpo, empty state claro, navegação inferior com 5 itens, sem rolagem horizontal nas telas testadas.
- **Botão principal da Nova leitura coberto pela barra inferior** (B-05).
- Duas setas de voltar na mesma tela (B-12).
- Dois ícones de sino lado a lado (notificações e "push desligado") sem rótulo — ambíguo.
- **Mensagens técnicas chegam ao usuário**: Zod em inglês ("expected number, received NaN", "expected string, received null"), erro do Prisma no login (P-13), erro de banco em `editarUsuario`.
- Leitura pode ser registrada sem turno aberto e cai no turno de outra pessoa (P-16).
- Script do Vercel Analytics gera erro de console fora da Vercel (inofensivo, mas polui).
- Acessibilidade (WCAG), leitores de tela, contraste e telas do gestor/técnico em detalhe: **não avaliados nesta passada** (o dashboard com volume ficou inviável de renderizar).

---

## 14. Testes

| Item | Situação |
|---|---|
| Unitários | 185 testes / 13 arquivos, 4,6 s, todos verdes — funções puras e schemas redeclarados |
| Integração (actions + banco) | **nenhum** |
| E2E | 6 specs Playwright, fora do CI, dependem das senhas do seed |
| Cobertura | não configurada |
| Mocks / fixtures | inexistentes |
| CI | `npm audit` (falhando hoje), `vitest`, `tsc`. **Sem** lint, build ou E2E |

Partes críticas sem nenhum teste: sincronização offline, todas as server actions, autenticação real (lockout, sessão, desativação), validação de FK por tenant, upload, cron de turnos, import de laudo com IA, dashboard, exportação, service worker.

---

## 15. Dívida Técnica

Em ordem de custo de carregar: migrations/schema (P-07) → isolamento por convenção sem camada central → duplicação gestor/técnico → dashboard monolítico → testes que não testam o produto → 197 erros de lint → scripts soltos com credenciais → CLAUDE.md de 85 KB com seções duplicadas e contraditórias como única documentação.

---

## 16. Problemas de Escalabilidade

Onde quebra primeiro, por ordem:

1. **10 clientes:** plano Vercel Hobby/Supabase Free (termos e limites), ~60 conexões no Supabase Free com várias funções serverless abertas, dashboard de qualquer planta com histórico de meses.
2. **100 clientes:** suporte operacional sem observabilidade; sem staging, cada deploy vai direto para todos; cron de turnos lento; e-mail de reset/convite sem controle de cota.
3. **1.000 clientes:** cron serial estoura tempo; ausência de RLS + isolamento por convenção vira risco estatístico (basta um esquecimento); busca sem índice; exportações sem limite.
4. **10.000 clientes:** banco único sem particionamento, contagens por período varrendo milhões de linhas, armazenamento no Blob sem política de retenção.

---

## 17. Problemas de Observabilidade

"Se um cliente disser que o sistema ficou lento às 14:32 de ontem": hoje **não dá para descobrir**. Há logs JSON com `requestId` (bom) e `logAudit` de negócio (bom), mas:

- sem rastreamento de erros (Sentry ou similar) — erro de client só vai para `/api/logs`;
- sem métricas de latência por rota, sem duração de query, sem tracing;
- sem alertas (cron que não roda, taxa de erro, Blob/Resend fora);
- retenção de log dependente do plano da Vercel (**NÃO VERIFICADO**);
- e-mail do usuário vai para o log na tentativa de login com rate-limit falhando (PII em log).

---

## 18. Problemas de Documentação

Outro desenvolvedor **não conseguiria** clonar, instalar, configurar, rodar, testar e fazer deploy sozinho:

1. `README.md` é o texto padrão do create-next-app.
2. Não há instrução de como criar o banco do zero — e não daria certo (P-07).
3. `CLAUDE.md` mistura histórico de fases, decisões, credenciais e um handoff **duplicado** (o mesmo relatório aparece duas vezes); várias afirmações estão erradas e o próprio arquivo pede para "tratar o texto histórico como registro".
4. `.env.example` lista as variáveis, bom ponto de partida, mas omite `AUTH_TRUST_HOST` e `LOG_LEVEL`.
5. `docs/RUNBOOK.md` parou em junho e documenta backup/restore de **SQLite** — não serve para o Postgres/Supabase atual. Não existe procedimento de deploy, rollback ou restore testado.

---

## 19. Itens Não Verificados

- Estado real do banco de produção: unique global de e-mail, índices parciais de turno, RLS, contas seed/SUPER_ADMIN com senha padrão, colunas aplicadas por `db push`.
- Produção (`solentis.app`): headers, CSP, cron rodando, versão em deploy — domínio bloqueado nesta sessão.
- Painel da Vercel: plano, variáveis de ambiente, logs, erros, timeouts, cold starts, configuração do Blob.
- Supabase: plano, backups/PITR, conexões, uso.
- GitHub pela API: Actions (histórico de runs), PRs abertos, proteção de branch, secrets do repositório.
- Se a correção de vírgula e de fotos está em produção por outro caminho.
- Comportamento do teclado numérico com vírgula em celulares reais.
- Acessibilidade WCAG e telas do gestor/técnico em profundidade.
- Desempenho absoluto em produção (as medições são relativas, num ambiente local).

---

## 20. Conclusão

O Solentis tem uma base que dá para levar a produto: o isolamento de leitura entre plantas funcionou em todos os ataques que tentei, as permissões por papel nas server actions estão no lugar, o build e o typecheck passam, e o fluxo do operador no celular é simples. O trabalho de segurança feito em junho–setembro aparece no código.

O que separa o estado atual de "clientes reais amanhã" são seis coisas, nesta ordem: a perda silenciosa de leituras offline (P-01), sessões que sobrevivem à desativação (P-02), o Next com CVEs críticos e o CI quebrado (P-04), a escrita cross-tenant por FK (P-05), o banco que não se reconstrói pelo repositório (P-07) e o dashboard que não aguenta volume (P-06). Logo atrás vêm o cache do service worker, as credenciais fixas nos scripts, a infraestrutura em planos gratuitos e a falta de observabilidade.

Nada foi corrigido nesta passada.

---

### Anexo — comandos e resultados brutos

| Verificação | Resultado |
|---|---|
| `npm ci` | ok (o `postinstall prisma generate` falhou só por bloqueio de rede do sandbox) |
| `tsc --noEmit` | 0 erros, 19 s |
| `eslint .` | 197 erros, 101 avisos, 28 s |
| `vitest run --no-cache` | 185/185, 4,6 s |
| `npm audit --omit=dev` | 1 crítico, 4 altos (gate do CI falha) |
| `next build` | ok, 82 s, 79 páginas (com mock offline de Google Fonts) |
| Migrations vs schema | 1 tabela e 7 colunas faltando; 2 colunas sem SQL versionado |
| Scan de segredos no histórico | 0 segredos reais |
| Testes de runtime | 17 cenários (login, JWT, papéis, IDOR leitura/escrita, desativação, lockout, reset, troca de senha, banco fora, XSS, entrada gigante, vírgula, sync offline, SW cache, carga de 1 M leituras) |
