import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ShiftForm } from './shift-form'

const TENANT_ID = 'default'

export default async function AbrirTurnoPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const shifts = await prisma.shift.findMany({
    where:   { tenant_id: TENANT_ID, is_active: true },
    select:  { id: true, name: true, start_time: true, end_time: true },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto max-w-lg flex items-center justify-between px-4 py-3">
          <span className="text-base font-bold tracking-tight">Solentis</span>
          <span className="rounded-full bg-emerald-900/60 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
            Operador
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
        <div>
          <h1 className="text-xl font-semibold">Abrir turno</h1>
          <p className="text-xs text-slate-500 mt-0.5">Selecione o turno que está iniciando</p>
        </div>

        {shifts.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 py-12 text-center space-y-2">
            <p className="text-sm text-slate-500">Nenhum turno configurado.</p>
            <p className="text-xs text-slate-600">Peça ao gestor para cadastrar os turnos.</p>
          </div>
        ) : (
          <ShiftForm shifts={shifts} />
        )}

        <div className="pt-2">
          <Link href="/operador/turnos" className="text-xs text-slate-600 hover:text-slate-400">
            ← Voltar
          </Link>
        </div>
      </main>
    </div>
  )
}
