# IMPLEMENTATION-T20 — Guard único, matriz de permissões e `ctx`

**Branch:** `fix/t20-permissions` (sobre `fix/t19-indexes-constraints`)
**Commits:**

| Commit | Mensagem |
|---|---|
| `db79d01` | `refactor(auth): single permission matrix and guard for all server actions` (não muda quem pode o quê) |
| `4bce6f0` | `feat(occurrences): every resolution records who, when and the action taken` |
| `a91ee8a` | `feat(auth): apply owner permission decisions for manager, maintenance and operator` |
| `6e0702c` | `docs: permission matrix table and project rules (T-20)` |

## Objetivo
N-03, N-05 e parte de RC-1: uma matriz única de "quem pode o quê", um guard único em todas as server actions e um contexto (`ctx`) com usuário, planta e perfil. Também foram aplicadas as decisões de permissão do dono do produto.

## Decisões do dono do produto (08/10/2026)
1. **Gestor** consulta e altera o que é do operador: registra leitura (já fazia) e agora faz **saída e contagem de estoque**.
2. **Operador** registra, acompanha e **resolve** ocorrência. **Toda resolução fica registrada com responsável, data/hora e a ação tomada (evidência quando houver).**
3. **Manutenção** registra ocorrências.
4. **Técnico** registra leitura de campo (já fazia).

Prioridade declarada: rastreabilidade e separação de responsabilidades.

## Problema original
- **Guards espalhados:** 21 funções `require*` locais, cada uma com sua lista de perfis e sua reação. Algumas mandavam para o login, outras lançavam erro (500 na tela) e outras devolviam `{ error }`. Cada action buscava o próprio id por e-mail.
- **Perfil e status lidos do token.** Contraprova `t20.py`, rodada no código antes e depois:

| Cenário | Antes | Depois |
|---|---|---|
| Operador vira técnico no banco, token antigo, abre turno | **abre** | barrado: "Apenas operadores podem abrir turnos." |
| Gestor desativado cria categoria (dentro dos 60 s da T-06) | **cria** | volta para o login, nada criado |
| Operador desativado registra leitura | "Sessão inválida." | volta para o login, nada gravado |
| Detalhes do painel do gestor (`obterDetalhesPonto`) | a action aceitava qualquer perfil logado (*) | só gestor |

(*) Em execução não dava para explorar: o proxy barra a rota e o Next só executa a action a partir de uma tela que a contém. Foi uma correção de defesa em profundidade.

- **Resolução de ocorrência sem rastreabilidade.** Contraprova `t20b.py`:

| Cenário | Antes | Depois |
|---|---|---|
| Kanban: resolver sem escrever nada | **resolvida** com a nota "Resolvido via painel Kanban." | recusada: "Descreva a ação tomada (mínimo 10 caracteres)." |
| Tela do operador: nota vazia | aceita (o campo não era validado) | recusada |
| Resolver com ação e foto | — | gravada com o id de quem resolveu, data/hora e a ação; foto como evidência; auditoria `{resolved_by, resolved_at, resolution_notes, evidencia, via}` |
| Segunda resolução da mesma ocorrência | sobrescrevia responsável e data | "Ocorrência já encerrada." O primeiro responsável continua |
| Reabrir pelo kanban | mantinha os dados da resolução antiga na ocorrência | limpa a resolução atual; a anterior fica na auditoria; exige permissão de resolver |
| Gestor registra saída de estoque | "Apenas operadores ou técnicos…" | gravada (decisão 1) |
| Manutenção registra ocorrência | não gravava, e a área não tinha a tela | gravada; tela "Ocorrências" na área da Manutenção (decisão 3) |

## Causa raiz
A permissão crescia junto com cada tela, sem uma fonte única. O "quem é o usuário" vinha do token, com até 60 s de defasagem, ou de uma busca por e-mail. A resolução de ocorrência tinha três caminhos com regras diferentes.

## Alterações realizadas
- **`src/server/auth/permissions.ts`:**
  - matriz `PERMISSIONS` com 21 permissões;
  - `AREA_ACCESS`, de onde o `ROUTE_ACCESS` passou a vir;
  - mensagens de recusa.
  - É um arquivo puro. A tabela legível está em `docs/PERMISSOES.md`.
- **`src/server/auth/guards.ts`:**
  - `getActor()` lê o usuário no banco a cada action (filtra planta, ativo e não apagado), e o perfil vem do banco;
  - `requirePermission(p)` manda para `/acesso-negado` quando o perfil não tem a permissão;
  - `permissionError(ctx, p)` devolve a mensagem para formulários que mostram o erro na tela.
- **85 actions migradas:**
  - 21 guards locais e o `requireRole` removidos;
  - `resolveUserId(email)` virou `ctx.userId`;
  - as buscas de "admin por e-mail" do super admin viraram `ctx`.
