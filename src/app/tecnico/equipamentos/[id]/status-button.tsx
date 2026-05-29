'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { atualizarStatusCorretiva } from '../actions'
import { Button } from '@/components/ui/button'

export function StatusButton({
  corretivaId,
  action,
}: {
  corretivaId: string
  action: 'COMPLETED' | 'CANCELLED'
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await atualizarStatusCorretiva(corretivaId, action)
      if (!result.error) router.refresh()
    })
  }

  const isComplete = action === 'COMPLETED'

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      className={[
        'h-10 text-xs border disabled:opacity-50',
        isComplete
          ? 'bg-green-900/60 text-green-300 hover:bg-green-900 border-green-900/50'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border-slate-700',
      ].join(' ')}
    >
      {isPending
        ? '…'
        : isComplete ? 'Concluir' : 'Cancelar'}
    </Button>
  )
}
