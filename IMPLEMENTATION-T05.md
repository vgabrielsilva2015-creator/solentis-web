# IMPLEMENTATION-T05 — Posse de referências por planta (cross-tenant)

**Branch:** `fix/t05-tenant-ownership` (sobre `fix/t04-production-checklist`)
**Commit:** `853be1f` — `fix(security): enforce tenant ownership`

## Objetivo
Um usuário da planta A não pode gravar nenhuma referência a dados da planta B.

## Problema original
As FKs do banco são globais. `readings.collection_point_id`, por exemplo, aceita o id de um ponto de qualquer planta. Várias server actions gravavam o id recebido do formulário sem conferir de qual planta ele era. Na Passada 1 isso foi demonstrado com análise e ocorrência (cenários 7 e 8). Na T-05 o levantamento completo encontrou **22 gravações** nessa situação, em 13 actions.

## Causa raiz
RC-2: o isolamento depende de convenção. O guardião estático só checava se `tenant_id` aparecia em algum lugar da chamada. Não olhava as FKs gravadas e aceitava `tenant_id` até dentro de `select`.

## Alterações realizadas
- **`src/lib/ownership.ts` (novo)**
  - `checkOwnership(tenantId, refs)` devolve a mensagem de erro, ou `null` se tudo pertence à planta. É usado nas actions que devolvem `{ error }`.
  - `assertOwned(tenantId, refs)` lança `OwnershipError`, que é um `UserFacingError`. É usado nas actions que lançam erro.
  - Cada referência é conferida com `findFirst({ id, tenant_id })`. Os filtros extras (`is_active`, `role`) não conseguem trocar o tenant.
  - Um id que não é string é recusado sem consultar o banco. Um campo opcional vazio é aceito.
- **Actions corrigidas:**

| Action | Referências conferidas |
|---|---|
| `registrarAnalise` | ponto de coleta |
| `registrarOcorrencia` | ponto de coleta (opcional) |
| `criarEquipamento` / `editarEquipamento` | categoria, responsável |
| `registrarCorretiva` (técnico) | equipamento (vinha como argumento, sem nenhuma checagem) |
| `registrarEntrada` | produto |
| `registrarSaida` / `registrarContagem` | produto |
| `toggleDaySchedule` | turno |
| `saveShiftScale` / `addShiftTask` | turno, operador |
| `confirmarPassagem` / `assumirPosto` | turno a abrir |
| `createMonitoringSchedule` | ponto, parâmetro |
| templates de tarefa | operador (troquei o helper local pelo `checkOwnership`, com o mesmo comportamento) |

  - Em `createMonitoringSchedule`, o autor passou a ser o usuário logado. Antes era gravado "o primeiro usuário qualquer da planta", que é uma referência errada do mesmo tipo.
- **Guardião (`tenant-isolation.test.ts`), 7 testes novos:**
  1. `tenant_id` tem que estar **dentro do `where`** no nível de topo. Aparecer no `select` ou no `where` de um `include` não conta mais.
  2. Toda FK gravada a partir de entrada do cliente (`parsed.data.*`, `formData.get`, parâmetro de server action, ou variável derivada deles) precisa de `checkOwnership`/`assertOwned`, ou de uma consulta com `id` + `tenant_id` antes da escrita. As FKs são lidas do `schema.prisma`.
  3. Nenhum `tenant_id` literal no código.
  4. SQL cru sempre com `tenant_id`.
  5. O guardião testa a si mesmo com código de exemplo ruim e bom (3 testes), para garantir que continua detectando os casos.
- **`scripts/ops/cross-tenant-references.sql` (novo, somente leitura):** checa as 62 FKs e lista as que têm linhas com tenant diferente do registro referenciado. Serve para descobrir se a falha já foi usada em produção.

## Arquivos modificados
`src/lib/ownership.ts` (novo), `src/lib/__tests__/ownership.test.ts` (novo), `src/lib/__tests__/tenant-isolation.test.ts`, `scripts/ops/cross-tenant-references.sql` (novo) e 10 arquivos `actions.ts`: tecnico/analises, tecnico/equipamentos, operador/ocorrencias, operador/estoque, operador/turnos, gestor/produtos-quimicos, gestor/turnos, gestor/turnos/escala, gestor/turnos/[id]/tarefas-padrao, gestor/(sistema)/cronograma/novo.

## Testes criados
- `ownership.test.ts` (13 casos):
  - mesma planta, outra planta, id inexistente, obrigatório e opcional, valor não-string;
  - filtros extras e a tentativa de trocar o tenant pelo filtro;
  - ordem das mensagens, concordância de gênero, tenant vazio e `assertOwned`.
- Guardião: 7 testes novos, descritos acima.
- **Contraprova estática:** o guardião novo rodado sobre o código **anterior** aponta 22 gravações sem conferência. No código corrigido aponta 0.

## Testes executados
| Verificação | Resultado |
|---|---|
| `vitest` | 219/219 (16 arquivos; eram 199) |
| `tsc --noEmit` | 0 erros |
| `eslint` (projeto) | 196 erros / 102 avisos, sem mudança. Os 2 erros nos arquivos tocados (`prefer-const` em `postCommitHooks`) já existiam e não são de linhas alteradas. |
| Build (harness) | ok |
| Smoke E2E (4 perfis, 47 telas) | 4/4 |
| **Runtime cross-tenant** (11 vetores, usuários da planta A usando ids da planta B) | **antes:** os 11 gravaram (7 grupos de dados com vazamento). **depois:** os 11 foram recusados, com 0 linhas novas apontando para a planta B. Os controles com ids da própria planta continuam gravando. |
| `cross-tenant-references.sql` no banco local | executa; encontra as 2 linhas que sobraram do teste da Passada 1 |

Detalhe do runtime: as actions que devolvem `{ error }` mostram a mensagem em português, por exemplo "Ponto de coleta inválido ou não autorizado." As que lançam erro (escala, cronograma, agenda do turno) respondem 500. O log registra `OwnershipError: Turno não encontrado.` e nada é gravado.

## Resultado
Os 11 vetores de escrita cross-tenant identificados foram bloqueados e comprovados em execução. O guardião passou a impedir que novas actions reintroduzam o problema.

## Riscos
- O guardião é uma análise estática por heurística. Valores que vêm de um laço sobre dados do cliente (por exemplo `r.parameterId` na importação de laudos) não são classificados automaticamente. Nesse caso a action já filtra pelo tenant (`paramMap`), mas um caso novo parecido passaria. A defesa em profundidade é o RLS (T-14).
- Nas actions que lançam erro (escala, cronograma), a mensagem em produção chega genérica pelo Next e a tela usa `alert`. A gravação é bloqueada, mas a UX desses fluxos fica para a T-21.
- Editar um equipamento cujo responsável é de outra planta passa a falhar. Isso só acontece se a falha tiver sido explorada antes, e o SQL acima mostra esses casos.

## Rollback
`git revert 853be1f`. Não há migração de banco.

## Pendências
1. **Rodar `scripts/ops/cross-tenant-references.sql` em produção** (somente leitura). Qualquer linha listada precisa de análise manual, sem apagar nada.
2. `createMonitoringSchedule` ainda não valida `sample_type`/`frequency` com Zod (T-21).
3. Mensagens das actions que lançam erro (T-21).
4. RLS no banco como segunda barreira (T-14).
