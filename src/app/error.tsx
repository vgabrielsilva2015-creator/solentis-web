'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertCircle } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log do erro (ex: Sentry)
    console.error('Unhandled error:', error)
  }, [error])

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 bg-red-900/20 rounded-full flex items-center justify-center mx-auto border border-red-900/30">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-100">Algo deu errado</h1>
        <p className="text-sm text-slate-400 mb-6">
          Um erro inesperado ocorreu. Nossa equipe já foi notificada.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <button
            onClick={() => reset()}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-slate-800 px-6 font-medium text-slate-200 transition-colors hover:bg-slate-700"
          >
            Tentar novamente
          </button>
          <a href="/" className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-500 px-6 font-medium text-white transition-colors hover:bg-sky-400">
            Voltar ao início
          </a>
        </div>
      </div>
    </main>
  )
}
