'use client'

import { useState, useTransition } from 'react'
import { KeyRound, Copy, Check, X, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { resetarSenhaUsuario } from '../actions'

export function ResetPasswordButton({
  userId,
  userName,
}: {
  userId: string
  userName: string
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [tempPassword, setTempPassword] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  function close() {
    setOpen(false)
    // limpa o estado só depois da animação de fechar
    setTimeout(() => {
      setTempPassword(null)
      setError(null)
      setCopied(false)
    }, 150)
  }

  function confirmar() {
    setError(null)
    startTransition(async () => {
      const res = await resetarSenhaUsuario(userId)
      if (res.error) setError(res.error)
      else setTempPassword(res.tempPassword ?? null)
    })
  }

  async function copiar() {
    if (!tempPassword) return
    try {
      await navigator.clipboard.writeText(tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard bloqueado — usuário copia manualmente */
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-950/30 px-2.5 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-900/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
      >
        <KeyRound className="h-3.5 w-3.5" />
        Resetar senha
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            {/* Cabeçalho */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-foreground">Resetar senha</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Fechar"
                onClick={close}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Estado 1: senha gerada — mostra a senha provisória */}
            {tempPassword ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Nova senha provisória de <span className="font-semibold text-foreground">{userName}</span>.
                  Repasse com segurança — ela <strong>não será exibida de novo</strong>.
                </p>
                <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-3">
                  <code className="flex-1 select-all font-mono text-base text-emerald-300">{tempPassword}</code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copiar}
                    className="h-8 gap-1.5 text-xs"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Copiado' : 'Copiar'}
                  </Button>
                </div>
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                  O usuário será obrigado a trocar esta senha no próximo login.
                </p>
                <div className="flex justify-end">
                  <Button onClick={close} className="h-9 text-xs">Concluído</Button>
                </div>
              </div>
            ) : (
              /* Estado 0: confirmação */
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Gerar uma nova senha provisória para{' '}
                  <span className="font-semibold text-foreground">{userName}</span>? A senha atual
                  deixa de funcionar imediatamente.
                </p>
                {error && (
                  <p className="flex items-center gap-1.5 rounded-md border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {error}
                  </p>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={close} disabled={pending} className="h-9 text-xs">
                    Cancelar
                  </Button>
                  <Button
                    onClick={confirmar}
                    disabled={pending}
                    className="h-9 gap-1.5 bg-amber-600 text-white hover:bg-amber-500 text-xs"
                  >
                    {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {pending ? 'Resetando…' : 'Resetar senha'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
