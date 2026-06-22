'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { editarEquipamento, type EquipamentoFormState } from '@/app/tecnico/equipamentos/actions'
import { Button } from '@/components/ui/button'

type Category = { id: string; name: string }

type Equipment = {
  id:                        string
  name:                      string
  category_id:               string
  serial_number:             string | null
  location:                  string | null
  installation_date:         Date | null
  preventive_frequency_days: number
  is_active:                 boolean
}

const INITIAL: EquipamentoFormState = {}

export function EditForm({
  equipment,
  categories,
}: {
  equipment:  Equipment
  categories: Category[]
}) {
  const router      = useRouter()
  const boundAction = editarEquipamento.bind(null, equipment.id)
  const [state, action, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  const installDate = equipment.installation_date
    ? new Date(equipment.installation_date).toISOString().split('T')[0]
    : ''

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {state.success && (
        <p className="rounded-md border border-green-900/50 bg-green-950/40 px-3 py-2 text-sm text-green-400">
          Equipamento atualizado com sucesso.
        </p>
      )}

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="edit-name" className="text-sm font-medium text-slate-300">Nome *</label>
        <input
          id="edit-name" name="name"
          defaultValue={equipment.name}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <label htmlFor="edit-category_id" className="text-sm font-medium text-slate-300">Categoria *</label>
        <select
          id="edit-category_id" name="category_id"
          defaultValue={equipment.category_id}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {state.fieldErrors?.category_id && (
          <p className="text-xs text-red-400">{state.fieldErrors.category_id[0]}</p>
        )}
      </div>

      {/* Número de série */}
      <div className="space-y-1.5">
        <label htmlFor="edit-serial_number" className="text-sm font-medium text-slate-300">
          Número de série <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="edit-serial_number" name="serial_number"
          defaultValue={equipment.serial_number ?? ''}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Localização */}
      <div className="space-y-1.5">
        <label htmlFor="edit-location" className="text-sm font-medium text-slate-300">
          Localização <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="edit-location" name="location"
          defaultValue={equipment.location ?? ''}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Data de instalação */}
      <div className="space-y-1.5">
        <label htmlFor="edit-installation_date" className="text-sm font-medium text-slate-300">
          Data de instalação <span className="text-slate-500 font-normal">(opcional)</span>
        </label>
        <input
          id="edit-installation_date" name="installation_date"
          type="date"
          defaultValue={installDate}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {/* Frequência */}
      <div className="space-y-1.5">
        <label htmlFor="edit-freq" className="text-sm font-medium text-slate-300">
          Frequência preventiva (dias) *
        </label>
        <input
          id="edit-freq" name="preventive_frequency_days"
          type="number" min="1"
          defaultValue={equipment.preventive_frequency_days}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {state.fieldErrors?.preventive_frequency_days && (
          <p className="text-xs text-red-400">{state.fieldErrors.preventive_frequency_days[0]}</p>
        )}
        <p className="text-xs text-slate-500">Alterar a frequência não reagenda a preventiva já existente.</p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-11 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
      >
        {isPending ? 'Salvando…' : 'Salvar alterações'}
      </Button>
    </form>
  )
}
