'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body>
        <main className="min-h-screen flex items-center justify-center bg-slate-950 p-6 font-sans">
          <div className="max-w-md text-center space-y-4">
            <h1 className="text-2xl font-bold text-slate-100">Erro fatal</h1>
            <p className="text-sm text-slate-400">
              O aplicativo encontrou um erro crítico.
            </p>
            <button
              onClick={() => reset()}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-500 px-6 font-medium text-white"
            >
              Recarregar o aplicativo
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}
