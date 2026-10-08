# IMPLEMENTATION-T17 — Busca global

**Branch:** `fix/t17-search` (sobre `fix/t16-number-ptbr`)
**Commit:** `6154425` — `fix(search): accent and case insensitive search scoped by role`

## Objetivo
Busca que ignora maiúsculas e acentos, com links certos para cada perfil, respeitando o que cada um pode ver, e já preparada para `pg_trgm`.

## Problema original
- `contains` sensível a maiúsculas, e o termo era convertido para minúsculas. Resultado: **"bomba" não achava "Bomba"**, e "aeracao" não achava "Aeração". Na prática, quase nada era encontrado.
- Qualquer perfil buscava equipamentos e ocorrências.
- Os links eram genéricos (`/tecnico/equipamentos`, `/gestor/ocorrencias`): o operador caía em "acesso negado" e ninguém ia direto para o item encontrado.
- Erro 500 com mensagem em inglês.

## Causa raiz
A busca foi feita como protótipo, sem normalização de texto e sem considerar o perfil.

## Alterações realizadas
- **Migration `20261007050000_search_unaccent_trgm`:** extensões `unaccent` e `pg_trgm` no schema `extensions`, o padrão do Supabase, e a função `public.f_unaccent` (IMMUTABLE, para poder ser usada em índice). É aditiva e funcionou criada como dono não superusuário.
- **`/api/search`:**
  - exige sessão (401) e filtra pela planta;
  - compara `f_unaccent(lower(coluna))`;
  - escapa `%` e `_` digitados;
  - retorna até 5 resultados por tipo, com o equipamento ativo primeiro e a ocorrência mais recente primeiro;
  - também busca por número de série e categoria.
- **`src/lib/search.ts`:**

| Perfil | Busca | Link |
|---|---|---|
| Gestor | equipamentos, pontos, ocorrências | `/gestor/equipamentos/{id}`, `/gestor/pontos-de-coleta/{id}`, `/gestor/ocorrencias/{id}` |
| Técnico | equipamentos, ocorrências | `/tecnico/equipamentos/{id}`, `/tecnico/ocorrencias/{id}` |
| Operador | ocorrências | `/operador/ocorrencias/{id}` |
| Manutenção | equipamentos | `/manutencao/equipamentos/{id}` |

- A paleta (`Ctrl+K`) também passou a aparecer na área de manutenção.
- **`docs/SEARCH.md`:** o DDL dos índices de trigrama, pronto para quando o volume justificar (T-32), já com a mesma expressão da consulta.

## Arquivos modificados
`prisma/migrations/20261007050000_search_unaccent_trgm/migration.sql` (novo), `src/app/api/search/route.ts`, `src/lib/search.ts` (novo), `src/components/ui/command-menu.tsx`, `docs/SEARCH.md` (novo), `src/lib/__tests__/search.test.ts` (novo).

## Testes
**Runtime** (os mesmos termos antes e depois):

| Busca | Antes | Depois |
|---|---|---|
| gestor "acido" | nada | Bomba Dosadora de **Á**cido → `/gestor/equipamentos/{id}` |
| gestor "BOMBA" | nada | 2 bombas |
| gestor "aeracao" | nada | Tanque de **Aeração** (o da planta B não aparece) |
| gestor "decantador" | nada | ocorrência "Vazamento…" |
| gestor "sn-ab" (série "SN-ÁB-77") | nada | encontrado |
| gestor "100%" | nada | nada (o `%` é literal) |
| técnico "aeracao" | — | nada (técnico não busca pontos) |
| operador "bomba" | — | nada (operador não busca equipamentos) |
| operador "decantador" | — | → `/operador/ocorrencias/{id}`, abre **200** |
| manutenção "acido" | — | → `/manutencao/equipamentos/{id}`, abre 200 |
| sem sessão | redirect | redirect (307) |

**Unitários (13):**
- o que cada perfil busca;
- **todo link é permitido ao próprio perfil e a tela existe**;
- curingas escapados;
- limites de tamanho;
- a rota usa `f_unaccent`, exige sessão e filtra por tenant nas 3 consultas.

| Verificação | Resultado |
|---|---|
| `vitest` | 346/346 |
| `tsc --noEmit` | 0 erros |
| `eslint` | 196 / 100 |
| Smoke E2E | 4/4 |

Durante o trabalho, o portão de commit barrou um `;` dentro de comentário da migration, pela regra criada na T-09. Corrigi antes do commit.

## Resultado
A busca encontra o que o usuário digita, do jeito que ele digita, e leva direto ao item na tela do próprio perfil.

## Riscos
- Sem índice de trigrama, cada busca faz uma varredura filtrada por planta. Isso é suficiente para o volume atual, e o DDL dos índices está pronto.
- No Supabase, se as extensões já existirem em outro schema, o `CREATE EXTENSION IF NOT EXISTS` não move. Nesse caso `extensions.unaccent` precisaria apontar para o schema certo. Conferir no staging (passo 5 do `MIGRATIONS.md`).

## Rollback
`git revert 6154425`. A função e as extensões podem ficar no banco sem efeito.

## Pendências
Índices de trigrama, quando as métricas justificarem (T-32).
