'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { criarCorretiva, type ManutencaoFormState } from '../../actions'

const INITIAL: ManutencaoFormState = {}

type Equipment = { id: string; name: string; serial_number: string | null }
type User = { id: string; name: string }

function hoje() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function CorretivaForm({ equipment, users }: { equipment: Equipment[]; users: User[] }) {
  const router = useRouter()
  const [state, action, isPending] = useActionState(criarCorretiva, INITIAL)

  useEffect(() => {
    if (state.success) router.push('/gestor/manutencao/corretivas')
  }, [state.success, router])

  return (
    <form action={action} className="space-y-6">
      {state.error && (
        <p className="text-sm text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">{state.error}</p>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">Equipamento</label>
        <select name="equipment_id" required className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2">
          <option value="">Selecione um equipamento...</option>
          {equipment.map((e) => (
            <option key={e.id} value={e.id}>{e.name} {e.serial_number ? `(SN: ${e.serial_number})` : ''}</option>
          ))}
        </select>
        {state.fieldErrors?.equipment_id && <p className="text-xs text-red-400">{state.fieldErrors.equipment_id[0]}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Descrição do Problema</label>
        <input type="text" name="description" required className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2" placeholder="O que aconteceu?" />
        {state.fieldErrors?.description && <p className="text-xs text-red-400">{state.fieldErrors.description[0]}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Responsável</label>
          <select name="responsible_id" className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2">
            <option value="">Eu mesmo (gestor)</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Prioridade</label>
          <select name="priority" defaultValue="MEDIUM" className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2">
            <option value="LOW">Baixa</option>
            <option value="MEDIUM">Média</option>
            <option value="HIGH">Alta</option>
            <option value="CRITICAL">Crítica</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Data de abertura</label>
        <input type="date" name="start_date" required defaultValue={hoje()} className="w-full h-10 px-3 rounded-lg border border-border bg-surface-2" />
        {state.fieldErrors?.start_date && <p className="text-xs text-red-400">{state.fieldErrors.start_date[0]}</p>}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Observações adicionais</label>
        <textarea name="notes" className="w-full p-3 rounded-lg border border-border bg-surface-2" rows={3}></textarea>
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <Link href="/gestor/manutencao/corretivas" className="px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-2 rounded-lg transition-colors border border-border">Cancelar</Link>
        <button type="submit" disabled={isPending} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:brightness-105 transition-all shadow-sm disabled:opacity-50">
          {isPending ? 'Registrando…' : 'Registrar Corretiva'}
        </button>
      </div>
    </form>
  )
}
