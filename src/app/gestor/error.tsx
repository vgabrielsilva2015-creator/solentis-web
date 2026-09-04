'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function GestorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-[80vh] flex-col items-center justify-center space-y-6 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Ocorreu um erro interno</h1>
        <p className="max-w-md text-muted-foreground">
          Não conseguimos processar esta requisição. Você pode tentar novamente ou voltar ao painel.
        </p>
      </div>

      <div className="flex gap-4">
        <Button variant="outline" onClick={() => reset()}>
          Tentar novamente
        </Button>
        <Button asChild>
          <a href="/gestor/dashboard">Voltar ao Painel</a>
        </Button>
      </div>
    </div>
  )
}
