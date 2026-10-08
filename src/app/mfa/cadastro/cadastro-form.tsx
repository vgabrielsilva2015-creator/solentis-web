'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { iniciarCadastroMfa, confirmarCadastroMfa, type CadastroState } from './actions'

const inicial: CadastroState = {}
const campo = 'w-full h-12 px-3 rounded-lg bg-background border border-border text-foreground'
const botao = 'h-12 w-full rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50'

export function CadastroMfaForm() {
  const [s1, passo1, pend1] = useActionState(iniciarCadastroMfa, inicial)
  const [s2, passo2, pend2] = useActionState(confirmarCadastroMfa, inicial)
  const [copiado, setCopiado] = useState(false)

  if (s2.recoveryCodes) {
    const texto = s2.recoveryCodes.join('\n')
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Segundo fator ativado</h2>
        <p className="text-sm text-muted-foreground">
          Guarde estes 8 códigos de recuperação em um gerenciador de senhas. Cada um vale uma vez e serve se você perder o celular.
          Eles <strong>não aparecem de novo</strong>.
        </p>
        <pre className="rounded-lg border border-border bg-background p-4 font-mono text-sm leading-7" data-testid="recovery-codes">{texto}</pre>
        <button type="button" className={botao} onClick={async () => { await navigator.clipboard.writeText(texto); setCopiado(true) }}>
          {copiado ? 'Copiado' : 'Copiar códigos'}
        </button>
        <p className="text-sm text-muted-foreground">Por segurança, as sessões abertas foram encerradas. Entre de novo com a senha e o código do aplicativo.</p>
        <a href="/login" className="block text-center text-sm underline">Ir para o login</a>
      </div>
    )
  }

  if (s1.qr) {
    return (
      <form action={passo2} className="space-y-4">
        <h2 className="text-lg font-semibold">2. Escaneie e confirme</h2>
        <p className="text-sm text-muted-foreground">Abra o aplicativo autenticador, adicione uma conta lendo o QR e digite o código de 6 dígitos que ele mostrar.</p>
        <Image src={s1.qr.dataUrl} unoptimized alt="QR code para o aplicativo autenticador" className="mx-auto rounded-lg bg-white p-2" width={220} height={220} />
        <p className="text-xs text-muted-foreground break-all text-center">Sem câmera? Digite a chave: <code data-testid="mfa-secret">{s1.qr.segredo}</code></p>
        <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={12} required placeholder="000000" className={`${campo} tracking-widest text-center`} />
        {s2.error && <p role="alert" className="text-sm text-red-400">{s2.error}</p>}
        <button type="submit" disabled={pend2} className={botao}>{pend2 ? 'Confirmando…' : 'Ativar segundo fator'}</button>
      </form>
    )
  }

  return (
    <form action={passo1} className="space-y-4">
      <h2 className="text-lg font-semibold">1. Confirme a sua senha</h2>
      <p className="text-sm text-muted-foreground">Por segurança pedimos a senha de novo antes de cadastrar o aplicativo autenticador.</p>
      <input name="password" type="password" autoComplete="current-password" required placeholder="Sua senha" className={campo} />
      {s1.error && <p role="alert" className="text-sm text-red-400">{s1.error}</p>}
      <button type="submit" disabled={pend1} className={botao}>{pend1 ? 'Verificando…' : 'Continuar'}</button>
    </form>
  )
}
