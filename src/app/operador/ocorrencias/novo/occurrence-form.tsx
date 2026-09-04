'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { registrarOcorrencia, type OcorrenciaFormState } from '../actions'
import { Button } from '@/components/ui/button'
import { X, Image as ImageIcon, ArrowRight, ArrowLeft } from 'lucide-react'
import { compressPhoto, sumBytes, MAX_TOTAL_UPLOAD_BYTES, formatMB } from '@/lib/compress-image'

const DRAFT_KEY = 'occurrence_draft'
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

export function OccurrenceForm({ collectionPoints = [] }: { collectionPoints?: {id: string, name: string, location: string | null}[] }) {
  const router   = useRouter()
  const [state, action, isPending] = useActionState(registrarOcorrencia, INITIAL)
  const [isMutating, startTransition] = useTransition()

  const [mounted, setMounted] = useState(false)
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [compressing, setCompressing] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [offlineError, setOfflineError] = useState(false)
  
  const [step, setStep] = useState<1 | 2>(1)
  const [step1Error, setStep1Error] = useState<string | null>(null)

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
      // Cleanup previews
      photoPreviews.forEach(url => URL.revokeObjectURL(url))
      router.push('/operador/ocorrencias')
    }
  }, [state.success, router, photoPreviews])

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhotoError(null)
    const files = e.target.files ? Array.from(e.target.files) : []
    if (files.length === 0) return

    if (selectedPhotos.length + files.length > 3) {
      setPhotoError('Máximo de 3 fotos permitido por ocorrência.')
      return
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    for (const file of files) {
      if (!allowed.includes(file.type)) {
        setPhotoError(`Formato de ${file.name} inválido. Use JPG, PNG ou WEBP.`)
        return
      }
    }

    setCompressing(true)
    const newPhotos: File[] = []
    const newPreviews: string[] = []
    for (const file of files) {
      const compressed = await compressPhoto(file)
      if (compressed.size > 5 * 1024 * 1024) {
        setCompressing(false)
        setPhotoError(`${file.name} continua acima de 5 MB mesmo comprimida. Tente outra foto.`)
        return
      }
      newPhotos.push(compressed)
      newPreviews.push(URL.createObjectURL(compressed))
    }
    setCompressing(false)

    setSelectedPhotos(prev => [...prev, ...newPhotos])
    setPhotoPreviews(prev => [...prev, ...newPreviews])
    e.target.value = '' // Reset input
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviews[index])
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index))
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const isImmediateActionRequired = draft.severity === 'HIGH' || draft.severity === 'CRITICAL'

  const handleNextStep = () => {
    setStep1Error(null)
    if (!draft.description.trim()) {
      setStep1Error('A descrição é obrigatória.')
      return
    }
    if (!draft.type) {
      setStep1Error('Selecione o tipo de ocorrência.')
      return
    }
    if (!draft.category) {
      setStep1Error('Selecione a categoria.')
      return
    }
    if (!draft.severity) {
      setStep1Error('Selecione a severidade.')
      return
    }
    if (isImmediateActionRequired && !draft.immediate_action.trim()) {
      setStep1Error('Para severidade Alta/Crítica, a ação imediata é obrigatória.')
      return
    }
    setStep(2)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!navigator.onLine) {
      setOfflineError(true)
      return
    }

    const data = new FormData()
    
    // Add text fields
    data.append('description', draft.description)
    data.append('type', draft.type)
    data.append('category', draft.category)
    data.append('severity', draft.severity)
    if (draft.collection_point_id) data.append('collection_point_id', draft.collection_point_id)
    if (draft.immediate_action) data.append('immediate_action', draft.immediate_action)

    // Add photos
    selectedPhotos.forEach(file => {
      data.append('photos', file)
    })

    const totalBytes = sumBytes(selectedPhotos)
    if (totalBytes > MAX_TOTAL_UPLOAD_BYTES) {
      setPhotoError(
        `As fotos somam ${formatMB(totalBytes)} e o limite por envio é ${formatMB(MAX_TOTAL_UPLOAD_BYTES)}. Remova uma foto e tente novamente.`
      )
      return
    }

    startTransition(async () => {
      action(data)
    })
  }

  if (!mounted) return null

  return (
    <div className="space-y-5">
      {/* Indicador de Passos */}
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
        <span className={step === 1 ? 'text-brand' : ''}>1. Detalhes</span>
        <span className="flex-1 border-t border-border/50 mx-3"></span>
        <span className={step === 2 ? 'text-brand' : ''}>2. Evidências</span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {offlineError && (
          <p className="rounded-md border border-amber-900/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400 animate-pulse">
            Sem conexão. Verifique sua internet e tente novamente.
          </p>
        )}
        {state.error && (
          <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        {step === 1 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {step1Error && (
              <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                {step1Error}
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
                className="w-full rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                placeholder="Descreva o que aconteceu de forma clara e objetiva…"
                required
              />
              {state.fieldErrors?.description && (
                <p className="text-xs text-red-400">{state.fieldErrors.description[0]}</p>
              )}
            </div>

            {/* Tipo e Categoria (Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="type" className="text-sm font-semibold text-foreground">
                  Tipo de Ocorrência *
                </label>
                <select
                  id="type"
                  name="type"
                  value={draft.type}
                  onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}
                  className="w-full rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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

              <div className="space-y-1.5">
                <label htmlFor="category" className="text-sm font-semibold text-foreground">
                  Categoria *
                </label>
                <select
                  id="category"
                  name="category"
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  className="w-full rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
            </div>

            {/* Ponto de Coleta e Severidade (Grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="collection_point_id" className="text-sm font-semibold text-foreground">
                  Ponto de Coleta <span className="text-muted-foreground font-normal">(opcional)</span>
                </label>
                <select
                  id="collection_point_id"
                  name="collection_point_id"
                  value={draft.collection_point_id}
                  onChange={(e) => setDraft((d) => ({ ...d, collection_point_id: e.target.value }))}
                  className="w-full rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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

              <div className="space-y-1.5">
                <label htmlFor="severity" className="text-sm font-semibold text-foreground">
                  Severidade *
                </label>
                <select
                  id="severity"
                  name="severity"
                  value={draft.severity}
                  onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))}
                  className="w-full rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
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
            </div>

            {/* Prazo sugerido */}
            {draft.severity && (
              <div className="rounded-xl border border-border bg-card/60 px-4 py-3 text-xs text-muted-foreground space-y-0.5">
                <p className="text-foreground font-semibold">Prazo para resolução: {DEADLINE_LABEL[draft.severity]}</p>
                <p className="text-muted-foreground text-[10px]">O prazo é calculado automaticamente com base nas diretrizes do gestor.</p>
              </div>
            )}

            {/* Ação Imediata */}
            <div className="space-y-1.5">
              <label htmlFor="immediate_action" className="text-sm font-semibold text-foreground flex items-center justify-between">
                <span>Ação imediata executada {isImmediateActionRequired && '*'}</span>
                {isImmediateActionRequired && (
                  <span className="text-[10px] text-red-400 font-bold bg-red-950/20 px-2 py-0.5 rounded border border-red-900/30">Obrigatório</span>
                )}
              </label>
              <textarea
                id="immediate_action"
                name="immediate_action"
                rows={3}
                value={draft.immediate_action}
                onChange={(e) => setDraft((d) => ({ ...d, immediate_action: e.target.value }))}
                className="w-full rounded-md border border-border bg-card text-foreground px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                placeholder="Descreva a ação corretiva imediata tomada para conter o incidente..."
                required={isImmediateActionRequired}
              />
              {state.fieldErrors?.immediate_action && (
                <p className="text-xs text-red-400">{state.fieldErrors.immediate_action[0]}</p>
              )}
            </div>

            <Button
              type="button"
              onClick={handleNextStep}
              className="h-12 w-full bg-brand text-brand-foreground hover:bg-brand-soft text-sm font-semibold mt-4 transition-all"
            >
              Continuar para Evidências <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Resumo do Passo 1 */}
            <div className="p-3 bg-card border border-border rounded-lg mb-4 flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold text-foreground">Detalhes preenchidos</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{draft.description}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setStep(1)} className="text-xs shrink-0">
                Editar
              </Button>
            </div>

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
                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-background/80 border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {photoPreviews.length < 3 && (
                <label className="flex flex-col items-center justify-center gap-2 cursor-pointer rounded-xl border border-dashed border-border bg-card/30 py-6 hover:bg-card/50 hover:border-border transition-all text-center">
                  <ImageIcon className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Selecionar Fotos ({selectedPhotos.length}/3)</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG ou WEBP · a foto é comprimida</p>
                    {compressing && <p className="text-[10px] text-sky-400 mt-0.5 animate-pulse">Comprimindo foto…</p>}
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

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="h-12 w-full text-sm font-semibold transition-all border-border text-foreground hover:bg-muted"
              >
                <ArrowLeft className="mr-2 w-4 h-4" /> Voltar
              </Button>
              <Button
                type="submit"
                disabled={isPending || isMutating || compressing}
                className="h-12 w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 text-sm font-semibold transition-all"
              >
                {isPending || isMutating ? 'Registrando...' : 'Registrar Ocorrência'}
              </Button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
