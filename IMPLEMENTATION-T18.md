# IMPLEMENTATION-T18 — Bugs de fluxo do operador e do cronograma

**Branch:** `fix/t18-flow-bugs` (sobre `fix/t17-search`)
**Commits** (um por bug):

| Commit | Bug | Mensagem |
|---|---|---|
| `3d80175` | B-11 | `fix(shift): handover timeout computed on read and late confirmation allowed` |
| `4293148` | B-08 (resto) | `fix(notifications): role-safe links and overdue handover alert for managers` |
| `e6c56a2` | P-16 | `fix(readings): link a reading only to the shift opened by its author` |
| `3724753` | B-12 (e B-05) | `fix(ui): single back link on new reading screen` |
| `e8d71b7` | B-06 | `fix(dashboard): point filter applies to all open occurrence counts` |
| `e82f43d` | B-07 | `fix(schedule): validate monitoring schedule with Portuguese messages` |
| `0868096` | — | `docs: record shift handover and reading-shift rules (T-18)` |

## Objetivo
Corrigir P-16, B-05, B-06, B-07, B-11, B-12 e o restante da B-08 (links das notificações). Cada bug deveria ter um teste que falha antes e passa depois.

## Problema original
Contraprova com o mesmo script (`t18.py`) rodado no código antigo e no novo, no banco local `rls_stage`:

| Cenário | Antes | Depois |
|---|---|---|
| **B-11** Entrante abre `/operador/turnos` com passagem vencida | o GET **grava `TIMED_OUT`** no banco | nada é gravado (continua `PENDING`) |
| A passagem vencida aparece para confirmar? | não | sim, com o selo "Prazo esgotado" |
| Confirmar a passagem vencida | "Esta passagem já foi encerrada." Turno **preso em `HANDOVER_PENDING`** | confirmada, marcada como atrasada, turno `CLOSED` |
| Linha antiga já gravada `TIMED_OUT` | não confirma, turno preso | confirma, turno `CLOSED` |
| Dois entrantes confirmam ao mesmo tempo | **as duas respostas "OK"** | uma "OK" e a outra "já foi confirmada por outro operador" |
| Sino do gestor avisa da passagem vencida? | não | sim |
| **P-16** Operador sem turno registra leitura | entra no **turno do outro operador** | sem vínculo (`null`) |
| Operador dono do turno registra leitura | no turno dele | no turno dele |
| **B-06** Dashboard filtrado num ponto sem ocorrência (há uma crítica em outro ponto) | 0 abertas, mas status da ETE **DANGER** | 0 abertas, status **OK** |
| **B-07** Tipo "HACK", frequência "YEARLY", semanal sem dia | **gravados** | recusados com mensagem em português |
| Dia da semana "abc" | **erro 500** | "Dias da semana: use números inteiros de 0 a 6." |
| Mensal "1, 15" | erro 500 (e a tela não tinha campo de dias do mês) | gravado com dias {1, 15} |
| **B-12** Links de voltar na Nova leitura | 2 (E2E falha: "Expected 1, Received 2") | 1 |

## Causa raiz
- **B-11:** o timeout foi pensado como "lazy", mas foi implementado como uma escrita na renderização, e `TIMED_OUT` virou um estado final. O briefing (seção E) diz o contrário: o turno só fecha com a confirmação do entrante, e o timeout serve para **alertar o gestor**.
- **P-16:** havia um `?? findFirst({ status: 'OPEN' })` sem filtro de autor.
- **B-06:** o `${pointSql}` estava dentro do `FILTER` de uma das três contagens, e não no `WHERE`.
- **B-07:** a action lia o `FormData` com `as string` e `.map(Number)`, sem validação.
- **B-12:** o `BackButton` da página e o link do formulário foram criados em momentos diferentes.

## Alterações realizadas
**B-11 (passagem de turno)**
- `src/lib/handover-status.ts` (novo): calcula o status efetivo (`PENDING`, vencida, `CONFIRMED`, "confirmada com atraso") a partir de `timeout_at` e `confirmed_at`.
- `aplicarTimeouts` foi removida.
- `confirmarPassagem`:
  - aceita `PENDING` e `TIMED_OUT`;
  - confirma com `updateMany` condicionado ao status e confere `count === 1`.
- A mesma regra vale em todos os lugares:
  - a lista de turnos;
  - a tela de confirmação;
  - a contagem do dashboard do operador (que também perdeu o filtro `date: today`, que escondia a passagem do turno da noite aberto na véspera);
  - o detalhe do gestor ("Confirmada com atraso").

**B-08 (notificações)**
- `notifications.ts` usa as rotas da busca (`hrefFor`), e o perfil sem tela de ocorrência ou equipamento não recebe o item.
- `src/lib/notification-links.ts` (novo) define os destinos de tarefa e de passagem.
- O gestor recebe "Passagem sem confirmação" no sino, com um ícone próprio.

**P-16:** a leitura só é vinculada ao turno aberto por quem registrou. Sem turno próprio, `shift_instance_id = null`. Decidi **permitir sem vínculo** em vez de bloquear, para que a medição em campo não se perca.

**B-06:** o `pointSql` foi movido para o `WHERE` das três contagens.

