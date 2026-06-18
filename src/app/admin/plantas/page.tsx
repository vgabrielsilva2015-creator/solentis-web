import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Factory,
  Users,
  TrendingUp,
  Plus,
  ChevronRight,
  Activity,
} from 'lucide-react'

export default async function AdminPlantasPage() {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    redirect('/login')
  }

  const tenants = await prisma.tenant.findMany({
    orderBy: { created_at: 'desc' },
    include: {
      _count: {
        select: { users: true }
      }
    }
  })

  // KPIs
  const totalPlantas = tenants.filter(t => t.is_active).length
  const totalUsuarios = tenants.reduce((sum, t) => sum + t._count.users, 0)
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const criadasEsteMes = tenants.filter(t => t.created_at >= firstOfMonth).length

  const kpis = [
    {
      label: 'Plantas Ativas',
      value: totalPlantas,
      icon: <Factory className="w-5 h-5" />,
      color: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-300',
    },
    {
      label: 'Total de Usuários',
      value: totalUsuarios,
      icon: <Users className="w-5 h-5" />,
      color: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
      iconColor: 'text-blue-400',
      valueColor: 'text-blue-300',
    },
    {
      label: 'Criadas este Mês',
      value: criadasEsteMes,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
      iconColor: 'text-amber-400',
      valueColor: 'text-amber-300',
    },
  ]

  return (
    <main className="px-6 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Plantas Cadastradas
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerencie os Tenants e seus Gestores
          </p>
        </div>
        <Link href="/admin/plantas/nova">
          <Button className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all hover:shadow-indigo-500/30 gap-2">
            <Plus className="w-4 h-4" />
            Nova Planta
          </Button>
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-xl border bg-gradient-to-br ${kpi.color} p-5 transition-all hover:scale-[1.02]`}
          >
            <div className="flex items-center justify-between">
              <div className={`rounded-lg bg-slate-900/50 p-2 ${kpi.iconColor}`}>
                {kpi.icon}
              </div>
            </div>
            <div className="mt-3">
              <p className={`text-3xl font-bold ${kpi.valueColor}`}>
                {kpi.value}
              </p>
              <p className="text-xs text-slate-400 mt-1">{kpi.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Cards de Plantas */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
          Todas as Plantas ({tenants.length})
        </h2>

        {tenants.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/30 p-12 text-center">
            <Factory className="mx-auto h-12 w-12 text-slate-600 mb-4" />
            <p className="text-slate-400 text-sm">
              Nenhuma planta cadastrada ainda.
            </p>
            <Link href="/admin/plantas/nova">
              <Button variant="outline" className="mt-4 border-slate-700 text-slate-300 hover:bg-slate-800">
                Criar primeira planta
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tenants.map((t, index) => {
              const gradients = [
                'from-indigo-600/10 via-slate-900 to-slate-900',
                'from-emerald-600/10 via-slate-900 to-slate-900',
                'from-violet-600/10 via-slate-900 to-slate-900',
                'from-cyan-600/10 via-slate-900 to-slate-900',
                'from-amber-600/10 via-slate-900 to-slate-900',
                'from-rose-600/10 via-slate-900 to-slate-900',
              ]
              const accentColors = [
                'border-indigo-500/30',
                'border-emerald-500/30',
                'border-violet-500/30',
                'border-cyan-500/30',
                'border-amber-500/30',
                'border-rose-500/30',
              ]
              const iconColors = [
                'text-indigo-400 bg-indigo-900/30',
                'text-emerald-400 bg-emerald-900/30',
                'text-violet-400 bg-violet-900/30',
                'text-cyan-400 bg-cyan-900/30',
                'text-amber-400 bg-amber-900/30',
                'text-rose-400 bg-rose-900/30',
              ]
              const gradient = gradients[index % gradients.length]
              const accent = accentColors[index % accentColors.length]
              const iconColor = iconColors[index % iconColors.length]

              return (
                <Link
                  key={t.id}
                  href={`/admin/plantas/${t.id}`}
                  className="block"
                >
                  <div
                    className={`group relative rounded-xl border ${accent} bg-gradient-to-br ${gradient} p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-slate-950/50 cursor-pointer`}
                  >
                  {/* Header do Card */}
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg p-2.5 ${iconColor}`}>
                      <Factory className="w-5 h-5" />
                    </div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      t.is_active
                        ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-950/60 text-red-400 border border-red-500/20'
                    }`}>
                      <Activity className="w-3 h-3" />
                      {t.is_active ? 'Ativa' : 'Inativa'}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="mt-4 space-y-1">
                    <h3 className="text-lg font-semibold text-slate-100 group-hover:text-white transition-colors">
                      {t.name}
                    </h3>
                    <p className="font-mono text-xs text-slate-500">
                      {t.slug}
                    </p>
                  </div>

                  {/* Stats */}
                  <div className="mt-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Users className="w-3.5 h-3.5" />
                      <span>{t._count.users} usuário{t._count.users !== 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-slate-700">·</span>
                    <span className="text-slate-500 text-xs">
                      {t.created_at.toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Divider + Action */}
                  <div className="mt-4 pt-4 border-t border-slate-800/50">
                    <span className="flex items-center gap-1 text-xs text-slate-500 group-hover:text-indigo-400 transition-colors">
                      Gerenciar planta
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
