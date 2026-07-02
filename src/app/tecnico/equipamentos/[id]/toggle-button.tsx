'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleAtivoEquipamento } from '../actions'
import { Button } from '@/components/ui/button'

export function ToggleButton({
  equipamentoId,
  isActive,
}: {
  equipamentoId: string
  isActive:      boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleAtivoEquipamento(equipamentoId)
      if (!result.error) router.refresh()
    })
  }

  return (
    <Button
      onClick={handleToggle}
      disabled={isPending}
      className={[
        'h-10 text-xs border disabled:opacity-50',
        isActive
          ? 'bg-muted text-muted-foreground hover:bg-secondary border-border'
          : 'bg-green-900/40 text-green-400 hover:bg-green-900/60 border-green-900/50',
      ].join(' ')}
    >
      {isPending ? '…' : isActive ? 'Desativar' : 'Reativar'}
    </Button>
  )
}
