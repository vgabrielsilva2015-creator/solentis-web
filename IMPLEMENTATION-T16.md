# IMPLEMENTATION-T16 — Números em português

**Branch:** `fix/t16-number-ptbr` (sobre `fix/t15-offline-queue`)
**Commit:** `09357c3` — `fix(forms): accept pt-BR decimal numbers with Portuguese messages`

## Objetivo
Aceitar `7,2` e `7.2` em todo campo numérico, com mensagens de erro em português.

## Problema original
Contraprova executada no harness, com as mesmas chamadas antes e depois:

| Entrada | Antes | Depois |
|---|---|---|
| Leitura "7,2" | erro **"Invalid input: expected number, received NaN"** | gravada 7.2 |
| Saída de estoque "2,5" kg | **gravada 2** (sem aviso) | gravada 2.5 |
| Contagem "7,25" | **gravada 7** | gravada 7.25 |
| Análise "6,85" | "Informe o valor medido" (a vírgula zerava o valor) | gravada 6.85 |
| Leitura "sete" | erro em inglês | "Número inválido. Use vírgula ou ponto para os decimais, por exemplo 7,2." |
| Saída vazia | "Quantidade inválida" | "Informe a quantidade." |

Além disso:
- o custo real da OS ia cru para o banco, e "1.500,00" quebrava a gravação;
- os campos `type="number"` descartavam a vírgula em alguns navegadores e limitavam as casas decimais pelo `step`.

## Causa raiz
Cada action convertia número de um jeito: `Number`, `parseFloat` (que corta na vírgula) ou `parseInt`. Não havia uma regra única.

## Alterações realizadas
- **`src/lib/number-ptbr.ts`:**
  - `parseNumeroBR` aceita `7,2`, `7.2`, `1.234,5`, `1,234.5`, `1.234.567` e `1e-3`, e recusa texto, `7,2,3` e milhar mal formado;
  - com um único separador, ele é tratado como decimal (`1.234` = 1,234, o caso comum em leitura de campo);
  - `numeroOuNaN` serve para os cálculos na tela.
- **`src/lib/zod-ptbr.ts`:** `numeroBR` e `numeroBROpcional`, com mensagens em português para obrigatório, inválido, inteiro, mínimo, máximo e positivo.
- **Aplicado em 10 actions:**
  - leituras e análises;
  - estoque: saída, contagem e entrada;
  - produtos (estoque mínimo) e parâmetros (limites);
  - equipamentos: frequência, custo estimado e custo real;
  - turnos (tempo de passagem), prazos de ocorrência e ordem dos templates.
- **Telas:** 19 campos decimais trocaram `type="number"` por texto com `inputMode="decimal"`, que continua abrindo o teclado numérico. A pré-visualização de limite e de estoque negativo usa o mesmo parser do servidor.

## Arquivos modificados
`src/lib/number-ptbr.ts` (novo), `src/lib/zod-ptbr.ts` (novo), 10 arquivos `actions.ts`, 16 componentes de formulário, `src/lib/__tests__/number-ptbr.test.ts` (novo), `tests/t16-numeros.spec.ts` (novo).

## Testes
- **Unitários: 36 casos**, com 18 formatos aceitos, 11 recusados, a regressão "2,5 ≠ 2", as mensagens do Zod (nenhuma em inglês) e inteiro/mínimo/máximo/opcional.
- **Guarda:** o teste falha se alguma action usar `Number`, `parseFloat` ou `parseInt` dentro de `z.preprocess`. No código anterior ele aponta as conversões antigas.
- **E2E (3):**
  - leitura "14,5" fica vermelha (fora do limite), "7,2" fica verde e é gravada;
  - "7,2,1" é barrado pelo navegador, e "." chega ao servidor e volta "Número inválido" em português;
  - o campo de saída de estoque aceita "2,5".

| Verificação | Resultado |
|---|---|
| `vitest` | 333/333 |
| `tsc --noEmit` | 0 erros |
| `eslint` | 196 / 100 |
| Smoke + T-15 E2E | ok |

## Resultado
O operador digita do jeito brasileiro, e o valor gravado é o que ele digitou. A gravação silenciosa errada no estoque acabou.

## Riscos
- `1.234` é lido como 1,234, não como mil e duzentos e trinta e quatro. Para milhar, é preciso digitar `1.234,0` ou `1234`. Isso está documentado no código, e o erro oposto (ler 1,234 como 1234) seria pior em análise.
- Lançamentos antigos de estoque com vírgula **já gravados truncados** (2,5 → 2) continuam errados no banco. Não há como saber quais foram. A contagem física corrige o saldo.

## Rollback
`git revert 09357c3`.

## Pendências
- `atualizarStatusCorretiva` aceita o `status` como veio do cliente (só tipado no TypeScript): entra na T-21.
