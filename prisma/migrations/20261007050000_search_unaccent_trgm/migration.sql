-- T-17 — busca sem diferenciar maiúsculas nem acentos, e base para trigramas.
--
-- * unaccent: "Reator Biológico" é encontrado por "biologico".
-- * pg_trgm: só preparado (extensão e função). Os índices GIN de trigrama
--   entram quando o volume justificar (T-32), e o DDL pronto está em
--   docs/SEARCH.md e usa exatamente a expressão da consulta.
-- * As extensões ficam no schema "extensions" (padrão do Supabase).
-- * f_unaccent é IMMUTABLE para poder ser usada em índice de expressão.
-- Aditivo e idempotente.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.f_unaccent(text)
  RETURNS text
  LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
AS $func$
  SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$func$;
