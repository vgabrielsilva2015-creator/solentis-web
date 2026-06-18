import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { getTenantId } from '@/lib/tenant'

export default async function TurnosPage() {
  const turnos = await prisma.shift.findMany({
    where:   { tenant_id: (await getTenantId()) },
    orderBy: { start_time: 'asc' },
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Turnos</h1>
          <p className="text-sm text-slate-400">Configuração de horários e passagem de turno.</p>
        </div>
        <Link href="/gestor/turnos/novo">
          <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white sm:w-auto">+ Novo turno</Button>
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
        {turnos.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">Nenhum turno cadastrado.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Horário</th>
                <th className="px-4 py-3">Passagem</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {turnos.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-slate-800/50">
                  <td className="px-4 py-3 font-medium text-slate-100">{t.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">
                    {t.start_time} – {t.end_time}
                    {t.crosses_midnight && (
                      <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-slate-500">+1 dia</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{t.handover_timeout_minutes} min</td>
                  <td className="px-4 py-3">
                    {t.is_active
                      ? <span className="flex items-center gap-1.5 text-xs text-green-400"><span className="h-1.5 w-1.5 rounded-full bg-green-400" /> Ativo</span>
                      : <span className="flex items-center gap-1.5 text-xs text-red-400"><span className="h-1.5 w-1.5 rounded-full bg-red-400" /> Inativo</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/gestor/turnos/${t.id}`}>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">Editar</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  )
}
