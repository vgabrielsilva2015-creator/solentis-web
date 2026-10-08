# IMPLEMENTATION-T13 — Corrida no estoque

**Branch:** `fix/t13-stock-race` (sobre `fix/t12-sw-cache`)
**Commit:** `26d94d4` — `fix(stock): serialize stock movements with row locking`

## Objetivo
Saídas e contagens simultâneas do mesmo produto não podem deixar o estoque negativo nem com ajuste errado.

## Problema original
O saldo é calculado na hora (soma das entradas menos soma das saídas). A saída lia o saldo, conferia "não pode ficar negativo" e só depois gravava, em passos separados.

Reproduzido no harness: com saldo de 10 kg, **10 saídas simultâneas de 3 kg foram todas aceitas e o saldo final ficou −20 kg**, nas 3 rodadas.

A contagem física tinha o mesmo problema: com 5 saídas e 5 contagens de "10 kg" ao mesmo tempo, o saldo final ficou −5.

## Causa raiz
"Ler, conferir e gravar" sem transação e sem trava. Pela N-01 da Passada 1, é o padrão de check-then-act.

## Alterações realizadas
- **`src/lib/stock-lock.ts` (novo):**
  - `lockProduct(tx, tenantId, productId)` faz `SELECT … FOR UPDATE` na linha do produto, filtrando por id **e** tenant;
  - `saldoAtual(tx, …)` calcula o saldo dentro da mesma transação.
- **`registrarSaida`:** trava, confere o saldo e grava numa única transação. Quem chega depois espera a primeira terminar e lê o saldo já atualizado.
- **`registrarContagem`:** o ajuste (diferença entre o contado e o calculado) é calculado com o produto travado.
- **`registrarEntrada`** (gestor e técnico): também trava, para não intercalar com uma contagem em andamento.
- Funciona com o pooler do Supabase em modo transação, porque a transação interativa usa uma conexão só.

## Arquivos modificados
`src/lib/stock-lock.ts` (novo), `src/app/operador/estoque/actions.ts`, `src/app/gestor/produtos-quimicos/actions.ts`, `src/lib/__tests__/stock-lock.test.ts` (novo).

## Testes
**Concorrência real** (harness, Postgres, 10 sessões HTTP em paralelo; script `t13.py`):

| Cenário | Antes | Depois |
|---|---|---|
| 10 saídas de 3 kg, saldo 10 (rodada 1) | 10 aceitas, saldo **−20** | 3 aceitas, saldo **1** |
| Rodada 2 | 10 aceitas, −20 | 3 aceitas, 1 |
| Rodada 3 | 10 aceitas, −20 | 3 aceitas, 1 |
| 5 saídas + 5 contagens "10 kg" simultâneas | saldo **−5** | saldo 1: coerente com a última contagem seguida de 3 saídas, nunca negativo |

**Estático:** `stock-lock.test.ts` exige `lockProduct(tx, …)` antes de toda gravação de entrada, saída ou contagem, na mesma função. Contraprova: no código anterior o teste falha.

| Verificação | Resultado |
|---|---|
| `vitest` | 276/276 |
| `tsc --noEmit` | 0 erros |
| `eslint` | 196 / 100 |
| Smoke E2E | 4/4 |

## Resultado
O estoque não fica mais negativo por concorrência, e a contagem física passa a refletir o saldo real no instante do ajuste.

## Riscos
- Movimentações do **mesmo** produto passam a ser processadas em fila. Cada uma leva milissegundos, então o efeito é desprezível no volume de uma ETE.
- O teste de concorrência ainda é um script do harness. Ele vira teste de integração automático na T-28.

## Rollback
`git revert 26d94d4`.

## Pendências
Portar o `t13.py` para a suíte de integração (T-28).