**B-07**
- `src/lib/monitoring-schedule.ts` (novo) com o Zod:
  - enums de tipo e frequência;
  - dias da semana de 0 a 6 e dias do mês de 1 a 31, sem repetição e em ordem;
  - semanal exige pelo menos um dia;
  - mensal exige dias do mês.
- O erro volta para o formulário (`?erro=`) em um aviso.
- Novo campo "Dias do mês (só para Mensal)".

**B-12:** o link duplicado do formulário foi removido.

**B-05:** nenhuma alteração. Veja abaixo.

## B-05 — não reproduzido (correção do registro da auditoria)
A captura da Passada 1 que mostrava o botão "Registrar leitura" sob a barra inferior era um **screenshot `fullPage`**. Nesse modo, o Playwright desenha a barra fixa na altura da primeira tela, e não no fim da página. Medindo num Pixel 7 emulado (412×915) e rolando até o fim, **no código antigo**:
- base do botão: 719 px;
- topo da barra: 774 px;
- o toque no centro do botão chega ao botão.

O `pb-24` do layout já resolve. Deixei o E2E como guarda de regressão (passa antes e depois). Em aparelho real, inclusive com o PWA instalado e o teclado aberto: **NÃO VERIFICADO**. Observação: a classe `pb-safe` da barra não existe no CSS. Hoje isso não faz diferença, porque o app não usa `viewport-fit=cover`.

## Arquivos modificados
- **Novos:** `src/lib/handover-status.ts`, `src/lib/notification-links.ts`, `src/lib/monitoring-schedule.ts`.
- **Alterados:**
  - `src/app/operador/turnos/{actions.ts,page.tsx,confirmar/page.tsx}`;
  - `src/app/operador/dashboard/page.tsx`;
  - `src/app/gestor/turnos/tarefas/[id]/page.tsx`;
  - `src/app/actions/notifications.ts`, `src/components/ui/notification-bell.tsx`;
  - `src/app/operador/leituras/actions.ts`, `src/app/operador/leituras/novo/reading-form.tsx`;
  - `src/app/gestor/dashboard/page.tsx`;
  - `src/app/gestor/(sistema)/cronograma/novo/{actions.ts,page.tsx}`;
  - `CLAUDE.md`.
- **Testes:** `src/lib/__tests__/t18-{passagem,notificacoes,leitura-turno,dashboard-ponto,cronograma}.test.ts`, `tests/t18-fluxo.spec.ts`.

## Testes criados
- **Unitários (31):**
  - status da passagem (dentro do prazo, vencida, `TIMED_OUT` antigo, confirmada com atraso);
  - **nenhuma `page.tsx`/`layout.tsx` grava no banco**;
  - confirmação condicional;
  - as telas usam a mesma regra;
  - `pointSql` no `WHERE`;
  - leitura só no turno do autor;
  - schema do cronograma (enums, dias inválidos, semanal/mensal, mensagens em português; o teste pegou uma mensagem em inglês do Zod antes do commit);
  - todo link de notificação é permitido ao perfil e a tela existe.
- **E2E (2):** B-05 (Pixel 7) e B-12.
- **Runtime:** `t18.py`, com os resultados da tabela acima.

## Testes executados
| Verificação | Resultado |
|---|---|
| `vitest` | 377/377 |
| `tsc --noEmit` | 0 erros |
| `eslint` | 194 / 100 (antes 196 / 100) |
| Smoke E2E | 4/4 |
| E2E T-18 | 2/2 (antes: B-12 falhava) |
| Runtime `t18.py` | todos os cenários corretos (antes: 9 errados) |

## Resultado
- Passagem vencida não trava mais o turno: o entrante confirma e o gestor é avisado.
- Abrir uma tela não grava mais no banco.
- A leitura não cai no turno de outra pessoa.
- O filtro de ponto do dashboard ficou coerente.
- O cronograma só grava o que a escala consegue mostrar.

## Riscos
- **Mudança de regra:** passagem vencida agora pode ser confirmada (antes, na prática, não podia). É o que o briefing descreve, e a confirmação tardia fica registrada (`confirmed_at > timeout_at`).
- Em produção, turnos que já estão presos em `HANDOVER_PENDING` com `TIMED_OUT` passam a aparecer para confirmação. Isso é o desejado, mas o operador vai ver passagens antigas na primeira vez. **NÃO VERIFICADO** quantas existem. Antes do deploy, rode só leitura: `SELECT count(*) FROM shift_handovers WHERE status='TIMED_OUT'`.
- Leituras antigas que caíram no turno de outro operador continuam assim. Não há como distinguir com segurança, e nada foi alterado.
- Cronogramas antigos com tipo ou frequência inválidos continuam no banco. A tela da escala ignora o que não reconhece.

## Rollback
`git revert 0868096 e82f43d e8d71b7 3724753 e6c56a2 4293148 3d80175`. Nenhuma migration nesta tarefa.

## Pendências
- O dashboard do gestor ("dias da semana vazio = todos") e a escala ("DAILY sempre") interpretam `days_of_week` de jeitos diferentes para a frequência diária. Fica para a T-21, junto com as outras regras de domínio.
- B-05 em aparelho real (PWA instalado, teclado aberto): validar no QA de campo.
