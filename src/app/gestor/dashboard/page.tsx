import Link from 'next/link'

const FEATURES = [
  { title: 'Usuários',    href: '/gestor/usuarios',   desc: 'Cadastro e gerenciamento de contas',       active: true  },
  { title: 'Parâmetros', href: '/gestor/parametros',  desc: 'Limites de qualidade e histórico CONAMA', active: true  },
  { title: 'Configurações', href: '/gestor/metodos',  desc: 'Métodos, categorias, pontos e turnos',    active: true  },
  { title: 'Leituras',   href: '#',                   desc: 'Registros de campo por turno',             active: false },
  { title: 'Análises',   href: '#',                   desc: 'Análises laboratoriais',                   active: false },
  { title: 'Equipamentos', href: '#',                 desc: 'Cadastro e manutenção preventiva',         active: false },
  { title: 'Ocorrências', href: '#',                  desc: 'Gestão de incidentes e resoluções',        active: false },
  { title: 'Turnos',     href: '#',                   desc: 'Histórico e passagens de turno',           active: false },
]

export default function GestorDashboard() {
  return (
    <main className="px-6 py-8 space-y-8 max-w-5xl">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-400">Acesso rápido às funcionalidades do sistema.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className={`space-y-2 rounded-xl border bg-slate-900 p-5 ${
              f.active ? 'border-slate-700' : 'border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-slate-200">{f.title}</h2>
              {!f.active && (
                <span className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500">
                  Em breve
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{f.desc}</p>
            {f.active && f.href !== '#' && (
              <Link
                href={f.href}
                className="mt-1 block text-xs text-emerald-400 hover:text-emerald-300"
              >
                Acessar →
              </Link>
            )}
          </div>
        ))}
      </div>
    </main>
  )
}
