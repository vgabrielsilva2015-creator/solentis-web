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
    <main className="mx-auto max-w-lg px-4 py-6 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/operador/turnos" className="text-sm text-slate-400 hover:text-slate-200">
          ← Turnos
        </Link>
        <span className="text-slate-700">/</span>
        <h1 className="text-xl font-semibold">Abrir turno</h1>
      </div>

      {shifts.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 py-12 text-center space-y-2">
          <p className="text-sm text-slate-500">Nenhum turno configurado.</p>
          <p className="text-xs text-slate-600">Peça ao gestor para cadastrar os turnos.</p>
        </div>
      ) : (
        <ShiftForm shifts={shifts} />
      )}
    </main>
  )
}
