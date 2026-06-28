import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { EscalaClient } from '@/app/operador/turnos/escala/escala-client'

interface PageProps {
  searchParams: Promise<{ year?: string; month?: string }>
}

// Escala (visualização) para o perfil de Manutenção — reaproveita o mesmo
// calendário read-only do operador, com navegação apontando para /manutencao.
export default async function ManutencaoEscalaPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session || !['MAINTENANCE', 'MANAGER'].includes(session.user.role)) {
    redirect('/acesso-negado')
  }

  const tenantId = await getTenantId()

  const resolvedParams = await searchParams
  const now = new Date()
  const currentYear = resolvedParams.year ? parseInt(resolvedParams.year) : now.getFullYear()
  const currentMonth = resolvedParams.month ? parseInt(resolvedParams.month) : now.getMonth() + 1

  const startDate = new Date(currentYear, currentMonth - 1, 1)
  startDate.setDate(startDate.getDate() - 7)
  const endDate = new Date(currentYear, currentMonth, 0)
  endDate.setDate(endDate.getDate() + 7)

  const userRecord = await prisma.user.findFirst({
    where: { tenant_id: tenantId, email: session.user.email! },
    select: { id: true, name: true, role: true },
  })
  if (!userRecord) redirect('/login')

  const [scales, maintenanceDays, shiftInstances, preventives, correctives, occurrences, schedules, shifts, operators] =
    await Promise.all([
      prisma.shiftScale.findMany({
        where: { tenant_id: tenantId, date: { gte: startDate, lte: endDate } },
        include: {
          shift: { select: { id: true, name: true, start_time: true, end_time: true, crosses_midnight: true } },
          operator: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.maintenanceDay.findMany({
        where: { tenant_id: tenantId, date: { gte: startDate, lte: endDate } },
      }),
      prisma.shiftInstance.findMany({
        where: { tenant_id: tenantId, date: { gte: startDate, lte: endDate } },
        include: {
          shift: { select: { id: true, name: true } },
          shift_tasks: {
            include: {
              assignee: { select: { id: true, name: true } },
              completer: { select: { id: true, name: true } },
            },
          },
          opener: { select: { id: true, name: true } },
        },
      }),
      prisma.preventiveMaintenance.findMany({
        where: { tenant_id: tenantId, scheduled_date: { gte: startDate, lte: endDate } },
        include: { equipment: { select: { id: true, name: true, serial_number: true } } },
      }),
      prisma.correctiveMaintenance.findMany({
        where: {
          tenant_id: tenantId,
          deleted_at: null,
          start_date: { lte: endDate },
          OR: [{ status: { not: 'COMPLETED' } }, { end_date: { gte: startDate } }],
        },
        include: {
          equipment: { select: { id: true, name: true } },
          responsible: { select: { id: true, name: true } },
        },
      }),
      prisma.occurrence.findMany({
        where: {
          tenant_id: tenantId,
          deleted_at: null,
          created_at: { lte: endDate },
          OR: [{ status: { not: 'RESOLVED' } }, { resolved_at: { gte: startDate } }],
        },
        include: {
          collection_point: { select: { id: true, name: true } },
          reporter: { select: { id: true, name: true } },
        },
      }),
      prisma.monitoringSchedule.findMany({
        where: { tenant_id: tenantId, is_active: true },
        include: {
          collection_point: { select: { id: true, name: true } },
          parameter: { select: { id: true, name: true, unit: true } },
        },
      }),
      prisma.shift.findMany({
        where: { tenant_id: tenantId, is_active: true },
        orderBy: { start_time: 'asc' },
      }),
      prisma.user.findMany({
        where: { tenant_id: tenantId, is_active: true, role: { in: ['OPERATOR', 'TECHNICIAN'] } },
        select: { id: true, name: true, email: true, role: true },
      }),
    ])

  return (
    <main className="mx-auto max-w-lg px-4 py-6 space-y-6">
      <EscalaClient
        currentYear={currentYear}
        currentMonth={currentMonth}
        operatorId={userRecord.id}
        operatorName={userRecord.name}
        scales={scales}
        maintenanceDays={maintenanceDays}
        shiftInstances={shiftInstances}
        preventives={preventives}
        correctives={correctives}
        occurrences={occurrences}
        schedules={schedules}
        shifts={shifts}
        operators={operators}
        basePath="/manutencao/escala"
        backHref="/manutencao/dashboard"
      />
    </main>
  )
}
