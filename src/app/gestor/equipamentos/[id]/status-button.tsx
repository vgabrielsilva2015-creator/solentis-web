'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarStatusCorretiva } from '@/app/tecnico/equipamentos/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function StatusButton({
  corretivaId,
  currentStatus,
  userRole,
  estimatedCost,
  initialNotes,
}: {
  corretivaId: string
  currentStatus: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'VALIDATED' | 'CANCELLED'
  userRole: string
  estimatedCost?: string | number | null
  initialNotes?: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalAction, setModalAction] = useState<'COMPLETED' | 'VALIDATED' | null>(null)
  
  const [cost, setCost] = useState(estimatedCost ? String(estimatedCost) : '')
  const [notes, setNotes] = useState(initialNotes ?? '')

  function handleTransition(action: 'IN_PROGRESS' | 'CANCELLED') {
    startTransition(async () => {
      const result = await atualizarStatusCorretiva(corretivaId, action)
      if (!result.error) router.refresh()
    })
  }

  function openModal(action: 'COMPLETED' | 'VALIDATED') {
    setModalAction(action)
    setIsModalOpen(true)
  }

  function handleModalSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!modalAction) return

    startTransition(async () => {
      const result = await atualizarStatusCorretiva(corretivaId, modalAction, {
        actual_cost: cost || undefined,
        notes: notes || undefined,
      })
      if (!result.error) {
        setIsModalOpen(false)
        router.refresh()
      }
    })
  }

  if (currentStatus === 'VALIDATED' || currentStatus === 'CANCELLED') {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {currentStatus === 'OPEN' && (
          <>
            <Button
              onClick={() => handleTransition('IN_PROGRESS')}
              disabled={isPending}
              className="h-8 px-3 text-xs bg-sky-900/60 text-sky-300 hover:bg-sky-900 border border-sky-900/50"
            >
              Iniciar OS
            </Button>
            <Button
              onClick={() => handleTransition('CANCELLED')}
              disabled={isPending}
              className="h-8 px-3 text-xs bg-muted text-muted-foreground hover:bg-secondary border border-border"
            >
              Cancelar
            </Button>
          </>
        )}

        {currentStatus === 'IN_PROGRESS' && (
          <>
            <Button
              onClick={() => openModal('COMPLETED')}
              disabled={isPending}
              className="h-8 px-3 text-xs bg-green-900/60 text-green-300 hover:bg-green-900 border border-green-900/50"
            >
              Concluir OS
            </Button>
            <Button
              onClick={() => handleTransition('CANCELLED')}
              disabled={isPending}
              className="h-8 px-3 text-xs bg-muted text-muted-foreground hover:bg-secondary border border-border"
            >
              Cancelar
            </Button>
          </>
        )}

        {currentStatus === 'COMPLETED' && userRole === 'MANAGER' && (
          <>
            <Button
              onClick={() => openModal('VALIDATED')}
              disabled={isPending}
              className="h-8 px-3 text-xs bg-purple-900/60 text-purple-300 hover:bg-purple-900 border border-purple-900/50"
            >
              Validar OS
            </Button>
            <Button
              onClick={() => handleTransition('CANCELLED')}
              disabled={isPending}
              className="h-8 px-3 text-xs bg-muted text-muted-foreground hover:bg-secondary border border-border"
            >
              Cancelar
            </Button>
          </>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleModalSubmit}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200"
          >
            <h3 className="text-base font-semibold text-foreground">
              {modalAction === 'COMPLETED' ? 'Concluir Ordem de Serviço' : 'Validar Ordem de Serviço'}
            </h3>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Custo Real (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                className="w-full bg-background border-border focus:border-brand text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground">
                Observações / Resolução
              </label>
              <textarea
                required
                rows={3}
                placeholder="Descreva o que foi feito..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="h-9 px-4 text-xs bg-muted text-muted-foreground hover:bg-secondary border border-border"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="h-9 px-4 text-xs bg-brand text-white hover:bg-brand/90"
              >
                {isPending ? 'Processando...' : modalAction === 'COMPLETED' ? 'Concluir' : 'Validar e Fechar'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
