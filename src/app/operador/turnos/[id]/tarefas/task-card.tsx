'use client'

import { useState, useEffect } from 'react'
import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { concluirTarefa, pularTarefa, repetirTarefa, type TurnoFormState } from '../../actions'

const INITIAL: TurnoFormState = {}

type Photo = { id: string; original_name: string }
type RepeatedFrom = {
  title:            string
  status:           string
  completion_notes: string | null
  photos:           Photo[]
}
type Task = {
  id:               string
  title:            string
  description:      string | null
  status:           string
  assigned_to_id:   string | null
  assignee:         { id: string; name: string } | null
  creator:          { name: string }
  completer:        { name: string } | null
  completed_at:     Date | null
  completion_notes: string | null
  photos:           Photo[]
  requires_photo:   boolean
  repeated_from_id: string | null
  repeat_reason:    string | null
  repeatedFrom:     RepeatedFrom | null
}

export function TaskCard({
  task,
  isShiftOpen,
}: {
  task:        Task
  isShiftOpen: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [photoCount, setPhotoCount] = useState(0)
  const [repeating, setRepeating] = useState(false)
  const [showOriginal, setShowOriginal] = useState(false)

  const boundConcluir = concluirTarefa.bind(null, task.id)
  const [state, formAction, isPending] = useActionState(boundConcluir, INITIAL)

  const boundRepetir = repetirTarefa.bind(null, task.id)
  const [repeatState, repeatAction, isRepeatPending] = useActionState(boundRepetir, INITIAL)

  useEffect(() => {
    if (state.success) setExpanded(false)
  }, [state.success])

  useEffect(() => {
    if (repeatState.success) setRepeating(false)
  }, [repeatState.success])

  const isPendingStatus = task.status === 'PENDING'
  const isDone          = task.status === 'DONE'
  const isSkipped       = task.status === 'SKIPPED'
  const canAct          = isPendingStatus && isShiftOpen
  const canRepeat       = (isDone || isSkipped) && isShiftOpen

  // Foto obrigatória: bloqueia envio até haver ao menos 1 foto (nova ou já existente)
  const photoMissing = task.requires_photo && task.photos.length + photoCount === 0

  return (
    <div className={[
      'rounded-xl border bg-slate-900 overflow-hidden',
      isDone    ? 'border-green-900/50'  :
      isSkipped ? 'border-slate-800/40'  :
      expanded  ? 'border-emerald-700'   :
                  'border-slate-800',
    ].join(' ')}>

      {/* ─── Cabeçalho do card ─── */}
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          {/* Ícone circular de status */}
          <div className={[
            'mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center',
            isDone    ? 'border-green-500 bg-green-500'   :
            isSkipped ? 'border-slate-600 bg-slate-700'   :
                        'border-slate-600 bg-transparent',
          ].join(' ')}>
            {isDone && (
              <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
            {isSkipped && (
              <svg className="h-2.5 w-2.5 text-slate-500" viewBox="0 0 10 10" fill="none">
                <path d="M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className={['text-sm font-medium leading-snug', isDone || isSkipped ? 'text-slate-500' : 'text-slate-100'].join(' ')}>
                {task.title}
              </p>
              {task.requires_photo && isPendingStatus && (
                <span className="rounded bg-amber-900/30 px-1.5 py-0.5 text-xs font-medium text-amber-400">
                  Foto obrigatória
                </span>
              )}
              {task.repeated_from_id && (
                <span className="rounded bg-sky-900/30 px-1.5 py-0.5 text-xs font-medium text-sky-400">
                  Repetição de tarefa anterior
                </span>
              )}
            </div>
            {task.description && (
              <p className="mt-0.5 text-xs text-slate-600 leading-relaxed">{task.description}</p>
            )}
            {task.repeat_reason && (
              <p className="mt-0.5 text-xs text-sky-500/80 leading-relaxed">Motivo da repetição: {task.repeat_reason}</p>
            )}
            <p className="mt-1 text-xs text-slate-600">
              {task.assignee ? `Para: ${task.assignee.name}` : 'Qualquer operador'}
              {' · '}por {task.creator.name}
            </p>
          </div>
        </div>

        {/* Tentativa anterior (quando é repetição) */}
        {task.repeatedFrom && (
          <div className="ml-8">
            <button
              type="button"
              onClick={() => setShowOriginal((v) => !v)}
              className="text-xs text-sky-400 hover:text-sky-300"
            >
              {showOriginal ? '▾ Ocultar tentativa anterior' : '▸ Ver tentativa anterior'}
            </button>
            {showOriginal && (
              <div className="mt-1.5 rounded-lg border border-sky-900/30 bg-sky-950/20 px-3 py-2.5 space-y-1.5">
                <p className="text-xs font-medium text-sky-400">
                  {task.repeatedFrom.status === 'DONE' ? 'Concluída' : task.repeatedFrom.status === 'SKIPPED' ? 'Pulada' : task.repeatedFrom.status}
                </p>
                {task.repeatedFrom.completion_notes && (
                  <p className="text-xs text-slate-400 leading-relaxed">{task.repeatedFrom.completion_notes}</p>
                )}
                {task.repeatedFrom.photos.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {task.repeatedFrom.photos.map((photo) => (
                      <a
                        key={photo.id}
                        href={`/api/shift-task-photos/${photo.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-sky-900/40 bg-sky-950/40 px-2 py-0.5 text-xs text-sky-400 hover:bg-sky-950/70 transition-colors"
                      >
                        ↗ {photo.original_name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Resumo de conclusão (DONE) */}
        {isDone && (
          <div className="ml-8 rounded-lg border border-green-900/30 bg-green-950/20 px-3 py-2.5 space-y-1.5">
            <p className="text-xs font-medium text-green-400">
              Concluída{task.completer ? ` por ${task.completer.name}` : ''}
            </p>
            {task.completion_notes && (
              <p className="text-xs text-slate-400 leading-relaxed">{task.completion_notes}</p>
            )}
            {task.photos.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {task.photos.map((photo) => (
                  <a
                    key={photo.id}
                    href={`/api/shift-task-photos/${photo.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md border border-green-900/40 bg-green-950/40 px-2 py-0.5 text-xs text-green-400 hover:bg-green-950/70 transition-colors"
                  >
                    ↗ {photo.original_name}
                  </a>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Botões de ação (PENDING + turno aberto + form fechado) */}
        {canAct && !expanded && (
          <div className="ml-8 flex gap-2">
            <Button
              type="button"
              onClick={() => setExpanded(true)}
              className="h-12 flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium"
            >
              Concluir
            </Button>
            <form action={pularTarefa.bind(null, task.id)}>
              <Button type="submit"
                className="h-12 border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 text-sm px-5"
               disabled={isPending}>
                Pular
              </Button>
            </form>
          </div>
        )}

        {/* Repetir missão (DONE/SKIPPED + turno aberto) */}
        {canRepeat && !repeating && (
          <div className="ml-8">
            <button
              type="button"
              onClick={() => setRepeating(true)}
              className="text-xs text-slate-500 hover:text-slate-300 underline underline-offset-2"
            >
              Precisa repetir
            </button>
          </div>
        )}
        {canRepeat && repeating && (
          <form action={repeatAction} className="ml-8 space-y-2 rounded-lg border border-sky-900/40 bg-sky-950/10 p-3">
            <label className="text-xs font-medium text-sky-400">Motivo da repetição</label>
            <textarea
              name="reason"
              rows={2}
              maxLength={500}
              placeholder="Ex.: análise deu erro no equipamento, amostra contaminada…"
              className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-sky-600 focus:outline-none"
            />
            {repeatState.error && <p className="text-xs text-red-400">{repeatState.error}</p>}
            <div className="flex gap-2">
              <Button type="button" onClick={() => setRepeating(false)}
                className="h-9 border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 text-sm px-4">
                Cancelar
              </Button>
              <Button type="submit" disabled={isRepeatPending}
                className="h-9 flex-1 bg-sky-700 hover:bg-sky-600 text-white text-sm font-medium">
                {isRepeatPending ? 'Criando…' : 'Criar nova tentativa'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* ─── Formulário de conclusão (expansível) ─── */}
      {expanded && canAct && (
        <form
          action={formAction}
          onSubmit={(e) => { if (photoMissing) e.preventDefault() }}
          className="border-t border-slate-800 bg-slate-900/60 p-4 space-y-4"
        >
          <textarea
            name="completion_notes"
            rows={3}
            placeholder="Observações (opcional)"
            className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-emerald-600 focus:outline-none"
          />

          <div className="space-y-1.5">
            <label className={['text-xs font-medium', task.requires_photo ? 'text-amber-400' : 'text-slate-400'].join(' ')}>
              Fotos comprovação{' '}
              {task.requires_photo ? (
                <span className="font-normal">— obrigatória para concluir</span>
              ) : (
                <span className="font-normal text-slate-600">até 3 · opcional</span>
              )}
            </label>
            <input
              name="photos"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhotoCount(e.target.files?.length ?? 0)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-xs text-slate-400
                file:mr-3 file:rounded-md file:border-0 file:bg-emerald-900/60 file:px-3 file:py-1.5
                file:text-xs file:text-emerald-300 file:font-medium focus:outline-none"
            />
            <p className="text-xs text-slate-600">JPG, PNG ou WebP · máx. 5 MB cada</p>
            {photoMissing && (
              <p className="text-xs text-amber-400">Anexe ao menos 1 foto para concluir esta tarefa.</p>
            )}
          </div>

          {state.error && (
            <p className="rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
              {state.error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={() => setExpanded(false)}
              className="h-12 border border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 text-sm px-5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending || photoMissing}
              className="h-12 flex-1 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium disabled:opacity-60"
            >
              {isPending ? 'Salvando…' : 'Confirmar conclusão'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
