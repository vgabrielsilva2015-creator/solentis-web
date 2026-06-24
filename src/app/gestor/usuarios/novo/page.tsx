'use client'

import { useActionState, useState, useEffect } from 'react'
import Link from 'next/link'
import { BackButton } from '@/components/back-button'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { criarUsuario, UsuarioSchema, type UsuarioFormState } from '../actions'

const initialState: UsuarioFormState = {}

export default function NovoUsuarioPage() {
  const [state, formAction, isPending] = useActionState(criarUsuario, initialState)
  const [copied, setCopied] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Client-side form state and validation
  const [formValues, setFormValues] = useState({ name: '', email: '', role: '' })
  const [touched, setTouched] = useState<Record<string, boolean>>({ name: false, email: false, role: false })
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  // Trigger toasts on server response
  useEffect(() => {
    if (state.error) {
      setToast({ message: state.error, type: 'error' })
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [state.error])

  useEffect(() => {
    if (state.tempPassword) {
      setToast({ message: 'Usuário criado com sucesso!', type: 'success' })
      const timer = setTimeout(() => setToast(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [state.tempPassword])

  // Real-time Zod validation handler
  const handleInputChange = (field: string, value: string) => {
    const updatedValues = { ...formValues, [field]: value }
    setFormValues(updatedValues)

    const result = UsuarioSchema.safeParse(updatedValues)
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      setLocalErrors({
        name: fieldErrors.name?.[0] || '',
        email: fieldErrors.email?.[0] || '',
        role: fieldErrors.role?.[0] || '',
      })
    } else {
      setLocalErrors({})
    }
  }

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }))
  }

  async function handleCopy() {
    if (!state.tempPassword) return
    await navigator.clipboard.writeText(state.tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Sucesso: exibe senha provisória ─────────────────────────────────────
  if (state.tempPassword) {
    return (
      <div className="px-4 py-8 flex items-start justify-center relative min-h-[calc(100vh-80px)]">
        {toast && (
          <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 animate-slide-in ${
            toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400' : 'bg-red-950/90 border-red-500/30 text-red-400'
          }`}>
            <span>{toast.message}</span>
          </div>
        )}

        <div className="w-full max-w-sm space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-100">Usuário criado</h2>
              <p className="text-xs text-slate-400">
                Anote a senha provisória e envie ao usuário. Ele deverá alterá-la no primeiro acesso.
              </p>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3">
              <code className="font-mono text-base tracking-widest text-amber-300">
                {state.tempPassword}
              </code>
              <Button
                type="button" variant="ghost" size="sm"
                onClick={handleCopy}
                className="shrink-0 text-slate-400 hover:text-slate-100"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </Button>
            </div>

            <div className="flex gap-2 pt-1">
              <Link href="/gestor/usuarios" className="flex-1">
                <Button className="w-full bg-slate-100 text-slate-900 hover:bg-white">
                  Ver lista de usuários
                </Button>
              </Link>
              <Link href="/gestor/usuarios/novo" className="flex-1">
                <Button variant="outline" className="w-full border-slate-700 text-slate-300 hover:bg-slate-800">
                  Criar outro
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Formulário ───────────────────────────────────────────────────────────
  return (
    <div className="px-4 py-8 flex items-start justify-center relative min-h-[calc(100vh-80px)]">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/30 text-emerald-400' : 'bg-red-950/90 border-red-500/30 text-red-400'
        }`}>
          <span>{toast.message}</span>
        </div>
      )}

      <div className="w-full max-w-sm space-y-6">
        <BackButton href="/gestor/usuarios" label="Usuários" />

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-5 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-slate-100">Novo usuário</h2>
            <p className="text-xs text-slate-400">Uma senha provisória será gerada automaticamente.</p>
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-sm font-medium text-slate-300">Nome</label>
              <Input
                id="name" name="name" type="text"
                placeholder="Nome completo"
                required disabled={isPending}
                value={formValues.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                onBlur={() => handleBlur('name')}
                className={`border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500 ${
                  touched.name && localErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
              />
              {((touched.name && localErrors.name) || state.fieldErrors?.name) && (
                <p className="text-xs text-red-400">
                  {localErrors.name || state.fieldErrors?.name?.[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-slate-300">E-mail</label>
              <Input
                id="email" name="email" type="email"
                placeholder="usuario@email.com"
                required disabled={isPending}
                value={formValues.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                onBlur={() => handleBlur('email')}
                className={`border-slate-700 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus-visible:ring-slate-500 ${
                  touched.email && localErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''
                }`}
              />
              {((touched.email && localErrors.email) || state.fieldErrors?.email) && (
                <p className="text-xs text-red-400">
                  {localErrors.email || state.fieldErrors?.email?.[0]}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="role" className="text-sm font-medium text-slate-300">Perfil</label>
              <select
                id="role" name="role"
                required disabled={isPending}
                value={formValues.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                onBlur={() => handleBlur('role')}
                className={`flex h-10 w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:opacity-50 ${
                  touched.role && localErrors.role ? 'border-red-500 focus:ring-red-500' : ''
                }`}
              >
                <option value="" disabled>Selecione um perfil</option>
                <option value="OPERATOR">Operador</option>
                <option value="TECHNICIAN">Técnico</option>
                <option value="MANAGER">Gestor</option>
                <option value="MAINTENANCE">Manutenção</option>
              </select>
              {((touched.role && localErrors.role) || state.fieldErrors?.role) && (
                <p className="text-xs text-red-400">
                  {localErrors.role || state.fieldErrors?.role?.[0]}
                </p>
              )}
            </div>

            {state.error && (
              <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
                {state.error}
              </p>
            )}

            <Button
              type="submit" disabled={isPending || Object.keys(localErrors).length > 0}
              className="w-full bg-slate-100 text-slate-900 hover:bg-white disabled:opacity-50"
            >
              {isPending ? 'Criando…' : 'Criar usuário'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
