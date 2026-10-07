#!/usr/bin/env bash
# T-09 — Compara a ESTRUTURA (tabelas, colunas, tipos, defaults, índices, FKs)
# de dois bancos Postgres, sem olhar dados. Somente leitura nos dois
# (usa pg_dump --schema-only).
#
# Uso típico (validar produção antes de marcar o baseline como aplicado):
#   1. criar um banco vazio de staging e aplicar as migrations:
#        DATABASE_URL="$STAGING_URL" npx prisma migrate deploy
#   2. comparar:
#        scripts/db/compare-schema.sh "$PROD_DIRECT_URL" "$STAGING_DIRECT_URL"
#
# Saída: diff unificado (linhas "-" só na 1ª URL, "+" só na 2ª). Exit 0 = iguais.
# Ignora: comentários, SET/SELECT de sessão, dono/privilégios, a tabela
# _prisma_migrations, políticas/RLS (tratadas na T-14) e a ordem das colunas.
set -euo pipefail
A="${1:?URL do banco A}"; B="${2:?URL do banco B}"

normalize() {
  pg_dump "$1" --schema-only --no-owner --no-privileges --no-comments \
    --schema=public --exclude-table=public._prisma_migrations 2>/dev/null |
  grep -vE '^(--|SET |SELECT pg_catalog|\\(un)?restrict )' |
  grep -vE 'ROW LEVEL SECURITY|CREATE POLICY' |
  sed -E 's/[[:space:]]+$//' |
  awk '
    # ordena as colunas de cada CREATE TABLE (a ordem física não importa aqui)
    /^CREATE TABLE / { print; intable=1; n=0; next }
    intable && /^\);/ { for (i=1;i<=n;i++) { sub(/,$/, "", cols[i]); print cols[i] | "sort" } close("sort"); print; intable=0; next }
    intable { cols[++n]=$0; next }
    { print }
  ' |
  awk 'BEGIN{RS=";\n"; ORS=";\n"} NF { gsub(/\n+/, "\n"); print }' |
  sort -u
}

if diff -u <(normalize "$A") <(normalize "$B") > /tmp/compare-schema.diff; then
  echo "RESULTADO: estruturas idênticas"
else
  cat /tmp/compare-schema.diff
  echo "RESULTADO: há diferenças (acima)"
  exit 1
fi
