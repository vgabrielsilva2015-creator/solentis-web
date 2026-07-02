'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  criarTemplate,
  atualizarTemplate,
  desativarTemplate,
  type TemplateFormState,
} from '../actions'

const INITIAL: TemplateFormState = {}

type Operator = { id: string; name: string }
type Template = {
  id: string
  title: string
  description: string | null
  requires_photo: boolean
  assigned_to_id: string | null
  sort_order: number
  assigneeName: string | null
}

// Campos compartilhados por criar/editar
function TemplateFields({
  operators,
  defaults,
  fieldErrors,
}: {
  operators: Operator[]
  defaults?: Partial<Template>
  fieldErrors?: Record<string, string[]>
}) {
  return (
    <>
      <div>
        <input
          name="title"
          required
          maxLength={120}
          defaultValue={defaults?.title ?? ''}
          placeholder="Título da análise/tarefa *"
          className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-600 focus:outline-none"
        />
        {fieldErrors?.title && <p className="mt-1 text-xs text-red-400">{fieldErrors.title[0]}</p>}
      </div>

      <textarea
        name="description"
        rows={2}
        maxLength={500}
        defaultValue={defaults?.description ?? ''}
        placeholder="Descrição / instruções (opcional)"
        className="w-full resize-none rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-emerald-600 focus:outline-none"
      />

      <select
        name="assigned_to_id"
        defaultValue={defaults?.assigned_to_id ?? ''}
        className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground focus:border-emerald-600 focus:outline-none"
      >
        <option value="">Qualquer operador</option>
        {operators.map((op) => (
          <option key={op.id} value={op.id}>{op.name}</option>
        ))}
      </select>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="requires_photo"
            defaultChecked={defaults?.requires_photo ?? false}
            className="h-4 w-4 rounded border-border bg-muted accent-emerald-600"
          />
          Exigir foto de comprovação
        </label>
        <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          Ordem
          <input
            type="number"
            name="sort_order"
            min={0}
            max={999}
            defaultValue={defaults?.sort_order ?? 0}
            className="w-16 rounded-lg border border-border bg-muted px-2 py-1 text-sm text-foreground focus:border-emerald-600 focus:outline-none"
          />
        </label>
      </div>
    </>
  )
}

function EditForm({
  template,
  operators,
  onDone,
}: {
  template: Template
  operators: Operator[]
  onDone: () => void
}) {
  const boundAction = atualizarTemplate.bind(null, template.id)
  const [state, formAction, isPending] = useActionState(boundAction, INITIAL)

  useEffect(() => {
    if (state.success) onDone()
  }, [state.success, onDone])

  return (
    <form action={formAction} className="space-y-3 border-t border-border pt-3">
      <TemplateFields operators={operators} defaults={template} fieldErrors={state.fieldErrors} />
      {state.error && <p className="text-xs text-red-400">{state.error}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={onDone} className="h-9 border border-border bg-muted text-sm text-muted-foreground hover:bg-secondary px-4">
          Cancelar
        </Button>
        <Button type="submit" disabled={isPending} className="h-9 flex-1 bg-primary text-sm text-primary-foreground hover:bg-primary/90">
          {isPending ? 'Salvando…' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  )
}

export function TemplateManager({
  shiftId,
  operators,
  templates,
}: {
  shiftId: string
  operators: Operator[]
  templates: Template[]
}) {
  const boundCreate = criarTemplate.bind(null, shiftId)
  const [state, formAction, isPending] = useActionState(boundCreate, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (state.success) formRef.current?.reset()
  }, [state.success])

  return (
    <div className="space-y-5">
      {/* Lista de templates ativos */}
      <div className="space-y-2">
        {templates.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border bg-card/50 py-8 text-center text-sm text-muted-foreground">
            Nenhuma análise/tarefa padrão configurada para este turno.
          </p>
        ) : (
          templates.map((t) => (
            <div key={t.id} className="rounded-lg border border-border bg-card p-4">
              {editingId === t.id ? (
                <EditForm template={t} operators={operators} onDone={() => setEditingId(null)} />
              ) : (
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                    {t.sort_order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{t.title}</p>
                      {t.requires_photo && (
                        <span className="rounded bg-amber-900/30 px-1.5 py-0.5 text-xs font-medium text-amber-400">
                          Foto obrigatória
                        </span>
                      )}
                    </div>
                    {t.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">
                      {t.assigneeName ? `→ ${t.assigneeName}` : 'Qualquer operador'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(t.id)}
                      className="text-xs text-emerald-400 hover:text-emerald-300"
                    >
                      Editar
                    </button>
                    <form action={desativarTemplate.bind(null, t.id)}>
                      <button type="submit" className="text-xs text-red-500 hover:text-red-400">
                        Desativar
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Formulário de criação */}
      <form ref={formRef} action={formAction} className="space-y-3 rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium text-muted-foreground">Nova análise/tarefa padrão</p>
        <TemplateFields operators={operators} fieldErrors={state.fieldErrors} />
        {state.error && <p className="text-xs text-red-400">{state.error}</p>}
        <Button type="submit" disabled={isPending} className="h-9 w-full bg-primary text-sm text-primary-foreground hover:bg-primary/90">
          {isPending ? 'Salvando…' : '+ Adicionar ao turno'}
        </Button>
      </form>
    </div>
  )
}
