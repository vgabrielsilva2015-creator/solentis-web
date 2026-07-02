'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registrarOcorrencia, type OcorrenciaFormState } from '@/app/operador/ocorrencias/actions'
import { Button } from '@/components/ui/button'
import { X, Image as ImageIcon } from 'lucide-react'

const DRAFT_KEY = 'occurrence_draft_tecnico'
const INITIAL: OcorrenciaFormState = {}

const DEADLINE_LABEL: Record<string, string> = {
  CRITICAL: '24 horas',
  HIGH:     '72 horas',
  MEDIUM:   '168 horas (7 dias)',
  LOW:      '720 horas (30 dias)',
}

type Draft = {
  description: string
  severity: string
  category: string
  type: string
  collection_point_id: string
  immediate_action: string
}

const EMPTY_DRAFT: Draft = {
  description: '',
  severity: '',
  category: '',
  type: '',
  collection_point_id: '',
  immediate_action: ''
}

export function TecnicoOccurrenceForm({ collectionPoints = [] }: { collectionPoints?: {id: string, name: string, location: string | null}[] }) {
  const router   = useRouter()
  const [state, action, isPending] = useActionState(registrarOcorrencia, INITIAL)
  const [isMutating, startTransition] = useTransition()

  const [mounted, setMounted] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [offlineError, setOfflineError] = useState(false)

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setDraft({
          description: parsed.description || '',
          severity: parsed.severity || '',
          category: parsed.category || '',
          type: parsed.type || '',
          collection_point_id: parsed.collection_point_id || '',
          immediate_action: parsed.immediate_action || ''
        })
      }
    } catch { /* ignore */ }
    setMounted(true)
  }, [])

  // Persist to localStorage
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, mounted])

  // Navigate after success
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      photoPreviews.forEach(url => URL.revokeObjectURL(url))
      router.push('/tecnico/ocorrencias')
    }
  }, [state.success, router, photoPreviews])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null)
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length === 0) return

    if (selectedPhotos.length + files.length > 3) {
      setPhotoError('Máximo de 3 fotos permitido por ocorrência.')
      return
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    const newPhotos: File[] = []
    const newPreviews: string[] = []

    for (const file of files) {
      if (!allowed.includes(file.type)) {
        setPhotoError(`Formato de ${file.name} inválido. Use JPG, PNG ou WEBP.`)
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        setPhotoError(`${file.name} é muito grande. Máximo 5 MB.`)
        return
      }
      newPhotos.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }

    setSelectedPhotos(prev => [...prev, ...newPhotos])
    setPhotoPreviews(prev => [...prev, ...newPreviews])
    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index])
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!navigator.onLine) {
      setOfflineError(true)
      return
    }

    const form = e.currentTarget
    const data = new FormData(form)
    data.delete('photo')
    data.delete('photos')

    selectedPhotos.forEach(file => {
      data.append('photos', file)
    })

    startTransition(async () => {
      action(data)
    })
  }

  const isImmediateActionRequired = draft.severity === 'HIGH' || draft.severity === 'CRITICAL'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {offlineError && (
        <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
          Sem conexão. Verifique sua internet e tente novamente.
        </p>
      )}
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Descrição */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-semibold text-foreground">
          Descrição da ocorrência *
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          autoComplete="off"
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Descreva o que aconteceu de forma clara e objetiva…"
          required
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-400">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      {/* Tipo de Ocorrência */}
      <div className="space-y-1.5">
        <label htmlFor="type" className="text-sm font-semibold text-foreground">
          Tipo de Ocorrência *
        </label>
        <select
          id="type"
          name="type"
          value={draft.type}
          onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
          className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          required
        >
          <option value="">Selecione o tipo…</option>
          <option value="OPERATIONAL">Operacional</option>
          <option value="LABORATORY">Laboratorial</option>
          <option value="EQUIPMENT">Equipamento</option>
          <option value="ENVIRONMENTAL">Ambiental</option>
          <option value="SAFETY">Segurança do Trabalho</option>
        </select>
        {state.fieldErrors?.type && (
          <p className="text-xs text-red-400">{state.fieldErrors.type[0]}</p>
        )}
      </div>

      {/* Categoria */}
      <div className="space-y-1.5">
        <label htmlFor="category" className="text-sm font-semibold text-foreground">
          Categoria *
        </label>
        <select
          id="category"
          name="category"
          value={draft.category}
          onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
          className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          required
        >
          <option value="">Selecione a categoria…</option>
          <option value="VAZAMENTO">Vazamento</option>
          <option value="QUEBRA">Quebra de Equipamento</option>
          <option value="FALTA_PRODUTO">Falta de Produto</option>
          <option value="SEGURANCA">Segurança/Risco</option>
          <option value="OUTROS">Outros</option>
        </select>
        {state.fieldErrors?.category && (
          <p className="text-xs text-red-400">{state.fieldErrors.category[0]}</p>
        )}
      </div>

      {/* Ponto de Coleta (Opcional) */}
      <div className="space-y-1.5">
        <label htmlFor="collection_point_id" className="text-sm font-semibold text-foreground">
          Ponto de Coleta <span className="text-muted-foreground font-normal">(opcional)</span>
        </label>
        <select
          id="collection_point_id"
          name="collection_point_id"
          value={draft.collection_point_id}
          onChange={(e) => setDraft((d) => ({ ...d, collection_point_id: e.target.value }))}
          className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
        >
          <option value="">Nenhum específico</option>
          {collectionPoints.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} {p.location ? `(${p.location})` : ''}
            </option>
          ))}
        </select>
        {state.fieldErrors?.collection_point_id && (
          <p className="text-xs text-red-400">{state.fieldErrors.collection_point_id[0]}</p>
        )}
      </div>

      {/* Severidade */}
      <div className="space-y-1.5">
        <label htmlFor="severity" className="text-sm font-semibold text-foreground">
          Severidade *
        </label>
        <select
          id="severity"
          name="severity"
          value={draft.severity}
          onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))}
          className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
          required
        >
          <option value="">Selecione a severidade…</option>
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
        </select>
        {state.fieldErrors?.severity && (
          <p className="text-xs text-red-400">{state.fieldErrors.severity[0]}</p>
        )}
      </div>

      {/* Prazo sugerido */}
      {draft.severity && (
        <div className="rounded-md border border-border bg-muted/50 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Prazo para resolução: </span>
          <span className="text-foreground font-medium">{DEADLINE_LABEL[draft.severity]}</span>
        </div>
      )}

      {/* Ação Imediata */}
      <div className="space-y-1.5">
        <label htmlFor="immediate_action" className="text-sm font-semibold text-foreground flex items-center justify-between">
          <span>Ação imediata executada {isImmediateActionRequired && '*'}</span>
          {isImmediateActionRequired && (
            <span className="text-[10px] text-red-400 font-bold bg-red-955/20 px-2 py-0.5 rounded border border-red-900/30">Obrigatório</span>
          )}
        </label>
        <textarea
          id="immediate_action"
          name="immediate_action"
          rows={3}
          value={draft.immediate_action}
          onChange={(e) => setDraft((d) => ({ ...d, immediate_action: e.target.value }))}
          className="w-full rounded-md border border-border bg-muted text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          placeholder="Descreva a ação imediata de contenção..."
          required={isImmediateActionRequired}
        />
        {state.fieldErrors?.immediate_action && (
          <p className="text-xs text-red-400">{state.fieldErrors.immediate_action[0]}</p>
        )}
      </div>

      {/* Fotos */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-foreground">
          Fotos da ocorrência <span className="text-muted-foreground font-normal">(opcional, até 3 fotos)</span>
        </label>

        {photoPreviews.length > 0 && (
          <div className="grid grid-cols-3 gap-3 p-3 rounded-lg border border-border bg-background/20">
            {photoPreviews.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-card group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Preview ${idx + 1}`} className="object-cover w-full h-full" />
                <button
                  type="button"
                  onClick={() => removePhoto(idx)}
                  className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {photoPreviews.length < 3 && (
          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border border-dashed border-border bg-muted/20 py-6 hover:bg-muted/40 hover:border-border transition-all text-center">
            <ImageIcon className="w-6 h-6 text-muted-foreground" />
            <div>
              <p className="text-xs font-semibold text-foreground">Selecionar Fotos ({selectedPhotos.length}/3)</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG ou WEBP (máx. 5MB)</p>
            </div>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="sr-only"
            />
          </label>
        )}

        {photoError && (
          <p className="text-xs text-red-400">{photoError}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={isPending || isMutating}
        className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm font-semibold transition-all mt-4"
      >
        {isPending || isMutating ? 'Registrando ocorrência...' : 'Registrar Ocorrência'}
      </Button>
    </form>
  )
}
