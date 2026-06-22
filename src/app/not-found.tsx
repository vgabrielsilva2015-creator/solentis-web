import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 p-6">
      <div className="max-w-md text-center space-y-4">
        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
        </div>
        <p className="text-5xl font-bold text-amber-400">404</p>
        <h1 className="text-xl font-semibold text-slate-100">Página não encontrada</h1>
        <p className="text-sm text-slate-400">
          A rota ou o recurso que você está procurando não existe ou foi removido.
        </p>
        <div className="pt-4">
          <Link href="/" className="inline-flex h-11 items-center justify-center rounded-lg bg-sky-500 px-6 font-medium text-white transition-colors hover:bg-sky-400">
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  )
}
