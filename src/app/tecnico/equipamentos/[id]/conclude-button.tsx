'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { concluirPreventiva } from '../actions'
import { Button } from '@/components/ui/button'

export function ConcludeButton({ preventivaId }: { preventivaId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleConcluir() {
    startTransition(async () => {
      const result = await concluirPreventiva(preventivaId)
      if (!result.error) router.refresh()
    })
  }

  return (
    <Button
      onClick={handleConcluir}
      disabled={isPending}
      className="h-10 text-xs bg-green-900/60 text-green-300 hover:bg-green-900 border border-green-900/50 disabled:opacity-50"
    >
      {isPending ? 'Concluindo…' : 'Concluir'}
    </Button>
  )
}
