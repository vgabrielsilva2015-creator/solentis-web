import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, addDays } from 'date-fns'
import { toZonedTime, format } from 'date-fns-tz'
import { getLogger } from '@/lib/logger'

export async function GET(request: Request) {
  // Verificação de segurança: a Vercel Cron envia 'Authorization: Bearer <CRON_SECRET>'.
  // Em produção, o endpoint é fail-closed: exige o segredo configurado e o header correto.
  // Em desenvolvimento, liberamos para facilitar testes locais.
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = request.headers.get('authorization')
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const log = await getLogger({ action: 'cronShifts' })

  try {
    const today = new Date()
    // Define o dia de hoje (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
    const currentDayOfWeek = today.getDay()
    const targetDate = startOfDay(today)

    // @tenant-safe: Job de sistema que gera turnos para todos os tenants
    const schedules = await prisma.shiftSchedule.findMany({
      where: {
        is_active: true,
        shift: { is_active: true }
      },
      include: {
        shift: true
      }
    })

    let created = 0
    let skipped = 0

    for (const schedule of schedules) {
      if (!schedule.days_of_week.includes(currentDayOfWeek)) continue

      // Verifica se já existe uma instância para este turno nesta data
      const existingInstance = await prisma.shiftInstance.findFirst({
        where: {
          shift_id: schedule.shift_id,
          date: targetDate,
          tenant_id: schedule.tenant_id
        }
      })
      if (existingInstance) continue

      // opened_by é FK obrigatória para User. Fallback (mesma lógica de
      // gestor/turnos/escala/actions.ts): operador escalado → senão gestor do tenant.
      let openedById: string | null = null

      const scale = await prisma.shiftScale.findFirst({
        where: { tenant_id: schedule.tenant_id, shift_id: schedule.shift_id, date: targetDate },
        select: { operator_id: true },
      })
      if (scale) {
        openedById = scale.operator_id
      } else {
        const manager = await prisma.user.findFirst({
          where: { tenant_id: schedule.tenant_id, role: 'MANAGER', is_active: true },
          select: { id: true },
        })
        if (manager) openedById = manager.id
      }

      if (!openedById) {
        // Nenhum operador escalado nem gestor: pula ESTA instância (não quebra o loop)
        skipped++
        log.warn(
          { tenantId: schedule.tenant_id, shiftId: schedule.shift_id, date: targetDate.toISOString() },
          'Instância de turno pulada: sem operador escalado nem gestor',
        )
        continue
      }

      // Criação individual com try/catch por item: uma falha em um tenant não
      // impede a criação das instâncias dos demais.
      try {
        await prisma.shiftInstance.create({
          data: {
            tenant_id: schedule.tenant_id,
            shift_id: schedule.shift_id,
            date: targetDate,
            status: 'SCHEDULED',
            opened_by: openedById,
          },
        })
        created++
      } catch (err) {
        skipped++
        log.error(
          { err, tenantId: schedule.tenant_id, shiftId: schedule.shift_id, date: targetDate.toISOString() },
          'Falha ao criar instância de turno',
        )
      }
    }

    return NextResponse.json({
      success: true,
      processed: schedules.length,
      created,
      skipped,
    })
  } catch (error) {
    log.error({ err: error }, 'Erro ao gerar instâncias de turno')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
