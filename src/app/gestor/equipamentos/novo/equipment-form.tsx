'use client'

import { useActionState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { criarEquipamento, type EquipamentoFormState } from '@/app/tecnico/equipamentos/actions'
import { Button } from '@/components/ui/button'

type Category = { id: string; name: string }
type Responsible = { id: string; name: string }

const INITIAL: EquipamentoFormState = {}

export function EquipmentForm({
  categories,
  responsibles,
}: {
  categories: Category[]
  responsibles: Responsible[]
}) {
  const router  = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, isPending] = useActionState(criarEquipamento, INITIAL)

  useEffect(() => {
    if (state.success) {
      router.push('/gestor/equipamentos')
    }
  }, [state.success, router])

  return (
    <form action={action} encType="multipart/form-data" className="space-y-4">
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome *</label>
        <input
          id="name" name="name" required
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          placeholder="Ex.: Bomba de recalque 1"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Categoria */}
        <div className="space-y-1.5">
          <label htmlFor="category_id" className="text-sm font-medium text-slate-300">Categoria *</label>
          <select
            id="category_id" name="category_id" required
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

        {/* Responsável Técnico */}
        <div className="space-y-1.5">
          <label htmlFor="responsible_id" className="text-sm font-medium text-slate-300">Responsável Técnico</label>
          <select
            id="responsible_id" name="responsible_id"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Nenhum responsável</option>
            {responsibles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Fabricante */}
        <div className="space-y-1.5">
          <label htmlFor="manufacturer" className="text-sm font-medium text-slate-300">Fabricante</label>
          <input
            id="manufacturer" name="manufacturer"
            placeholder="Ex: WEG, Schneider"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {/* Modelo */}
        <div className="space-y-1.5">
          <label htmlFor="model_name" className="text-sm font-medium text-slate-300">Modelo</label>
          <input
            id="model_name" name="model_name"
            placeholder="Ex: Trifásico 5HP"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {/* Número de série */}
        <div className="space-y-1.5">
          <label htmlFor="serial_number" className="text-sm font-medium text-slate-300">Número de série / Patrimônio</label>
          <input
            id="serial_number" name="serial_number"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="SN-XXXXX"
          />
        </div>

        {/* Localização */}
        <div className="space-y-1.5">
          <label htmlFor="location" className="text-sm font-medium text-slate-300">Localização</label>
          <input
            id="location" name="location"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="Ex.: Sala de bombas"
          />
        </div>

        {/* Data de instalação */}
        <div className="space-y-1.5">
          <label htmlFor="installation_date" className="text-sm font-medium text-slate-300">Data de instalação</label>
          <input
            id="installation_date" name="installation_date"
            type="date"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        {/* Frequência preventiva */}
        <div className="space-y-1.5">
          <label htmlFor="preventive_frequency_days" className="text-sm font-medium text-slate-300">Frequência preventiva (dias) *</label>
          <input
            id="preventive_frequency_days" name="preventive_frequency_days"
            type="number" min="1" required
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            placeholder="Ex.: 30"
          />
          {state.fieldErrors?.preventive_frequency_days && (
            <p className="text-xs text-red-400">{state.fieldErrors.preventive_frequency_days[0]}</p>
          )}
        </div>

        {/* Status Operacional */}
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium text-slate-300">Status Operacional *</label>
          <select
            id="status" name="status" required
            defaultValue="OPERATING"
            className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="OPERATING">Operando</option>
            <option value="MAINTENANCE">Em Manutenção</option>
            <option value="INACTIVE">Inativo</option>
            <option value="SCRAPPED">Sucateado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-800 pt-4 mt-2">
        {/* Upload de Foto */}
        <div className="space-y-1.5">
          <label htmlFor="photo_file" className="text-sm font-medium text-slate-300">Foto do Equipamento</label>
          <input
            id="photo_file" name="photo_file"
            type="file" accept="image/*"
            className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-750"
          />
        </div>

        {/* Upload de Manual */}
        <div className="space-y-1.5">
          <label htmlFor="manual_file" className="text-sm font-medium text-slate-300">Manual Técnico (PDF)</label>
          <input
            id="manual_file" name="manual_file"
            type="file" accept=".pdf,application/pdf"
            className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-750"
          />
        </div>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors font-semibold"
        >
          {isPending ? 'Cadastrando...' : 'Salvar Equipamento'}
        </Button>
      </div>
    </form>
  )
}
