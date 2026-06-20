import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export default async function NovaCorretivaPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const tenant_id = await getTenantId()
  
  const [equipment, users] = await Promise.all([
    prisma.equipment.findMany({
      where: { tenant_id, is_active: true },
      select: { id: true, name: true, serial_number: true }
    }),
    prisma.user.findMany({
      where: { tenant_id, is_active: true, role: { in: ['TECHNICIAN', 'MANAGER'] } },
      select: { id: true, name: true }
    })
  ])

  // Simple placeholder for creating
  return (
    <main className="px-6 py-8 max-w-2xl mx-auto space-y-6">
      <Link 
        href="/gestor/manutencao/corretivas" 
        className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="mr-2 w-4 h-4" />
        Voltar para Corretivas
      </Link>

      <PageHeader 
        title="Nova Manutenção Corretiva" 
        description="Registre uma nova manutenção corretiva."
      />

      <div className="bg-surface-1 border border-border rounded-xl shadow-sm p-6">
        <form className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Equipamento</label>
            <select className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2">
              <option value="">Selecione um equipamento...</option>
              {equipment.map(e => (
                <option key={e.id} value={e.id}>{e.name} {e.serial_number ? `(SN: ${e.serial_number})` : ''}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descrição do Problema</label>
            <input type="text" className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2" placeholder="O que aconteceu?" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Responsável</label>
              <select className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2">
                <option value="">Atribuir a...</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Prioridade</label>
              <select className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2">
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Observações adicionais</label>
            <textarea className="w-full p-3 rounded-lg border border-border bg-surface-2" rows={3}></textarea>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Link href="/gestor/manutencao/corretivas" className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors border border-border">Cancelar</Link>
            <button type="button" className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:brightness-105 transition-all shadow-sm">
              Registrar Corretiva
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
