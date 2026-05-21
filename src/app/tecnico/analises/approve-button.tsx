'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { aprovarAnalise } from './actions'

export function ApproveButton({ analysisId }: { analysisId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleApprove() {
    startTransition(async () => {
      const result = await aprovarAnalise(analysisId)
      if (!result.error) router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="outline"
      disabled={isPending}
      onClick={handleApprove}
      className="border-green-800/60 text-green-400 hover:bg-green-950/30 disabled:opacity-50 text-xs h-7 px-2.5"
    >
      {isPending ? 'Aprovando…' : 'Aprovar'}
    </Button>
  )
}
