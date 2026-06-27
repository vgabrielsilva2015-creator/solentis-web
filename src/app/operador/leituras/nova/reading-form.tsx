'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registrarLeitura, type LeituraFormState } from '../actions'
import { cn } from '@/lib/utils'

const DRAFT_KEY = 'reading_draft'

type CollectionPoint = { id: string; name: string }
type Parameter = {
  id:        string
  name:      string
  unit:      string
  min_limit: number | null
  max_limit: number | null
}

type Props = {
  collectionPoints: CollectionPoint[]
  parameters:       Parameter[]
}

type Draft = {
  collection_point_id: string
  parameter_id:        string
  value:               string
  notes:               string
  recorded_at:         string
}

function formatDatetimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const initialState: LeituraFormState = {}

const CHIP_CLS =
  'shrink-0 h-12 px-4 rounded-xl text-sm font-semibold whitespace-nowrap border transition-colors active:scale-95 disabled:opacity-50'
const chipActive = (active: boolean) =>
  active
    ? 'bg-[#3ad0d6]/15 border-[#3ad0d6] text-[#3ad0d6]'
    : 'bg-slate-800 border-slate-700 text-slate-300'

export function ReadingForm({ collectionPoints, parameters }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registrarLeitura, initialState)

  // Controle de hidratação: impede salvar rascunho com estado vazio antes de carregar o draft
  const [mounted, setMounted]     = useState(false)

  const [collectionPointId, setCollectionPointId] = useState('')
  const [parameterId, setParameterId]             = useState('')
  const [valueStr, setValueStr]                   = useState('')
  const [notes, setNotes]                         = useState('')
  const [recordedAt, setRecordedAt]               = useState('')

  // ── Carregar rascunho do localStorage na montagem ──────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const d = JSON.parse(raw) as Partial<Draft>
        setCollectionPointId(d.collection_point_id ?? '')
        setParameterId(d.parameter_id ?? '')
        setValueStr(d.value ?? '')
        setNotes(d.notes ?? '')
        setRecordedAt(d.recorded_at ?? formatDatetimeLocal(new Date()))
      } catch {
        setRecordedAt(formatDatetimeLocal(new Date()))
      }
    } else {
      setRecordedAt(formatDatetimeLocal(new Date()))
    }
    setMounted(true)
  }, [])

  // ── Salvar rascunho a cada alteração (só após montar) ──────────────────────
  useEffect(() => {
    if (!mounted) return
    const draft: Draft = {
      collection_point_id: collectionPointId,
      parameter_id:        parameterId,
      value:               valueStr,
      notes,
      recorded_at:         recordedAt,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [mounted, collectionPointId, parameterId, valueStr, notes, recordedAt])

  // ── Ao submeter com sucesso: limpar rascunho e redirecionar ────────────────
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/operador/leituras')
    }
  }, [state.success, router])

  // ── Parâmetro selecionado (para limites e unidade) ─────────────────────────
  const selectedParam = parameters.find((p) => p.id === parameterId) ?? null

  // Verificação de não-conformidade em tempo real (client-side)
  const nonConformant: boolean | null = (() => {
    if (!selectedParam || valueStr === '') return null
    const v = parseFloat(valueStr)
    if (isNaN(v)) return null
    const below = selectedParam.min_limit !== null && v < selectedParam.min_limit
    const above = selectedParam.max_limit !== null && v > selectedParam.max_limit
    return below || above
  })()

  const hasLimits = selectedParam
    ? selectedParam.min_limit !== null || selectedParam.max_limit !== null
    : false

  const limitLabel = selectedParam
    ? `${selectedParam.min_limit ?? '—'} – ${selectedParam.max_limit ?? '—'} ${selectedParam.unit}`
    : ''

  return (
    <div className="space-y-5">
      <Link href="/operador/leituras" className="inline-block text-sm text-slate-400 hover:text-slate-200">
        ← Voltar para leituras
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Nova leitura</h1>
        <p className="text-xs text-slate-400">Registre a leitura de campo do turno atual.</p>
      </div>

      <form
        action={formAction}
        onSubmit={(e) => {
          if (!navigator.onLine) {
            e.preventDefault()
            const offlineQueueRaw = localStorage.getItem('solentis_offline_leituras')
            const queue = offlineQueueRaw ? JSON.parse(offlineQueueRaw) : []
            
            queue.push({
              collection_point_id: collectionPointId,
              parameter_id: parameterId,
              value: valueStr,
              unit: selectedParam?.unit,
              notes,
              recorded_at: recordedAt
            })
            
            localStorage.setItem('solentis_offline_leituras', JSON.stringify(queue))
            localStorage.removeItem(DRAFT_KEY)
            
            alert('Você está offline. Leitura salva localmente e será sincronizada assim que a internet voltar.')
            router.push('/operador/leituras')
          }
        }}
        className="space-y-5"
      >

        {/* ── Ponto de coleta (chips) ───────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">Ponto de coleta</label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {collectionPoints.map((cp) => {
              const active = collectionPointId === cp.id
              return (
                <button
                  type="button"
                  key={cp.id}
                  onClick={() => setCollectionPointId(cp.id)}
                  disabled={isPending}
                  className={cn(CHIP_CLS, chipActive(active))}
                >
                  {cp.name}
                </button>
              )
            })}
          </div>
          <input type="hidden" name="collection_point_id" value={collectionPointId} />
          {state.fieldErrors?.collection_point_id && (
            <p className="text-xs text-red-400">{state.fieldErrors.collection_point_id[0]}</p>
          )}
        </div>

        {/* ── Parâmetro (opcional, chips) ────────────────────────────────── */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-300">
            Parâmetro{' '}
            <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => { setParameterId(''); setValueStr('') }}
              disabled={isPending}
              className={cn(CHIP_CLS, chipActive(parameterId === ''))}
            >
              Observação visual
            </button>
            {parameters.map((p) => {
              const active = parameterId === p.id
              return (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => { setParameterId(p.id); setValueStr('') }}
                  disabled={isPending}
                  className={cn(CHIP_CLS, chipActive(active))}
                >
                  {p.name} <span className="font-normal opacity-70">({p.unit})</span>
                </button>
              )
            })}
          </div>
          <input type="hidden" name="parameter_id" value={parameterId} />
        </div>

        {/* ── Valor medido (visível só quando há parâmetro) ─────────────── */}
        {selectedParam && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="value" className="text-sm font-medium text-slate-300">Valor medido</label>
              {hasLimits && (
                <span className="text-xs font-mono text-slate-500">limite {limitLabel}</span>
              )}
            </div>
            <div className="relative">
              <input
                id="value"
                name="value"
                type="number"
                step="0.001"
                inputMode="decimal"
                placeholder="0,00"
                value={valueStr}
                onChange={(e) => setValueStr(e.target.value)}
                disabled={isPending}
                required
                className={cn(
                  'w-full h-16 rounded-2xl bg-slate-800 px-4 pr-16 text-3xl font-bold font-mono text-slate-100 outline-none border-2 transition-colors disabled:opacity-50',
                  nonConformant === true
                    ? 'border-red-500'
                    : nonConformant === false
                      ? 'border-emerald-500'
                      : 'border-slate-700',
                )}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                {selectedParam.unit}
              </span>
            </div>

            {/* Feedback CONAMA em tempo real */}
            {hasLimits && nonConformant !== null && (
              <p className={cn('flex items-center gap-2 text-xs font-medium', nonConformant ? 'text-red-400' : 'text-emerald-400')}>
                <span className={cn('inline-block h-2 w-2 rounded-full', nonConformant ? 'bg-red-400' : 'bg-emerald-400')} />
                {nonConformant ? `Fora do limite CONAMA (${limitLabel})` : 'Dentro do limite'}
              </p>
            )}

            {state.fieldErrors?.value && (
              <p className="text-xs text-red-400">{state.fieldErrors.value[0]}</p>
            )}
          </div>
        )}

        {/* ── Observação ─────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="notes" className="text-sm font-medium text-slate-300">
            Observação{' '}
            <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            autoComplete="off"
            placeholder="Ex: amostra coletada após chuva forte"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isPending}
            className="w-full resize-none rounded-md border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
          />
          {state.fieldErrors?.notes && (
            <p className="text-xs text-red-400">{state.fieldErrors.notes[0]}</p>
          )}
        </div>

        {/* ── Data/hora da leitura ───────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="recorded_at" className="text-sm font-medium text-slate-300">
            Data/hora da leitura
          </label>
          <Input
            id="recorded_at"
            name="recorded_at"
            type="datetime-local"
            value={recordedAt}
            onChange={(e) => setRecordedAt(e.target.value)}
            disabled={isPending}
            required
            className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
          />
          {state.fieldErrors?.recorded_at && (
            <p className="text-xs text-red-400">{state.fieldErrors.recorded_at[0]}</p>
          )}
        </div>

        {/* ── Erro geral ─────────────────────────────────────────────────── */}
        {state.error && (
          <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <Button
          type="submit"
          disabled={isPending}
          className="h-14 w-full bg-slate-100 text-slate-900 text-base hover:bg-white disabled:opacity-50"
        >
          {isPending ? 'Registrando…' : 'Registrar leitura'}
        </Button>
      </form>
    </div>
  )
}
