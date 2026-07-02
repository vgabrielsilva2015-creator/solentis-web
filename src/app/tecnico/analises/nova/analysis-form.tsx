'use client'

import { useActionState, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { registrarAnalise, type AnaliseFormState } from '../actions'

const DRAFT_KEY = 'analysis_draft'

type CollectionPoint = { id: string; name: string }
type Parameter = { id: string; name: string; unit: string; min_limit: number | null; max_limit: number | null; default_method_id?: string | null }
type Method = { id: string; name: string; pop_content?: string | null }

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
  laboratory_type:     string
  collected_at:        string
}

function formatDatetimeLocal(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

const initialState: AnaliseFormState = {}

const SELECT_CLS =
  'w-full rounded-md border border-border bg-muted text-foreground px-3 py-2.5 text-sm ' +
  'focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50'

export function AnalysisForm({ collectionPoints, parameters, methods }: Props) {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState(registrarAnalise, initialState)

  const [mounted, setMounted]                     = useState(false)
  const [collectionPointId, setCollectionPointId] = useState('')
  const [parameterId, setParameterId]             = useState('')
  const [methodId, setMethodId]                   = useState('')
  const [valueStr, setValueStr]                   = useState('')
  const [reportText, setReportText]               = useState('')
  const [laboratoryType, setLaboratoryType]       = useState('INTERNAL')
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
        setLaboratoryType(d.laboratory_type ?? 'INTERNAL')
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
      laboratory_type:     laboratoryType,
      collected_at:        collectedAt,
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  }, [mounted, collectionPointId, parameterId, methodId, valueStr, reportText, laboratoryType, collectedAt])

  // ── Limpar rascunho e redirecionar após sucesso ────────────────────────────
  useEffect(() => {
    if (state.success) {
      localStorage.removeItem(DRAFT_KEY)
      router.push('/tecnico/analises')
    }
  }, [state.success, router])

  const selectedParam = parameters.find((p) => p.id === parameterId) ?? null
  const selectedMethod = methods.find((m) => m.id === methodId) ?? null

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
      <Link href="/tecnico/analises" className="inline-block text-sm text-muted-foreground hover:text-foreground">
        ← Voltar para análises
      </Link>

      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Nova análise</h1>
        <p className="text-xs text-muted-foreground">Registre o resultado da análise laboratorial.</p>
      </div>

      <form action={formAction} className="space-y-5">

        {/* ── Ponto de coleta ───────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="collection_point_id" className="text-sm font-medium text-foreground">
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
          <label htmlFor="parameter_id" className="text-sm font-medium text-foreground">
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

        {/* ── POP ─────────────────────────────────────────────────────────── */}
        {selectedParam?.default_method_id && methods.find(m => m.id === selectedParam.default_method_id)?.pop_content && (
          <div className="rounded-md border border-blue-900/50 bg-blue-950/20 p-4">
            <h4 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">Instrução de Trabalho (POP)</h4>
            <p className="text-sm text-foreground whitespace-pre-wrap">{methods.find(m => m.id === selectedParam.default_method_id)?.pop_content}</p>
          </div>
        )}

        {/* ── Valor medido ──────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="value" className="text-sm font-medium text-foreground">
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
                'bg-muted text-foreground placeholder:text-muted-foreground',
                nonConformant === true
                  ? 'border-red-600 focus-visible:ring-red-600'
                  : 'border-border focus-visible:ring-ring',
              ].join(' ')}
            />
            {selectedParam && (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
                {selectedParam.unit}
              </span>
            )}
          </div>
          {hasLimits && (
            <p className={`text-xs ${nonConformant === true ? 'text-red-400' : 'text-muted-foreground'}`}>
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
          <label htmlFor="collected_at" className="text-sm font-medium text-foreground">
            Data/hora da coleta
          </label>
          <Input
            id="collected_at" name="collected_at"
            type="datetime-local"
            value={collectedAt}
            onChange={(e) => setCollectedAt(e.target.value)}
            disabled={isPending} required
            className="border-border bg-muted text-foreground focus-visible:ring-ring"
          />
          {state.fieldErrors?.collected_at && (
            <p className="text-xs text-red-400">{state.fieldErrors.collected_at[0]}</p>
          )}
        </div>

        {/* ── Tipo de Laboratório ─────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="laboratory_type" className="text-sm font-medium text-foreground">
            Laboratório
          </label>
          <select
            id="laboratory_type" name="laboratory_type"
            value={laboratoryType}
            onChange={(e) => setLaboratoryType(e.target.value)}
            disabled={isPending} required
            className={SELECT_CLS}
          >
            <option value="INTERNAL">Interno</option>
            <option value="EXTERNAL">Externo (Terceirizado)</option>
          </select>
          {state.fieldErrors?.laboratory_type && (
            <p className="text-xs text-red-400">{state.fieldErrors.laboratory_type[0]}</p>
          )}
        </div>

        {/* ── Laudo (texto livre) ───────────────────────────────────────── */}
        <div className="space-y-1.5">
          <label htmlFor="report_text" className="text-sm font-medium text-foreground">
            Laudo <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="report_text" name="report_text"
            rows={4}
            placeholder="Observações, condições de coleta, conclusões…"
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            disabled={isPending}
            className="w-full resize-none rounded-md border border-border bg-muted px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
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
          className="h-14 w-full bg-primary text-primary-foreground text-base hover:bg-primary/90 disabled:opacity-50"
        >
          {isPending ? 'Registrando…' : 'Registrar análise'}
        </Button>
      </form>
    </div>
  )
}
