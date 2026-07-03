import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { getTenantId } from '@/lib/tenant'

const PAGE_SIZE  = 25

// Nomes amigáveis para as tabelas auditadas
const TABLE_LABELS: Record<string, string> = {
  users:              'Usuários',
  quality_parameters: 'Parâmetros',
  occurrences:        'Ocorrências',
  shift_handovers:    'Passagens de Turno',
}

const ACTION_CONFIG = {
  CREATE: { label: 'Criação',  classes: 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50' },
  UPDATE: { label: 'Edição',   classes: 'bg-sky-950/60     text-sky-400     border-sky-900/50'     },
  DELETE: { label: 'Exclusão', classes: 'bg-red-950/60     text-red-400     border-red-900/50'     },
} as const

function formatDatetime(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function buildUrl(
  base: Record<string, string>,
  overrides: Record<string, string | number>,
): string {
  const p = new URLSearchParams({ ...base, ...Object.fromEntries(Object.entries(overrides).map(([k, v]) => [k, String(v)])) })
  return `/gestor/auditoria?${p.toString()}`
}

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{
    userId?:     string
    tableName?:  string
    dataInicio?: string
    dataFim?:    string
    page?:       string
  }>
}) {
  const sp         = await searchParams
  const pageNum    = Math.max(1, parseInt(sp.page ?? '1', 10))
  const userId     = sp.userId     ?? ''
  const tableName  = sp.tableName  ?? ''
  const dataInicio = sp.dataInicio ?? ''
  const dataFim    = sp.dataFim    ?? ''

  // Filtros ativos
  const where = {
    tenant_id: (await getTenantId()),
    ...(userId    && { user_id:    userId    }),
    ...(tableName && { table_name: tableName }),
    ...(dataInicio || dataFim ? {
      timestamp: {
        ...(dataInicio && { gte: new Date(dataInicio + 'T00:00:00') }),
        ...(dataFim    && { lte: new Date(dataFim    + 'T23:59:59') }),
      },
    } : {}),
  }

  const [logs, total, users] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { timestamp: 'desc' },
      take:    PAGE_SIZE,
      skip:    (pageNum - 1) * PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.user.findMany({
      where:   { tenant_id: (await getTenantId()) },
      select:  { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const totalPages = Math.ceil(total / PAGE_SIZE)
  const activeFilters = { userId, tableName, dataInicio, dataFim }

  return (
    <main className="px-6 py-8 space-y-6 max-w-6xl">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Auditoria</h1>
        <p className="text-sm text-muted-foreground">Histórico de todas as mutações críticas do sistema.</p>
      </div>

      {/* ── Filtros ──────────────────────────────────────────────────────────── */}
      <form method="GET" action="/gestor/auditoria" className="flex flex-wrap gap-3 items-end">
        {/* Usuário */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Usuário</label>
          <select
            name="userId"
            defaultValue={userId}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Todos</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>

        {/* Entidade */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Entidade</label>
          <select
            name="tableName"
            defaultValue={tableName}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Todas</option>
            {Object.entries(TABLE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Data início */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">De</label>
          <input
            type="date"
            name="dataInicio"
            defaultValue={dataInicio}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Data fim */}
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Até</label>
          <input
            type="date"
            name="dataFim"
            defaultValue={dataFim}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-secondary px-4 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          Filtrar
        </button>

        {(userId || tableName || dataInicio || dataFim) && (
          <Link
            href="/gestor/auditoria"
            className="rounded-md border border-border px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Limpar
          </Link>
        )}
      </form>

      {/* Contagem */}
      <p className="text-xs text-muted-foreground">
        {total === 0
          ? 'Nenhum registro encontrado.'
          : `${total} registro${total !== 1 ? 's' : ''} — página ${pageNum} de ${Math.max(1, totalPages)}`}
      </p>

      {/* ── Tabela ───────────────────────────────────────────────────────────── */}
      {logs.length > 0 && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Data/hora</th>
                <th className="px-4 py-3 font-medium">Usuário</th>
                <th className="px-4 py-3 font-medium">Ação</th>
                <th className="px-4 py-3 font-medium">Entidade</th>
                <th className="px-4 py-3 font-medium">Alterações</th>
                <th className="px-4 py-3 font-medium">Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.map((log) => {
                const actionCfg = ACTION_CONFIG[log.action as keyof typeof ACTION_CONFIG]
                const tableLabel = TABLE_LABELS[log.table_name] ?? log.table_name
                let before: Record<string, unknown> | null = null
                let after:  Record<string, unknown> | null = null
                try { if (log.before) before = JSON.parse(log.before) } catch { /* ignora */ }
                try { if (log.after)  after  = JSON.parse(log.after)  } catch { /* ignora */ }

                return (
                  <tr key={log.id} className="hover:bg-muted/40 transition-colors align-top">
                    {/* Data/hora */}
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">
                      {formatDatetime(new Date(log.timestamp))}
                    </td>

                    {/* Usuário */}
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">
                      {log.user?.name ?? <span className="text-muted-foreground">Sistema</span>}
                    </td>

                    {/* Ação */}
                    <td className="px-4 py-3">
                      {actionCfg ? (
                        <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${actionCfg.classes}`}>
                          {actionCfg.label}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">{log.action}</span>
                      )}
                    </td>

                    {/* Entidade */}
                    <td className="px-4 py-3 text-foreground whitespace-nowrap text-xs">
                      {tableLabel}
                      <br />
                      <span className="text-muted-foreground font-mono">{log.record_id.slice(0, 8)}…</span>
                    </td>

                    {/* Alterações — expansível via <details> (sem JS) */}
                    <td className="px-4 py-3 max-w-xs">
                      {(before || after) ? (
                        <details className="cursor-pointer">
                          <summary className="text-xs text-muted-foreground hover:text-foreground select-none">
                            Ver alterações
                          </summary>
                          <div className="mt-2 space-y-1.5 text-xs font-mono">
                            {before && (
                              <div>
                                <p className="text-muted-foreground mb-0.5">Antes:</p>
                                <pre className="whitespace-pre-wrap text-muted-foreground bg-muted rounded p-1.5">
                                  {JSON.stringify(before, null, 2)}
                                </pre>
                              </div>
                            )}
                            {after && (
                              <div>
                                <p className="text-muted-foreground mb-0.5">Depois:</p>
                                <pre className="whitespace-pre-wrap text-emerald-400 bg-muted rounded p-1.5">
                                  {JSON.stringify(after, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </details>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Justificativa */}
                    <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px]">
                      {log.justification ?? <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Paginação ────────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center gap-3 text-sm">
          {pageNum > 1 ? (
            <Link
              href={buildUrl(activeFilters, { page: pageNum - 1 })}
              className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted transition-colors"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="rounded-md border border-border px-3 py-1.5 text-muted-foreground cursor-not-allowed">
              ← Anterior
            </span>
          )}

          <span className="text-muted-foreground">
            {pageNum} / {totalPages}
          </span>

          {pageNum < totalPages ? (
            <Link
              href={buildUrl(activeFilters, { page: pageNum + 1 })}
              className="rounded-md border border-border px-3 py-1.5 text-foreground hover:bg-muted transition-colors"
            >
              Próximo →
            </Link>
          ) : (
            <span className="rounded-md border border-border px-3 py-1.5 text-muted-foreground cursor-not-allowed">
              Próximo →
            </span>
          )}
        </div>
      )}
    </main>
  )
}
