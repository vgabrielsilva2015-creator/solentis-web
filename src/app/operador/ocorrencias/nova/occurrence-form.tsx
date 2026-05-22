'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { registrarOcorrencia, type OcorrenciaFormState } from '../actions'
import { Button } from '@/components/ui/button'

const DRAFT_KEY = 'occurrence_draft'
const INITIAL: OcorrenciaFormState = {}

// Prazo sugerido por severidade (espelha occurrence_severity_defaults do seed)
const DEADLINE_LABEL: Record<string, string> = {
  CRITICAL: '24 horas',
  HIGH:     '72 horas',
  MEDIUM:   '168 horas (7 dias)',
  LOW:      '720 horas (30 dias)',
}

type Draft = { description: string; severity: string }
const EMPTY_DRAFT: Draft = { description: '', severity: '' }

export function OccurrenceForm() {
  const router   = useRouter()
  const formRef  = useRef<HTMLFormElement>(null)
  const [state, action, isPending] = useActionState(registrarOcorrencia, INITIAL)

  const [mounted,     setMounted]     = useState(false)
  const [draft,       setDraft]       = useState<Draft>(EMPTY_DRAFT)
  const [photoName,   setPhotoName]   = useState<string | null>(null)
  const [photoError,  setPhotoError]  = useState<string | null>(null)

  // Hidrata do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY)
      if (saved) setDraft(JSON.parse(saved) as Draft)
    } catch { /* ignora */ }
    setMounted(true)
  }, [])

  // Persiste no localStorage
  useEffect(() => {
    if (!mounted) return
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [draft, mounted])

  // Navega após sucesso
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/operador/ocorrencias')
    }
  }, [state.success, router])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPhotoError(null)
    const file = e.target.files?.[0]
    if (!file) { setPhotoName(null); return }

    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setPhotoError('Formato inválido. Use JPG, PNG ou WEBP.')
      e.target.value = ''
      setPhotoName(null)
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError('Arquivo muito grande. Máximo 5 MB.')
      e.target.value = ''
      setPhotoName(null)
      return
    }
    setPhotoName(file.name)
  }

  const photoFieldError = photoError ?? state.fieldErrors?.photo?.[0]

  return (
    <form ref={formRef} action={action} className="space-y-5">
      {state.error && (
        <p className="rounded-md border border-red-900/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Descrição */}
      <div className="space-y-1.5">
        <label htmlFor="description" className="text-sm font-medium text-slate-300">
          Descrição da ocorrência *
        </label>
        <textarea
          id="description" name="description"
          rows={4}
          value={draft.description}
          onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 resize-none"
          placeholder="Descreva o que aconteceu de forma clara e objetiva…"
        />
        {state.fieldErrors?.description && (
          <p className="text-xs text-red-400">{state.fieldErrors.description[0]}</p>
        )}
      </div>

      {/* Severidade */}
      <div className="space-y-1.5">
        <label htmlFor="severity" className="text-sm font-medium text-slate-300">
          Severidade *
        </label>
        <select
          id="severity" name="severity"
          value={draft.severity}
          onChange={(e) => setDraft((d) => ({ ...d, severity: e.target.value }))}
          className="w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          <option value="">Selecione…</option>
          <option value="LOW">Baixa</option>
          <option value="MEDIUM">Média</option>
          <option value="HIGH">Alta</option>
          <option value="CRITICAL">Crítica</option>
        </select>
        {state.fieldErrors?.severity && (
          <p className="text-xs text-red-400">{state.fieldErrors.severity[0]}</p>
        )}
      </div>

      {/* Prazo sugerido (leitura) */}
      {draft.severity && (
        <div className="rounded-md border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm">
          <span className="text-slate-500">Prazo para resolução: </span>
          <span className="text-slate-300 font-medium">{DEADLINE_LABEL[draft.severity]}</span>
          <span className="ml-1.5 text-xs text-slate-600">(definido pelo Gestor)</span>
        </div>
      )}

      {/* Foto */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-slate-300">
          Foto <span className="text-slate-500 font-normal">(opcional — JPG, PNG ou WEBP, máx. 5 MB)</span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer rounded-md border border-dashed border-slate-700 bg-slate-800/40 px-4 py-3 hover:bg-slate-800 transition-colors">
          <span className="text-xs text-slate-400 flex-1 truncate">
            {photoName ?? 'Toque para selecionar uma foto'}
          </span>
          <input
            type="file"
            name="photo"
            accept="image/jpeg,image/png,image/webp"
            onChange={handlePhotoChange}
            className="sr-only"
          />
          <span className="shrink-0 rounded px-2 py-1 text-xs bg-slate-700 text-slate-300">
            Escolher
          </span>
        </label>
        {photoFieldError && (
          <p className="text-xs text-red-400">{photoFieldError}</p>
        )}
        <p className="text-xs text-slate-600">
          Ao reabrir esta página o texto é recuperado, mas a foto precisa ser selecionada novamente.
        </p>
      </div>

      <Button
        type="submit"
        disabled={isPending}
        className="h-14 w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50 text-base"
      >
        {isPending ? 'Registrando…' : 'Registrar ocorrência'}
      </Button>
    </form>
  )
}
