'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registrarAnalise, type AnaliseFormState } from '../actions'

const DRAFT_KEY = 'analysis_draft'

type CollectionPoint = { id: string; name: string }
type Parameter = { id: string; name: string; unit: string; min_limit: number | null; max_limit: number | null }
type Method = { id: string; name: string }

type Props = {
  collectionPoints: CollectionPoint[]
  parameters:       Parameter[]
  methods:          Method[]
}

type Draft = {
  collection_point_id: string
  parameter_id:        string
  method_id:           string
  value:               string
  report_text:         string
  collected_at:        string
}

function formatDatetimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const initialState: AnaliseFormState = {}

const SELECT_CLS =
  'w-full rounded-md border border-slate-700 bg-slate-800 text-slate-100 px-3 py-2.5 text-sm ' +
  'focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50'

export function AnalysisForm({ collectionPoints, parameters, methods }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registrarAnalise, initialState)

  const [mounted, setMounted]                     = useState(false)
  const [collectionPointId, setCollectionPointId] = useState('')
  const [parameterId, setParameterId]             = useState('')
  const [methodId, setMethodId]                   = useState('')
  const [valueStr, setValueStr]                   = useState('')
  const [reportText, setReportText]               = useState('')
  const [collectedAt, setCollectedAt]             = useState('')

  // ── Carregar rascunho do localStorage na montagem ──────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY)
    if (raw) {
      try {
        const d = JSON.parse(raw) as Partial<Draft>
        setCollectionPointId(d.collection_point_id ?? '')
        setParameterId(d.parameter_id ?? '')
        setMethodId(d.method_id ?? '')
        setValueStr(d.value ?? '')
        setReportText(d.report_text ?? '')
        setCollectedAt(d.collected_at ?? formatDatetimeLocal(new Date()))
      } catch {
        setCollectedAt(formatDatetimeLocal(new Date()))
      }
    } else {
      setCollectedAt(formatDatetimeLocal(new Date()))
    }
    setMounted(true)
  }, [])

  // ── Salvar rascunho a cada alteração ───────────────────────────────────────
  useEffect(() => {
    if (!mounted) return
    const draft: Draft = {
      collection_point_id: collectionPointId,
      parameter_id:        parameterId,
      method_id:           methodId,
      value:               valueStr,
      report_text:         reportText,
      collected_at:        collectedAt,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [mounted, collectionPointId, parameterId, methodId, valueStr, reportText, collectedAt])

  // ── Limpar rascunho e redirecionar após sucesso ────────────────────────────
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/tecnico/analises')
    }
  }, [state.success, router])

  const selectedParam = parameters.find((p) => p.id === parameterId) ?? null

  // Verificação de não-conformidade em tempo real
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
      <Link href="/tecnico/analises" className="inline-block text-sm text-slate-400 hover:text-slate-200">
        ← Voltar para análises
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Nova análise</h1>
        <p className="text-xs text-slate-400">Registre o resultado da análise laboratorial.</p>
      </div>

      <form action={formAction} className="space-y-5">

        {/* ── Ponto de coleta ───────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="collection_point_id" className="text-sm font-medium text-slate-300">
            Ponto de coleta
          </label>
          <select
            id="collection_point_id" name="collection_point_id"
            value={collectionPointId}
            onChange={(e) => setCollectionPointId(e.target.value)}
            disabled={isPending} required
            className={SELECT_CLS}
          >
            <option value="">Selecione o ponto…</option>
            {collectionPoints.map((cp) => (
              <option key={cp.id} value={cp.id}>{cp.name}</option>
            ))}
          </select>
          {state.fieldErrors?.collection_point_id && (
            <p className="text-xs text-red-400">{state.fieldErrors.collection_point_id[0]}</p>
          )}
        </div>

        {/* ── Parâmetro ─────────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="parameter_id" className="text-sm font-medium text-slate-300">
            Parâmetro
          </label>
          <select
            id="parameter_id" name="parameter_id"
            value={parameterId}
            onChange={(e) => { setParameterId(e.target.value); setValueStr('') }}
            disabled={isPending} required
            className={SELECT_CLS}
          >
            <option value="">Selecione o parâmetro…</option>
            {parameters.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
            ))}
          </select>
          {state.fieldErrors?.parameter_id && (
            <p className="text-xs text-red-400">{state.fieldErrors.parameter_id[0]}</p>
          )}
        </div>

        {/* ── Método de análise ─────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="method_id" className="text-sm font-medium text-slate-300">
            Método de análise
          </label>
          <select
            id="method_id" name="method_id"
            value={methodId}
            onChange={(e) => setMethodId(e.target.value)}
            disabled={isPending} required
            className={SELECT_CLS}
          >
            <option value="">Selecione o método…</option>
            {methods.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {state.fieldErrors?.method_id && (
            <p className="text-xs text-red-400">{state.fieldErrors.method_id[0]}</p>
          )}
        </div>

        {/* ── Valor medido ──────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="value" className="text-sm font-medium text-slate-300">
            Valor medido
          </label>
          <div className="relative">
            <Input
              id="value" name="value"
              type="number" step="0.001" inputMode="decimal"
              placeholder="0,000"
              value={valueStr}
              onChange={(e) => setValueStr(e.target.value)}
              disabled={isPending} required
              className={[
                selectedParam ? 'pr-16' : '',
                'bg-slate-800 text-slate-100 placeholder:text-slate-500',
                nonConformant === true
                  ? 'border-red-600 focus-visible:ring-red-600'
                  : 'border-slate-700 focus-visible:ring-slate-500',
              ].join(' ')}
            />
            {selectedParam && (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
                {selectedParam.unit}
              </span>
            )}
          </div>
          {hasLimits && (
            <p className={`text-xs ${nonConformant === true ? 'text-red-400' : 'text-slate-500'}`}>
              {nonConformant === true ? 'Fora do limite CONAMA: ' : 'Limite CONAMA: '}
              {limitLabel}
            </p>
          )}
          {state.fieldErrors?.value && (
            <p className="text-xs text-red-400">{state.fieldErrors.value[0]}</p>
          )}
        </div>

        {/* ── Data/hora da coleta ────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="collected_at" className="text-sm font-medium text-slate-300">
            Data/hora da coleta
          </label>
          <Input
            id="collected_at" name="collected_at"
            type="datetime-local"
            value={collectedAt}
            onChange={(e) => setCollectedAt(e.target.value)}
            disabled={isPending} required
            className="border-slate-700 bg-slate-800 text-slate-100 focus-visible:ring-slate-500"
          />
          {state.fieldErrors?.collected_at && (
            <p className="text-xs text-red-400">{state.fieldErrors.collected_at[0]}</p>
          )}
        </div>

        {/* ── Laudo (texto livre) ───────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="report_text" className="text-sm font-medium text-slate-300">
            Laudo <span className="font-normal text-slate-500">(opcional)</span>
          </label>
          <textarea
            id="report_text" name="report_text"
            rows={4}
            placeholder="Observações, condições de coleta, conclusões…"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            disabled={isPending}
            className="w-full resize-none rounded-md border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 disabled:opacity-50"
          />
          {state.fieldErrors?.report_text && (
            <p className="text-xs text-red-400">{state.fieldErrors.report_text[0]}</p>
          )}
        </div>

        {/* ── Erro geral ─────────────────────────────────────────────────── */}
        {state.error && (
          <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
            {state.error}
          </p>
        )}

        <Button
          type="submit" disabled={isPending}
          className="h-14 w-full bg-slate-100 text-slate-900 text-base hover:bg-white disabled:opacity-50"
        >
          {isPending ? 'Registrando…' : 'Registrar análise'}
        </Button>
      </form>
    </div>
  )
}
