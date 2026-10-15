/**
 * P0 — concluir preventiva é idempotente sob concorrência (classe E1).
 * Duas conclusões simultâneas da MESMA preventiva não podem agendar 2 próximas
 * nem gravar 2 logs de manutenção. Banco real (T-28).
 */
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/prisma'
import { actAs } from '@/test/auth-mock'
import { criarCenario, criarCategoria } from '@/test/factories'
import { concluirPreventiva } from '@/app/tecnico/equipamentos/actions'

async function cenarioComPreventiva() {
  const A = await criarCenario('A')
  const cat = await criarCategoria(A.tenant.id)
  const equip = await prisma.equipment.create({
    data: { tenant_id: A.tenant.id, name: 'Bomba 1', category_id: cat.id, preventive_frequency_days: 30, created_by: A.gestor.id },
  })
  const prev = await prisma.preventiveMaintenance.create({
    data: { tenant_id: A.tenant.id, equipment_id: equip.id, scheduled_date: new Date(), status: 'SCHEDULED' },
  })
  return { A, equip, prev }
}

describe('concluir preventiva — concorrência (classe E1)', () => {
  it('duas conclusões simultâneas da mesma preventiva: 1 concluída, 1 próxima agendada, 1 log', async () => {
    const { A, equip, prev } = await cenarioComPreventiva()
    actAs(A.tecnico)

    const rs = await Promise.all([concluirPreventiva(prev.id), concluirPreventiva(prev.id)])

    const oks = rs.filter((r) => !r.error)
    const erros = rs.filter((r) => r.error)
    expect(oks).toHaveLength(1)                 // só uma conclusão vale
    expect(erros).toHaveLength(1)
    expect(erros[0].error).toMatch(/já concluída/i)

    const concluidas = await prisma.preventiveMaintenance.count({ where: { equipment_id: equip.id, status: 'COMPLETED' } })
    const agendadas = await prisma.preventiveMaintenance.count({ where: { equipment_id: equip.id, status: 'SCHEDULED' } })
    const logs = await prisma.maintenanceLog.count({ where: { equipment_id: equip.id, type: 'PREVENTIVE' } })
    expect(concluidas).toBe(1)                  // a original
    expect(agendadas).toBe(1)                   // exatamente UMA próxima
    expect(logs).toBe(1)                        // exatamente UM registro de histórico
  })
})
