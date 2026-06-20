import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, addDays } from 'date-fns'
import { toZonedTime, format } from 'date-fns-tz'

export async function GET(request: Request) {
  // Verificação de segurança: A Vercel Cron Jobs envia um header 'Authorization' com o CRON_SECRET
  // ou podemos usar um header customizado
  const authHeader = request.headers.get('authorization')
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    process.env.NODE_ENV !== 'development'
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today = new Date()
    // Define o dia de hoje (0 = Domingo, 1 = Segunda, ..., 6 = Sábado)
    const currentDayOfWeek = today.getDay()
    const targetDate = startOfDay(today)

    // Busca os agendamentos ativos
    const schedules = await prisma.shiftSchedule.findMany({
      where: {
        is_active: true,
        shift: { is_active: true }
      },
      include: {
        shift: true
      }
    })

    const instancesToCreate = []

    for (const schedule of schedules) {
      if (schedule.days_of_week.includes(currentDayOfWeek)) {
        // Verifica se já existe uma instância para este turno nesta data
        const existingInstance = await prisma.shiftInstance.findFirst({
          where: {
            shift_id: schedule.shift_id,
            date: targetDate,
            tenant_id: schedule.tenant_id
          }
        })

        if (!existingInstance) {
          instancesToCreate.push({
            tenant_id: schedule.tenant_id,
            shift_id: schedule.shift_id,
            date: targetDate,
            status: 'SCHEDULED' as const,
            operator_id: null, // Fica vazio para o Gestor atribuir ou Operador pegar depois
            opened_by: 'CRON'
          })
        }
      }
    }

    if (instancesToCreate.length > 0) {
      await prisma.shiftInstance.createMany({
        data: instancesToCreate
      })
    }

    return NextResponse.json({ 
      success: true, 
      processed: schedules.length,
      created: instancesToCreate.length 
    })
  } catch (error) {
    console.error('Error generating shift instances:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
