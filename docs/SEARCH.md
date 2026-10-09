# Busca global (T-17)

- Rota: `GET /api/search?q=` (paleta `Ctrl+K`). Exige sessão e sempre filtra pela planta do usuário.
- Não diferencia maiúsculas nem acentos: `public.f_unaccent(lower(coluna)) LIKE public.f_unaccent(lower(termo))`. A função e as extensões `unaccent` e `pg_trgm` são criadas pela migration `20261007050000_search_unaccent_trgm`.
- O que cada perfil busca e para onde o resultado leva: `src/lib/search.ts` (`SEARCH_ROUTES`). Um teste garante que todo link abre para o próprio perfil e que a tela existe.

## Índices de trigrama (quando o volume justificar, T-32)
Hoje a busca lê no máximo 5 linhas por tipo, numa planta. Sem índice ela faz varredura sequencial filtrada por `tenant_id`, o que basta até dezenas de milhares de linhas. Quando o tempo da busca passar de ~200 ms (ver métricas da T-30), crie os índices numa migration própria, um por migration, porque `CONCURRENTLY` não roda em transação:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS occurrences_busca_trgm
  ON occurrences USING gin (public.f_unaccent(lower(description)) extensions.gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS equipment_busca_trgm
  ON equipment USING gin (public.f_unaccent(lower(name)) extensions.gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS collection_points_busca_trgm
  ON collection_points USING gin (public.f_unaccent(lower(name)) extensions.gin_trgm_ops);
```
A consulta já usa exatamente essas expressões, então não precisa mudar código.
