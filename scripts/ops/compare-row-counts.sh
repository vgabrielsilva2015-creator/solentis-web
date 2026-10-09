#!/usr/bin/env bash
# T-07 — Compara a contagem EXATA de linhas de todas as tabelas do schema public
# entre dois bancos (ex.: produção x restore de teste). Somente leitura nos dois.
#
# Uso:
#   scripts/ops/compare-row-counts.sh "$ORIGEM_URL" "$RESTORE_URL"
#
# As URLs ficam só no ambiente do terminal; nada é impresso além de nomes de
# tabela e contagens. Use a conexão DIRETA (porta 5432), não o pooler.
# Saída: tabela | origem | restore | OK/DIFERENTE. Código 1 se houver diferença.
# Atenção: em produção com escrita ativa, a origem muda durante a comparação;
# compare contra o mesmo instante do backup (ou aceite diferença só nas tabelas
# de log: audit_logs, login_attempts).
set -euo pipefail
SRC="${1:?informe a URL da origem}"; DST="${2:?informe a URL do restore}"

count_all() {
  psql "$1" -At -v ON_ERROR_STOP=1 <<'SQL'
SELECT format('SELECT %L || ''|'' || count(*) FROM %I.%I;', tablename, schemaname, tablename)
FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename
\gexec
SQL
}

out=$(join -t'|' -a1 -a2 -e 'AUSENTE' -o '0,1.2,2.2' \
  <(count_all "$SRC" | sort) <(count_all "$DST" | sort) |
  while IFS='|' read -r t a b; do
    if [ "$a" = "$b" ]; then s=OK; else s=DIFERENTE; fi
    printf '%-40s %12s %12s  %s\n' "$t" "$a" "$b" "$s"
  done)
printf '%-40s %12s %12s\n' tabela origem restore
echo "$out"
if grep -q DIFERENTE <<<"$out"; then echo "RESULTADO: há diferenças"; exit 1; fi
echo "RESULTADO: contagens idênticas"
