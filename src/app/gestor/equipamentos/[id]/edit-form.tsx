'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { editarEquipamento, type EquipamentoFormState } from '@/app/tecnico/equipamentos/actions'
import { Button } from '@/components/ui/button'

type Category = { id: string; name: string }
type Responsible = { id: string; name: string }

type Equipment = {
  id:                        string
  name:                      string
  category_id:               string
  serial_number:             string | null
  location:                  string | null
  installation_date:         Date | null
  preventive_frequency_days: number
  is_active:                 boolean
  manufacturer:              string | null
  model_name:                string | null
  status:                    string
  responsible_id:            string | null
  photo_url:                 string | null
  manual_url:                string | null
}

const INITIAL: EquipamentoFormState = {}

export function EditForm({
  equipment,
  categories,
  responsibles,
}: {
  equipment:  Equipment
  categories: Category[]
  responsibles: Responsible[]
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
    <form action={action} encType="multipart/form-data" className="space-y-4">
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
        <label htmlFor="edit-name" className="text-sm font-medium text-foreground">Nome *</label>
        <input
          id="edit-name" name="name"
          defaultValue={equipment.name}
          className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Categoria */}
        <div className="space-y-1.5">
          <label htmlFor="edit-category_id" className="text-sm font-medium text-foreground">Categoria *</label>
          <select
            id="edit-category_id" name="category_id"
            defaultValue={equipment.category_id}
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
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
          <label htmlFor="edit-responsible_id" className="text-sm font-medium text-foreground">Responsável Técnico</label>
          <select
            id="edit-responsible_id" name="responsible_id"
            defaultValue={equipment.responsible_id ?? ''}
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">Nenhum responsável</option>
            {responsibles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        {/* Fabricante */}
        <div className="space-y-1.5">
          <label htmlFor="edit-manufacturer" className="text-sm font-medium text-foreground">Fabricante</label>
          <input
            id="edit-manufacturer" name="manufacturer"
            defaultValue={equipment.manufacturer ?? ''}
            placeholder="Ex: WEG, Schneider"
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Modelo */}
        <div className="space-y-1.5">
          <label htmlFor="edit-model_name" className="text-sm font-medium text-foreground">Modelo</label>
          <input
            id="edit-model_name" name="model_name"
            defaultValue={equipment.model_name ?? ''}
            placeholder="Ex: Trifásico 5HP"
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Número de série */}
        <div className="space-y-1.5">
          <label htmlFor="edit-serial_number" className="text-sm font-medium text-foreground">Número de série / Patrimônio</label>
          <input
            id="edit-serial_number" name="serial_number"
            defaultValue={equipment.serial_number ?? ''}
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Localização */}
        <div className="space-y-1.5">
          <label htmlFor="edit-location" className="text-sm font-medium text-foreground">Localização</label>
          <input
            id="edit-location" name="location"
            defaultValue={equipment.location ?? ''}
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Data de instalação */}
        <div className="space-y-1.5">
          <label htmlFor="edit-installation_date" className="text-sm font-medium text-foreground">Data de instalação</label>
          <input
            id="edit-installation_date" name="installation_date"
            type="date"
            defaultValue={installDate}
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Frequência preventiva */}
        <div className="space-y-1.5">
          <label htmlFor="edit-freq" className="text-sm font-medium text-foreground">Frequência preventiva (dias) *</label>
          <input
            id="edit-freq" name="preventive_frequency_days"
            type="number" min="1"
            defaultValue={equipment.preventive_frequency_days}
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
          {state.fieldErrors?.preventive_frequency_days && (
            <p className="text-xs text-red-400">{state.fieldErrors.preventive_frequency_days[0]}</p>
          )}
        </div>

        {/* Status Operacional */}
        <div className="space-y-1.5">
          <label htmlFor="edit-status" className="text-sm font-medium text-foreground">Status Operacional *</label>
          <select
            id="edit-status" name="status"
            defaultValue={equipment.status}
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="OPERATING">Operando</option>
            <option value="MAINTENANCE">Em Manutenção</option>
            <option value="INACTIVE">Inativo</option>
            <option value="SCRAPPED">Sucateado</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border pt-4 mt-2">
        {/* Upload de Foto */}
        <div className="space-y-1.5">
          <label htmlFor="edit-photo_file" className="text-sm font-medium text-foreground">Atualizar Foto (imagem)</label>
          <input
            id="edit-photo_file" name="photo_file"
            type="file" accept="image/*"
            className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted"
          />
        </div>

        {/* Upload de Manual */}
        <div className="space-y-1.5">
          <label htmlFor="edit-manual_file" className="text-sm font-medium text-foreground">Atualizar Manual (PDF)</label>
          <input
            id="edit-manual_file" name="manual_file"
            type="file" accept=".pdf,application/pdf"
            className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted"
          />
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isPending}
          className="h-11 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 font-semibold"
        >
          {isPending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}
