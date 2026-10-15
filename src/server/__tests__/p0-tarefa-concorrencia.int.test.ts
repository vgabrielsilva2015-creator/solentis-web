/**
 * P0 — concluir tarefa de turno é idempotente sob concorrência (classe E1).
 * Dois submits simultâneos da MESMA tarefa: só um conclui; o outro recebe erro
 * (sem duplicar fotos nem estourar o teto). Banco real (T-28).
 */
import { describe, it, expect } from 'vitest'
import { prisma } from '@/lib/prisma'
import { actAs } from '@/test/auth-mock'
import { criarCenario } from '@/test/factories'
import { concluirTarefa } from '@/app/operador/turnos/actions'

async function cenarioComTarefa() {
  const A = await criarCenario('A')
  const shift = await prisma.shift.create({
    data: { tenant_id: A.tenant.id, name: 'Manhã', start_time: '06:00', end_time: '14:00', crosses_midnight: false, handover_timeout_minutes: 60, is_active: true },
  })
  const inst = await prisma.shiftInstance.create({
    data: { tenant_id: A.tenant.id, shift_id: shift.id, date: new Date(), opened_by: A.operador.id, status: 'OPEN' },
  })
  const task = await prisma.shiftTask.create({
    data: { tenant_id: A.tenant.id, shift_instance_id: inst.id, title: 'Checar bomba', created_by: A.gestor.id, status: 'PENDING', requires_photo: false },
  })
  return { A, task }
}

const fd = () => { const f = new FormData(); f.set('completion_notes', 'ok'); return f }

describe('concluir tarefa — concorrência (classe E1)', () => {
  it('dois submits simultâneos: só um conclui, o outro recebe erro', async () => {
    const { A, task } = await cenarioComTarefa()
    actAs(A.operador)

    const rs = await Promise.all([
      concluirTarefa(task.id, {}, fd()),
      concluirTarefa(task.id, {}, fd()),
    ])
    const oks = rs.filter((r) => 'success' in r && r.success)
    const erros = rs.filter((r) => 'error' in r && r.error)
    expect(oks).toHaveLength(1)
    expect(erros).toHaveLength(1)

    const fim = await prisma.shiftTask.findUniqueOrThrow({ where: { id: task.id } })
    expect(fim.status).toBe('DONE')
  })
})
