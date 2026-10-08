# Camada de domínio (T-25)

Padrão para tirar regra de negócio das Server Actions, **um módulo de cada vez e só quando
ele já está sendo mexido por outra tarefa**. Nada de migrar módulo parado.

```
src/server/<módulo>/schema.ts   entradas validadas (Zod) — fora do 'use server', que só exporta funções
src/server/<módulo>/service.ts  regras de gravação; recebe tenantId/userId explícitos; sem sessão,
                                sem FormData, sem next/*, sem revalidatePath
src/app/.../actions.ts          fina: quem pode (guard) → valida → posse → serviço → atualiza telas
```

Regras do serviço: tenant explícito em toda consulta (o guardião de isolamento continua valendo e
**não enxerga `...spread`** — escreva `tenant_id` inline); movimentação de estoque sempre depois de
`lockProduct` na mesma transação (T-13); devolve `{ ok }` / `{ ok: false, error }` em vez de lançar
para erro esperado.

## Migrados
| Módulo | Serviço | Actions que ficaram finas |
|---|---|---|
| Estoque (T-13) | `src/server/estoque/service.ts` | `registrarSaida`, `registrarContagem`, `registrarEntrada` |
| Leituras (T-15/T-18) | `src/server/leituras/service.ts` | `registrarLeitura` |
| Dashboard (T-23) | `src/server/dashboard/queries.ts` | (já estava) |
| Resolução de ocorrência (T-20) | `src/server/occurrences/resolve.ts` | (já estava) |

## Candidatos (quando alguém for mexer neles)
Passagem de turno (`operador/turnos/actions.ts`), ocorrências (criação), análises
(`tecnico/analises/actions.ts`), equipamentos/manutenção.

## Como provar que a extração não mudou comportamento
Escreva o teste de integração **no nível da action** (contrato público), rode contra o código antigo
(`git worktree` do commit anterior) e depois contra o novo. Foi o que a T-25 fez
(`src/server/__tests__/p0-dominio-contrato.int.test.ts`: passa nos dois).
