import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, addDays } from 'date-fns'
import { toZonedTime, format } from 'date-fns-tz'
import { getLogger } from '@/lib/logger'
import { baterCoracaoDoCron } from '@/lib/observability'

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
  const inicio = performance.now()

  try {
    const today = new Date()
    // Define o dia de hoje (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
    const currentDayOfWeek = today.getDay()
    const targetDate = startOfDay(today)

    // @tenant-safe: Job de sistema que gera turnos para todos os tenants
    // T-22: número de consultas CONSTANTE (não cresce com plantas/turnos): 1 agendamentos,
    // 1 instâncias do dia, 1 escalas do dia, 1 gestores, 1 createMany.
    const schedules = (await prisma.shiftSchedule.findMany({
      where: {
        is_active: true,
        days_of_week: { has: currentDayOfWeek },
        shift: { is_active: true },
      },
      select: { shift_id: true, tenant_id: true, days_of_week: true },
    })).filter((s) => s.days_of_week.includes(currentDayOfWeek))

    let created = 0
    let skipped = 0

    if (schedules.length > 0) {
      const shiftIds = [...new Set(schedules.map((s) => s.shift_id))]
      const tenantIds = [...new Set(schedules.map((s) => s.tenant_id))]
      const chave = (t: string, sh: string) => `${t}/${sh}`

      // @tenant-safe: job de sistema, filtrado pelos turnos/plantas dos agendamentos acima
      const [existentes, escalas, gestores] = await Promise.all([
        prisma.shiftInstance.findMany({
          where: { date: targetDate, tenant_id: { in: tenantIds }, shift_id: { in: shiftIds } },
          select: { tenant_id: true, shift_id: true },
        }),
        prisma.shiftScale.findMany({
          where: { date: targetDate, tenant_id: { in: tenantIds }, shift_id: { in: shiftIds } },
          select: { tenant_id: true, shift_id: true, operator_id: true },
          orderBy: { id: 'asc' },
        }),
        prisma.user.findMany({
          where: { tenant_id: { in: tenantIds }, role: 'MANAGER', is_active: true, deleted_at: null },
          select: { id: true, tenant_id: true },
          orderBy: { created_at: 'asc' },
        }),
      ])
      const jaExiste = new Set(existentes.map((e) => chave(e.tenant_id, e.shift_id)))
      const operadorEscalado = new Map<string, string>()
      for (const e of escalas) {
        const k = chave(e.tenant_id, e.shift_id)
        if (!operadorEscalado.has(k)) operadorEscalado.set(k, e.operator_id)
      }
      const gestorDaPlanta = new Map<string, string>()
      for (const g of gestores) if (!gestorDaPlanta.has(g.tenant_id)) gestorDaPlanta.set(g.tenant_id, g.id)

      // opened_by é FK obrigatória para User: operador escalado → senão gestor da planta.
      const novas: Array<{ tenant_id: string; shift_id: string; date: Date; status: string; opened_by: string }> = []
      const vistos = new Set<string>()
      for (const schedule of schedules) {
        const k = chave(schedule.tenant_id, schedule.shift_id)
        if (jaExiste.has(k) || vistos.has(k)) continue
        vistos.add(k)
        const openedById = operadorEscalado.get(k) ?? gestorDaPlanta.get(schedule.tenant_id)
        if (!openedById) {
          // Nenhum operador escalado nem gestor: pula ESTA instância (não quebra o lote)
          skipped++
          log.warn(
            { tenantId: schedule.tenant_id, shiftId: schedule.shift_id, date: targetDate.toISOString() },
            'Instância de turno pulada: sem operador escalado nem gestor',
          )
          continue
        }
        novas.push({ tenant_id: schedule.tenant_id, shift_id: schedule.shift_id, date: targetDate, status: 'SCHEDULED', opened_by: openedById })
      }

      if (novas.length > 0) {
        try {
          // skipDuplicates: se outra execução criou no meio tempo, o índice único parcial ignora a linha
          // @tenant-safe: cada linha de `novas` leva o tenant_id do próprio agendamento
          const r = await prisma.shiftInstance.createMany({ data: novas, skipDuplicates: true })
          created += r.count
        } catch (err) {
          // Falha no lote (ex.: um operador apagado quebra a FK): refaz item a item, como antes,
          // para uma planta com problema não impedir as demais.
          log.error({ err }, 'Falha no createMany de turnos; refazendo item a item')
          for (const n of novas) {
            try {
              // @tenant-safe: `n` leva o tenant_id do próprio agendamento
              await prisma.shiftInstance.create({ data: n })
              created++
            } catch (e) {
              skipped++
              log.error({ err: e, tenantId: n.tenant_id, shiftId: n.shift_id, date: targetDate.toISOString() }, 'Falha ao criar instância de turno')
            }
          }
        }
      }
    }

    // T-30: registro de que o cron rodou (e quanto fez) + batimento para o monitor externo.
    // Turnos pulados não são falha do job (ficam no log como warn); só exceção não tratada é.
    log.info(
      { processed: schedules.length, created, skipped, durationMs: Math.round(performance.now() - inicio) },
      'Cron de turnos concluído',
    )
    await baterCoracaoDoCron(true)

    return NextResponse.json({
      success: true,
      processed: schedules.length,
      created,
      skipped,
    })
  } catch (error) {
    log.error({ err: error, durationMs: Math.round(performance.now() - inicio) }, 'Erro ao gerar instâncias de turno')
    await baterCoracaoDoCron(false)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
