'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { criarEquipamento, type EquipamentoFormState } from '@/app/tecnico/equipamentos/actions'
import { Button } from '@/components/ui/button'
import { compressFilesInInput, MAX_TOTAL_UPLOAD_BYTES, formatMB } from '@/lib/compress-image'

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
  const [compressing, setCompressing] = useState(false)
  const [totalError, setTotalError] = useState<string | null>(null)

  useEffect(() => {
    if (state.success) {
      router.push('/gestor/equipamentos')
    }
  }, [state.success, router])

  return (
    <form
      action={action}
      encType="multipart/form-data"
      onSubmit={(e) => {
        if (compressing) { e.preventDefault(); return }
        // O Vercel rejeita requisições acima de 4,5 MB; valida o TOTAL (foto + manual).
        const fd = new FormData(e.currentTarget)
        let total = 0
        for (const v of fd.values()) if (v instanceof File) total += v.size
        if (total > MAX_TOTAL_UPLOAD_BYTES) {
          e.preventDefault()
          setTotalError(`Os arquivos somam ${formatMB(total)} e o limite por envio é ${formatMB(MAX_TOTAL_UPLOAD_BYTES)}. Use um manual menor ou envie a foto separadamente.`)
        }
      }}
      className="space-y-4"
    >
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Nome */}
      <div className="space-y-1.5">
        <label htmlFor="name" className="text-sm font-medium text-foreground">Nome *</label>
        <input
          id="name" name="name" required
          className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          placeholder="Ex.: Bomba de recalque 1"
        />
        {state.fieldErrors?.name && (
          <p className="text-xs text-red-400">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Categoria */}
        <div className="space-y-1.5">
          <label htmlFor="category_id" className="text-sm font-medium text-foreground">Categoria *</label>
          <select
            id="category_id" name="category_id" required
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
          <label htmlFor="responsible_id" className="text-sm font-medium text-foreground">Responsável Técnico</label>
          <select
            id="responsible_id" name="responsible_id"
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
          <label htmlFor="manufacturer" className="text-sm font-medium text-foreground">Fabricante</label>
          <input
            id="manufacturer" name="manufacturer"
            placeholder="Ex: WEG, Schneider"
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Modelo */}
        <div className="space-y-1.5">
          <label htmlFor="model_name" className="text-sm font-medium text-foreground">Modelo</label>
          <input
            id="model_name" name="model_name"
            placeholder="Ex: Trifásico 5HP"
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Número de série */}
        <div className="space-y-1.5">
          <label htmlFor="serial_number" className="text-sm font-medium text-foreground">Número de série / Patrimônio</label>
          <input
            id="serial_number" name="serial_number"
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="SN-XXXXX"
          />
        </div>

        {/* Localização */}
        <div className="space-y-1.5">
          <label htmlFor="location" className="text-sm font-medium text-foreground">Localização</label>
          <input
            id="location" name="location"
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Ex.: Sala de bombas"
          />
        </div>

        {/* Data de instalação */}
        <div className="space-y-1.5">
          <label htmlFor="installation_date" className="text-sm font-medium text-foreground">Data de instalação</label>
          <input
            id="installation_date" name="installation_date"
            type="date"
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Frequência preventiva */}
        <div className="space-y-1.5">
          <label htmlFor="preventive_frequency_days" className="text-sm font-medium text-foreground">Frequência preventiva (dias) *</label>
          <input
            id="preventive_frequency_days" name="preventive_frequency_days"
            type="number" min="1" required
            className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            placeholder="Ex.: 30"
          />
          {state.fieldErrors?.preventive_frequency_days && (
            <p className="text-xs text-red-400">{state.fieldErrors.preventive_frequency_days[0]}</p>
          )}
        </div>

        {/* Status Operacional */}
        <div className="space-y-1.5">
          <label htmlFor="status" className="text-sm font-medium text-foreground">Status Operacional *</label>
          <select
            id="status" name="status" required
            defaultValue="OPERATING"
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
          <label htmlFor="photo_file" className="text-sm font-medium text-foreground">Foto do Equipamento</label>
          <input
            id="photo_file" name="photo_file"
            type="file" accept="image/jpeg,image/png,image/webp"
            onChange={async (e) => {
              setTotalError(null)
              setCompressing(true)
              await compressFilesInInput(e.target)
              setCompressing(false)
            }}
            className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted"
          />
          <p className="text-xs text-muted-foreground">A foto é comprimida automaticamente antes do envio</p>
          {compressing && <p className="text-xs text-sky-400 animate-pulse">Comprimindo foto…</p>}
          {totalError && (
            <p className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">{totalError}</p>
          )}
        </div>

        {/* Upload de Manual */}
        <div className="space-y-1.5">
          <label htmlFor="manual_file" className="text-sm font-medium text-foreground">Manual Técnico (PDF)</label>
          <input
            id="manual_file" name="manual_file"
            type="file" accept=".pdf,application/pdf"
            className="w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-muted file:text-foreground hover:file:bg-muted"
          />
        </div>
      </div>

      <div className="pt-4">
        <Button
          type="submit"
          disabled={isPending || compressing}
          className="h-11 w-full bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50 transition-colors font-semibold"
        >
          {isPending ? 'Cadastrando...' : 'Salvar Equipamento'}
        </Button>
      </div>
    </form>
  )
}
