'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { criarEquipamento, type EquipamentoFormState } from '@/app/tecnico/equipamentos/actions'
import { Button } from '@/components/ui/button'

type Category = { id: string; name: string }

const DRAFT_KEY = 'equipment_draft'
const INITIAL: EquipamentoFormState = {}

export function EquipmentForm({ categories }: { categories: Category[] }) {
  const router  = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, isPending] = useActionState(criarEquipamento, INITIAL)

  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/gestor/equipamentos')
    }
  }, [state.success, router])

  return (
    <form ref={formRef} action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome *</label>
        <input
          id="name" name="name"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Ex.: Bomba de recalque 1"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <label htmlFor="category_id" className="text-sm font-medium text-slate-300">Categoria *</label>
        <select
          id="category_id" name="category_id"
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Selecione…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {state.fieldErrors?.category_id && (
          <p className="text-xs text-red-400">{state.fieldErrors.category_id[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Número de série */}
        <div className="space-y-1.5">
          <label htmlFor="serial_number" className="text-sm font-medium text-slate-300">
            Número de série <span className="text-slate-500 font-normal">(opcional)</span>
          </label>
          <input
            id="serial_number" name="serial_number"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="SN-XXXXX"
          />
        </div>

        {/* Localização */}
        <div className="space-y-1.5">
          <label htmlFor="location" className="text-sm font-medium text-slate-300">
            Localização <span className="text-slate-500 font-normal">(opcional)</span>
          </label>
          <input
            id="location" name="location"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="Ex.: Sala de bombas"
          />
        </div>

        {/* Data de instalação */}
        <div className="space-y-1.5">
          <label htmlFor="installation_date" className="text-sm font-medium text-slate-300">
            Data de instalação <span className="text-slate-500 font-normal">(opcional)</span>
          </label>
          <input
            id="installation_date" name="installation_date"
            type="date"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {/* Frequência preventiva */}
        <div className="space-y-1.5">
          <label htmlFor="preventive_frequency_days" className="text-sm font-medium text-slate-300">
            Frequência Preventiva (dias) *
          </label>
          <input
            id="preventive_frequency_days" name="preventive_frequency_days"
            type="number" min="1"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="Ex.: 30"
          />
          {state.fieldErrors?.preventive_frequency_days && (
            <p className="text-xs text-red-400">{state.fieldErrors.preventive_frequency_days[0]}</p>
          )}
          <p className="text-xs text-slate-500">A 1ª preventiva será agendada para daqui X dias.</p>
        </div>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Cadastrando...' : 'Salvar Equipamento'}
        </Button>
      </div>
    </form>
  )
}
