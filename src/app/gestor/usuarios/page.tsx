import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'
import { UserSearch } from './user-search'

const ROLE_LABELS: Record<string, string> = {
  MANAGER:    'Gestor',
  TECHNICIAN: 'Técnico',
  OPERATOR:   'Operador',
  MAINTENANCE: 'Manutenção',
}

const ROLE_COLORS: Record<string, string> = {
  MANAGER:    'bg-emerald-900/60 text-emerald-400',
  TECHNICIAN: 'bg-sky-900/60 text-sky-400',
  OPERATOR:   'bg-amber-900/60 text-amber-400',
  MAINTENANCE: 'bg-blue-900/60 text-blue-400',
}

function formatDate(date: Date | null): string {
  if (!date) return 'Nunca'
  return date.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>
}) {
  const tenant_id = await getTenantId()
  const { q, page } = await searchParams
  const search = q?.trim() ?? ''

  // Paginação
  const currentPage = Number(page) > 0 ? Number(page) : 1
  const pageSize = 20
  const skip = (currentPage - 1) * pageSize

  // Busca o total para cálculo de páginas
  const totalCount = await prisma.user.count({
    where: {
      tenant_id,
      ...(search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
        : {}),
    },
  })

  const totalPages = Math.ceil(totalCount / pageSize)

  const users = await prisma.user.findMany({
    where: {
      tenant_id,
      ...(search
        ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }
        : {}),
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true, name: true, email: true, role: true,
      is_active: true, last_login_at: true, must_change_password: true,
    },
    skip,
    take: pageSize,
  })

  return (
    <main className="px-6 py-8 space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Usuários</h1>
          <p className="text-sm text-slate-400">Gerencie contas de acesso ao sistema.</p>
        </div>
        <Button asChild className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">
          <Link href="/gestor/usuarios/novo">
            + Novo usuário
          </Link>
        </Button>
      </div>

      {/* Busca */}
      <div className="flex gap-2">
        <UserSearch defaultValue={search} />
        {search && (
          <Button asChild variant="ghost" className="text-slate-400 hover:text-slate-200">
            <Link href="/gestor/usuarios">
              Limpar
            </Link>
          </Button>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {users.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            {search ? `Nenhum usuário encontrado para "${search}".` : 'Nenhum usuário cadastrado.'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Usuário</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Último login</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map((u) => (
                <tr key={u.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-100">{u.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                    {u.must_change_password && (
                      <span className="text-xs text-amber-500 font-medium bg-amber-500/10 px-2 py-0.5 rounded ml-2">Senha provisória</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-slate-800 text-slate-400'}`}>
                      {ROLE_LABELS[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="flex items-center gap-1.5 text-xs text-green-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {formatDate(u.last_login_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button asChild variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
                      <Link href={`/gestor/usuarios/${u.id}`}>
                        Editar
                      </Link>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-xs text-slate-500">
          Mostrando {users.length} de {totalCount} usuário(s) encontrado(s)
        </p>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Link
              href={`/gestor/usuarios?page=${currentPage - 1}${search ? `&q=${search}` : ''}`}
              className={currentPage <= 1 ? 'pointer-events-none opacity-40' : ''}
            >
              <Button variant="outline" size="sm" disabled={currentPage <= 1} className="border-slate-700 text-slate-300">
                Anterior
              </Button>
            </Link>

            <span className="text-xs text-slate-400 px-2">
              Página {currentPage} de {totalPages}
            </span>

            <Link
              href={`/gestor/usuarios?page=${currentPage + 1}${search ? `&q=${search}` : ''}`}
              className={currentPage >= totalPages ? 'pointer-events-none opacity-40' : ''}
            >
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} className="border-slate-700 text-slate-300">
                Próximo
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
