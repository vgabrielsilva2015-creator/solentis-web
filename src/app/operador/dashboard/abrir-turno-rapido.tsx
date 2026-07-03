'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { abrirTurno, type TurnoFormState } from '../turnos/actions'
import { Button } from '@/components/ui/button'

const INITIAL: TurnoFormState = {}

/**
 * Abertura assistida de turno (1 clique) no dashboard do operador.
 * O turno da faixa horária atual já vem pré-selecionado (shiftId); o operador
 * só confirma. Reusa a Server Action `abrirTurno` (que valida duplicidade e
 * promove instância pré-agendada). Não abre nada automaticamente — evita criar
 * instância no turno errado ou duplicada.
 */
export function AbrirTurnoRapido({
  shiftId,
  shiftName,
  janela,
}: {
  shiftId: string
  shiftName: string
  janela: string
}) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(abrirTurno, INITIAL)

  useEffect(() => {
    if (state.success) router.refresh()
  }, [state.success, router])

  return (
    <form
      action={action}
      className="block rounded-xl border border-green-800/60 bg-green-950/20 p-4 space-y-3"
    >
      <input type="hidden" name="shift_id" value={shiftId} />
      <div>
        <p className="text-sm font-medium text-green-300">Turno da vez: {shiftName}</p>
        <p className="text-xs text-green-600 mt-0.5">{janela} · você ainda não abriu um turno</p>
      </div>
      {state.error && <p className="text-xs text-red-400">{state.error}</p>}
      <Button
        type="submit"
        disabled={isPending}
        className="h-12 w-full bg-green-600 text-white hover:bg-green-500 text-sm font-medium disabled:opacity-60"
      >
        {isPending ? 'Abrindo…' : `Abrir turno da ${shiftName}`}
      </Button>
    </form>
  )
}
