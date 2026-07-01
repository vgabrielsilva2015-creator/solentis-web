'use client'

import { useActionState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { editarPontoColeta, type PontoColetaFormState } from './actions'

type PontoColeta = {
  id:          string
  name:        string
  matrix:      string | null
  location:    string | null
  description: string | null
  is_active:   boolean
  is_field:    boolean
  is_internal: boolean
  is_external: boolean
}

const initialState: PontoColetaFormState = {}

/** Form de edição de ponto de coleta para dentro do Sheet. Reusa a action `editarPontoColeta`. */
export function PontoSheetForm({ ponto, onSaved }: { ponto: PontoColeta; onSaved: () => void }) {
  const editAction = editarPontoColeta.bind(null, ponto.id)
  const [state, formAction, isPending] = useActionState(editAction, initialState)

  useEffect(() => {
    if (state.success) {
      const t = setTimeout(onSaved, 700)
      return () => clearTimeout(t)
    }
  }, [state.success, onSaved])

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome do Ponto</label>
        <Input id="name" name="name" type="text" defaultValue={ponto.name} required disabled={isPending}
          className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500" />
        {state.fieldErrors?.name && <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="matrix" className="text-sm font-medium text-slate-300">Matriz</label>
          <select id="matrix" name="matrix" defaultValue={ponto.matrix ?? ''} disabled={isPending}
            className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50">
            <option value="">Nenhuma / Outra</option>
            <option value="EFLUENTE">Efluente</option>
            <option value="SUBTERRANEA">Água Subterrânea</option>
            <option value="SUPERFICIAL">Água Superficial</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="location" className="text-sm font-medium text-slate-300">Localização</label>
          <Input id="location" name="location" type="text" defaultValue={ponto.location ?? ''} disabled={isPending}
            className="border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-slate-300">
          Descrição <span className="font-normal text-slate-500">(opcional)</span>
        </label>
        <textarea id="description" name="description" rows={3} disabled={isPending}
          defaultValue={ponto.description ?? ''}
          placeholder="Descreva o ponto de amostragem ou sua função…"
          className="flex w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 resize-none" />
      </div>

      <div className="space-y-3 pt-2">
        <label className="text-sm font-medium text-slate-300 block">Habilitar visibilidade para:</label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-950/80 transition-colors">
            <input type="checkbox" name="is_field" defaultChecked={ponto.is_field} disabled={isPending}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-slate-100 focus:ring-slate-500 focus:ring-offset-slate-900" />
            <div>
              <span className="text-sm font-medium text-slate-200">Leituras de Campo (Operador)</span>
              <p className="text-xs text-slate-500">Exibido na rotina diária de medições de campo do operador.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-950/80 transition-colors">
            <input type="checkbox" name="is_internal" defaultChecked={ponto.is_internal} disabled={isPending}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-slate-100 focus:ring-slate-500 focus:ring-offset-slate-900" />
            <div>
              <span className="text-sm font-medium text-slate-200">Análises Internas (Laboratório)</span>
              <p className="text-xs text-slate-500">Disponível para lançamento de análises feitas no laboratório próprio.</p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-slate-800 bg-slate-950/40 p-3 hover:bg-slate-950/80 transition-colors">
            <input type="checkbox" name="is_external" defaultChecked={ponto.is_external} disabled={isPending}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-slate-100 focus:ring-slate-500 focus:ring-offset-slate-900" />
            <div>
              <span className="text-sm font-medium text-slate-200">Análises Externas (Laudos)</span>
              <p className="text-xs text-slate-500">Disponível para mapeamento de laudos de laboratório terceirizado.</p>
            </div>
          </label>
        </div>
      </div>

      {state.error && <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">{state.error}</p>}
      {state.success && <p className="rounded-md border border-green-800/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">Ponto de coleta atualizado com sucesso.</p>}

      <Button type="submit" disabled={isPending} className="h-12 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50">
        {isPending ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  )
}
