'use client'

import { useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MapPin, Trash2 } from 'lucide-react'
import { criarPontoMetodo, removerPontoMetodo } from '../actions'

type CollectionPoint = { id: string; name: string; location: string | null }

export function CollectionPointsSection({ methodId, points }: { methodId: string, points: CollectionPoint[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  function handleAdd(formData: FormData) {
    const name = formData.get('name') as string
    if (!name) return
    startTransition(async () => {
      await criarPontoMetodo(methodId, name)
      formRef.current?.reset()
      router.refresh()
    })
  }

  function handleRemove(pointId: string) {
    if (!confirm('Remover este ponto de coleta?')) return
    startTransition(async () => {
      await removerPontoMetodo(pointId)
      router.refresh()
    })
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-slate-400" />
        <h2 className="text-base font-medium text-slate-200">Pontos de Coleta</h2>
      </div>
      
      <p className="text-xs text-slate-400">
        Gerencie os pontos de coleta atrelados a este método de análise.
      </p>

      {/* Lista de pontos */}
      <div className="space-y-2">
        {points.length === 0 ? (
          <div className="rounded border border-slate-800 border-dashed py-6 text-center text-xs text-slate-500">
            Nenhum ponto de coleta cadastrado.
          </div>
        ) : (
          <ul className="space-y-2">
            {points.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-800/50 px-3 py-2">
                <span className="text-sm font-medium text-slate-300">{p.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(p.id)}
                  disabled={isPending}
                  className="p-1 text-slate-500 hover:text-red-400 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Formulário de adição rápida */}
      <form ref={formRef} action={handleAdd} className="flex items-center gap-2 pt-2 border-t border-slate-800/50 mt-4">
        <Input 
          name="name" 
          placeholder="Nome do novo ponto..." 
          className="h-9 border-slate-700 bg-slate-800/50 text-slate-100 text-sm" 
          required 
          disabled={isPending} 
        />
        <Button type="submit" disabled={isPending} size="sm" className="h-9 bg-slate-100 text-slate-900 hover:bg-white shrink-0">
          Adicionar
        </Button>
      </form>
    </div>
  )
}
