import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getTenantId } from '@/lib/tenant'
import { EscalaGestorClient } from './escala-gestor-client'

interface PageProps {
  searchParams: Promise<{
    year?: string
    month?: string
  }>
}

export default async function GestorEscalaPage({ searchParams }: PageProps) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') redirect('/login')

  const tenantId = await getTenantId()

  const resolvedParams = await searchParams
  const now = new Date()
  const currentYear = resolvedParams.year ? parseInt(resolvedParams.year) : now.getFullYear()
  const currentMonth = resolvedParams.month ? parseInt(resolvedParams.month) : now.getMonth() + 1

  // Define a range padded by 7 days to cover spilled weeks on the calendar grid
  const startDate = new Date(currentYear, currentMonth - 1, 1)
  startDate.setDate(startDate.getDate() - 7)

  const endDate = new Date(currentYear, currentMonth, 0)
  endDate.setDate(endDate.getDate() + 7)

  // Fetch scale assignments for all operators
  const scales = await prisma.shiftScale.findMany({
    where: {
      tenant_id: tenantId,
      date: { gte: startDate, lte: endDate },
    },
    include: {
      shift: { select: { id: true, name: true, start_time: true, end_time: true } },
      operator: { select: { id: true, name: true, email: true } },
    }
  })

  // Fetch maintenance days
  const maintenanceDays = await prisma.maintenanceDay.findMany({
    where: {
      tenant_id: tenantId,
      date: { gte: startDate, lte: endDate },
    }
  })

  // Fetch shift instances with tasks
  const shiftInstances = await prisma.shiftInstance.findMany({
    where: {
      tenant_id: tenantId,
      date: { gte: startDate, lte: endDate },
    },
    include: {
      shift: { select: { id: true, name: true } },
      shift_tasks: {
        include: {
          assignee: { select: { id: true, name: true } },
          completer: { select: { id: true, name: true } },
        }
      },
      opener: { select: { id: true, name: true } },
    }
  })

  // Fetch preventive maintenance
  const preventives = await prisma.preventiveMaintenance.findMany({
    where: {
      tenant_id: tenantId,
      scheduled_date: { gte: startDate, lte: endDate },
    },
    include: {
      equipment: { select: { id: true, name: true, serial_number: true } },
    }
  })

  // Fetch corrective maintenance
  const correctives = await prisma.correctiveMaintenance.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      start_date: { lte: endDate },
      OR: [
        { status: { not: 'COMPLETED' } },
        { end_date: { gte: startDate } }
      ]
    },
    include: {
      equipment: { select: { id: true, name: true } },
      responsible: { select: { id: true, name: true } },
    }
  })

  // Fetch occurrences
  const occurrences = await prisma.occurrence.findMany({
    where: {
      tenant_id: tenantId,
      deleted_at: null,
      created_at: { lte: endDate },
      OR: [
        { status: { not: 'RESOLVED' } },
        { resolved_at: { gte: startDate } }
      ]
    },
    include: {
      collection_point: { select: { id: true, name: true } },
      reporter: { select: { id: true, name: true } },
    }
  })

  // Fetch active monitoring schedules to deduce scheduled analyses
  const schedules = await prisma.monitoringSchedule.findMany({
    where: {
      tenant_id: tenantId,
      is_active: true,
    },
    include: {
      collection_point: { select: { id: true, name: true } },
      parameter: { select: { id: true, name: true, unit: true } }
    }
  })

  // Fetch shifts
  const shifts = await prisma.shift.findMany({
    where: {
      tenant_id: tenantId,
      is_active: true,
    },
    orderBy: { start_time: 'asc' }
  })

  // Fetch all active operators & technicians
  const operators = await prisma.user.findMany({
    where: {
      tenant_id: tenantId,
      is_active: true,
      role: { in: ['OPERATOR', 'TECHNICIAN'] }
    },
    select: { id: true, name: true, email: true, role: true }
  })

  return (
    <main className="px-6 py-8 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Gestão de Escalas</h1>
        <p className="text-sm text-muted-foreground">Configure escalas de operadores, checklists de tarefas e dias de manutenção da ETE.</p>
      </div>

      <EscalaGestorClient
        currentYear={currentYear}
        currentMonth={currentMonth}
        scales={scales}
        maintenanceDays={maintenanceDays}
        shiftInstances={shiftInstances}
        preventives={preventives}
        correctives={correctives}
        occurrences={occurrences}
        schedules={schedules}
        shifts={shifts}
        operators={operators}
      />
    </main>
  )
}