- **`/api/export`** usa a matriz e responde 403 a perfil sem permissão.
- **Resolução de ocorrência** (`src/server/occurrences/resolve.ts`), caminho único para as telas do operador, do técnico e do gestor e para o kanban:
  - ação obrigatória (10 a 2000 caracteres);
  - foto opcional (`occurrence_photos.kind = RESOLUTION`, migration aditiva `20261008000000`);
  - gravação condicional (uma vez só);
  - auditoria completa.
  - Os dois `resolve-form` duplicados viraram `src/components/occurrences/resolve-form.tsx`, e a evidência aparece na linha do tempo.
- **Decisões aplicadas:**
  - `stock.move` inclui o gestor, com os botões "Registrar saída" e "Contagem física" na tela do produto;
  - `occurrence.create` inclui a Manutenção, com as telas `/manutencao/ocorrencias` e `/manutencao/ocorrencias/novo` e o item no menu e na barra inferior.
- `updateOccurrenceStatus` devolve `{ error }` em vez de lançar exceção. Em produção, o Next esconde a mensagem de um `throw`.

## Testes criados
- **`permissions.test.ts` (99 casos):**
  - toda action protegida chama o guard com uma permissão existente, e antes de qualquer consulta ao banco;
  - não há guard local nem comparação de perfil feita à mão;
  - **as 85 actions são comparadas com um retrato do comportamento anterior** (`fixtures/permissions-before-t20.json`), e qualquer diferença precisa constar em `MUDANCAS` com o motivo;
  - o super admin só tem `platform.admin`;
  - o guard em execução: sem sessão vai para o login, usuário desativado vai para o login, perfil do banco diferente do token é recusado e o contexto é devolvido certo.
- **`occurrence-resolution.test.ts` (13 casos):**
  - ação vazia ou curta é recusada sem tocar no banco;
  - responsável, data/hora e auditoria são gravados;
  - ocorrência já resolvida não é resolvida de novo, e numa disputa simultânea o segundo não grava;
  - a evidência é guardada como `RESOLUTION`, e a que não é foto é recusada antes do upload;
  - reabrir guarda a resolução anterior;
  - **nenhum outro arquivo grava `resolved_by`/`resolution_notes`**.
- **E2E `t20-ocorrencia-rastreavel.spec.ts`:** a Manutenção registra pela área dela; o operador acha pela busca e resolve (texto curto é barrado pelo navegador); a linha do tempo mostra a ação; a Manutenção vê "Resolvida por … : …".
- **Mutações feitas à mão** para conferir que os testes pegam erro: dar `reading.create` à Manutenção derruba exatamente o teste de `registrarLeitura`.

## Testes executados
| Verificação | Resultado |
|---|---|
| `vitest` | 520/520 |
| `tsc --noEmit` | 0 erros |
| `eslint` | 193 / 97 (antes 194 / 100) |
| E2E (smoke, T-11, T-12, T-15, T-16, T-18, logout, fluxo do operador, T-20) | 21/21 |
| Runtime T-05, T-06, T-10, T-13, T-16, T-18 | iguais à Fase 2 |
| Runtime T-17 | igual, mais 2 ocorrências criadas pelo E2E da T-20 que contêm "bomba" (dado de teste) |
| Runtime `t20.py` / `t20b.py` | tabelas acima |

Observação de ambiente: o Prisma Client local foi regenerado com `--no-engine`. É só para os testes unitários neste ambiente sem o motor nativo e não muda nada no repositório.

## Resultado
Existe uma única tabela de permissões, e o teste mostra qualquer mudança nela. Perfil trocado e usuário desativado valem na hora. Nenhuma ocorrência é encerrada sem dizer quem resolveu, quando e o que foi feito.

## Riscos
- **Uma consulta a mais por action** (`getActor`). Substitui a busca por e-mail que a maioria já fazia; nas actions que não buscavam, é uma consulta a mais.
- **Sem permissão, a resposta agora é sempre `/acesso-negado`.** Antes, alguns casos mandavam para o login e outros davam erro 500. Os formulários que mostravam a mensagem na tela continuam mostrando.
- **Texto mínimo da resolução passou de 5 para 10 caracteres.** Uma resolução curta como "OK feito" agora é recusada.
- **O gestor fica com acesso amplo:** registra leitura, mexe no estoque e resolve. É a decisão 1. A rastreabilidade vem da auditoria e do responsável gravado em cada registro.
- A Manutenção ainda **não tem tela de detalhe** da ocorrência. Ela vê a lista com o andamento e quem resolveu, e comenta só se outra tela for criada.
- A migration `20261008000000` precisa ir para produção antes do código (coluna `kind`). Ela é aditiva e tem valor padrão.

## Rollback
`git revert 6e0702c a91ee8a 4bce6f0 db79d01`. A coluna `kind` pode ficar no banco sem efeito.

## Pendências
- **Auditoria da passagem de turno** (achado da Fase 2): entra na T-25, junto com a camada de domínio.
- **Funções internas exportadas de arquivo `'use server'`** (`sendPushToRole`/`sendPushToUsers`): T-21. Estão marcadas no teste como `INTERNAS_T21`.
- **Validação do `status` de `atualizarStatusCorretiva`**: T-21. Hoje o banco já barra valor inválido (T-19).
- As páginas ainda validam perfil por conta própria (`session.user.role` nos `page.tsx`). O proxy e as actions já cobrem; padronizar entra na T-27.
