import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Factory,
  Users,
  FileText,
  AlertTriangle,
  ArrowLeft,
  Activity,
  UserCog,
  KeyRound,
  Power,
} from 'lucide-react'

export default async function AdminPlantaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') redirect('/login')

  const { id } = await params

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true,
          last_login_at: true,
          created_at: true,
          must_change_password: true,
        },
        orderBy: { created_at: 'asc' },
      },
      _count: {
        select: {
          users: true,
        }
      }
    }
  })

  if (!tenant) notFound()

  // KPIs da planta
  const [readingCount, occurrenceCount, openOccurrences] = await Promise.all([
    prisma.reading.count({ where: { tenant_id: id } }),
    prisma.occurrence.count({ where: { tenant_id: id } }),
    prisma.occurrence.count({ where: { tenant_id: id, status: 'OPEN' } }),
  ])

  const roleLabels: Record<string, string> = {
    MANAGER: 'Gestor',
    TECHNICIAN: 'Técnico',
    OPERATOR: 'Operador',
    SUPER_ADMIN: 'Super Admin',
  }

  const roleColors: Record<string, string> = {
    MANAGER: 'bg-indigo-950/60 text-indigo-400 border-indigo-500/20',
    TECHNICIAN: 'bg-cyan-950/60 text-cyan-400 border-cyan-500/20',
    OPERATOR: 'bg-amber-950/60 text-amber-400 border-amber-500/20',
    SUPER_ADMIN: 'bg-rose-950/60 text-rose-400 border-rose-500/20',
  }

  const kpis = [
    {
      label: 'Usuários',
      value: tenant._count.users,
      icon: <Users className="w-5 h-5" />,
      color: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
      iconColor: 'text-blue-400',
      valueColor: 'text-blue-300',
    },
    {
      label: 'Leituras Registradas',
      value: readingCount,
      icon: <FileText className="w-5 h-5" />,
      color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-300',
    },
    {
      label: 'Ocorrências Abertas',
      value: openOccurrences,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: openOccurrences > 0
        ? 'from-red-500/20 to-red-600/5 border-red-500/20'
        : 'from-muted/20 to-muted/5 border-border/20',
      iconColor: openOccurrences > 0 ? 'text-red-400' : 'text-muted-foreground',
      valueColor: openOccurrences > 0 ? 'text-red-300' : 'text-foreground',
    },
    {
      label: 'Total Ocorrências',
      value: occurrenceCount,
      icon: <AlertTriangle className="w-5 h-5" />,
      color: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
      iconColor: 'text-amber-400',
      valueColor: 'text-amber-300',
    },
  ]

  return (
    <main className="px-6 py-8 space-y-8">
      {/* Breadcrumb + Header */}
      <div>
        <Link
          href="/admin/plantas"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Plantas
        </Link>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-indigo-900/30 p-3 text-indigo-400">
              <Factory className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                {tenant.name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="font-mono text-xs text-muted-foreground">{tenant.slug}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                  tenant.is_active
                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-950/60 text-red-400 border border-red-500/20'
                }`}>
                  <Activity className="w-3 h-3" />
                  {tenant.is_active ? 'Ativa' : 'Inativa'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border bg-gradient-to-br ${kpi.color} p-5 transition-all hover:scale-[1.02]`}
          >
            <div className={`rounded-lg bg-card/50 p-2 ${kpi.iconColor} w-fit`}>
              {kpi.icon}
            </div>
            <div className="mt-3">
              <p className={`text-3xl font-bold ${kpi.valueColor}`}>{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabela de Usuários */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Equipe ({tenant.users.length})
          </h2>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-background/50 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nome</th>
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Perfil</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Último Login</th>
                <th className="px-4 py-3 font-medium">Senha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenant.users.map(u => (
                <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{u.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${roleColors[u.role] ?? 'bg-muted text-muted-foreground'}`}>
                      {roleLabels[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.is_active
                        ? 'bg-emerald-950/60 text-emerald-400'
                        : 'bg-red-950/60 text-red-400'
                    }`}>
                      <Power className="w-3 h-3" />
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {u.last_login_at
                      ? u.last_login_at.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {u.must_change_password && (
                      <span className="inline-flex items-center gap-1 text-xs text-amber-400">
                        <KeyRound className="w-3 h-3" />
                        Provisória
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadados */}
      <div className="text-xs text-muted-foreground border-t border-border pt-4">
        Tenant ID: <span className="font-mono">{tenant.id}</span> · 
        Criado em: {tenant.created_at.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
      </div>
    </main>
  )
}
