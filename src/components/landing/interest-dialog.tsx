'use client'

import { useState, type ReactNode } from 'react'
import { z } from 'zod'
import { CheckCircle2, MessageCircle } from 'lucide-react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SALES_WHATSAPP, waLink } from './config'

const schema = z.object({
  nome: z.string().trim().min(2, 'Informe seu nome').max(100),
  empresa: z.string().trim().min(2, 'Informe a empresa').max(120),
  cargo: z.string().trim().min(2, 'Informe seu cargo').max(80),
  whatsapp: z.string().trim().max(20).regex(/^[\d\s()+-]{10,20}$/, 'WhatsApp inválido'),
  email: z.string().trim().email('E-mail inválido').max(255),
  mensagem: z.string().trim().max(1000).optional(),
  consentimento: z.literal(true, { message: 'É preciso aceitar para continuar' }),
})
type Data = z.infer<typeof schema>

function utmParams() {
  if (typeof window === 'undefined') return ''
  const p = new URLSearchParams(window.location.search)
  return ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid']
    .filter((k) => p.get(k))
    .map((k) => `${k}=${p.get(k)}`)
    .join(' | ')
}

export function InterestDialog({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState<Data | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    if (fd.get('site')) return // honeypot
    const r = schema.safeParse({
      ...Object.fromEntries(fd),
      consentimento: fd.get('consentimento') === 'on',
    })
    if (!r.success) {
      const errs: Record<string, string> = {}
      r.error.issues.forEach((i) => (errs[String(i.path[0])] = i.message))
      setErrors(errs)
      return
    }
    setErrors({})
    // Não envia nem armazena: a entrega comercial depende do número do WhatsApp (config).
    setSent(r.data)
  }

  const field = (name: keyof Data, label: string, props: React.ComponentProps<typeof Input> = {}) => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} aria-invalid={!!errors[name]} className="h-11 rounded-xl" {...props} />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]}</p>}
    </div>
  )

  return (
    <Dialog onOpenChange={(o) => !o && setSent(null)}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-lg sm:max-w-lg">
        {sent ? (
          <div className="py-6 text-center">
            <CheckCircle2 className="mx-auto size-14 text-success" />
            <h3 className="mt-4 text-2xl font-semibold">Mensagem preparada</h3>
            <p className="mt-2 text-muted-foreground">
              {SALES_WHATSAPP
                ? 'Seu contato ainda não foi enviado. Continue no WhatsApp para enviar a mensagem.'
                : 'O contato comercial ainda não está disponível nesta apresentação. Seus dados não foram enviados nem armazenados.'}
            </p>
            {SALES_WHATSAPP && (
              <Button asChild variant="hero" size="xl" className="mt-6">
                <a
                  href={waLink(
                    `Olá! Sou ${sent.nome}, ${sent.cargo} na ${sent.empresa}. Tenho interesse no Solentis.${utmParams() ? ` [${utmParams()}]` : ''}`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle /> Falar agora no WhatsApp
                </a>
              </Button>
            )}
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Tenho interesse</DialogTitle>
              <DialogDescription>
                {SALES_WHATSAPP
                  ? 'Conte sobre sua operação e continue a conversa pelo WhatsApp.'
                  : 'O envio comercial será disponibilizado na integração com a plataforma.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4" noValidate>
              <input type="text" name="site" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
              {field('nome', 'Nome', { autoComplete: 'name' })}
              <div className="grid gap-4 sm:grid-cols-2">
                {field('empresa', 'Empresa', { autoComplete: 'organization' })}
                {field('cargo', 'Cargo', { autoComplete: 'organization-title' })}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {field('whatsapp', 'WhatsApp', { type: 'tel', inputMode: 'tel', autoComplete: 'tel' })}
                {field('email', 'E-mail', { type: 'email', autoComplete: 'email' })}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mensagem">Mensagem (opcional)</Label>
                <Textarea id="mensagem" name="mensagem" rows={3} maxLength={1000} className="rounded-xl" />
              </div>
              <label className="flex items-start gap-3 text-sm text-muted-foreground">
                <input type="checkbox" name="consentimento" className="mt-1 size-4 accent-primary" />
                <span>
                  Concordo com o uso dos meus dados para contato comercial, conforme a{' '}
                  <a href="/privacidade" className="font-medium text-primary underline">
                    Política de Privacidade
                  </a>{' '}
                  (LGPD).
                </span>
              </label>
              {errors['consentimento'] && <p className="text-xs text-destructive">{errors['consentimento']}</p>}
              <Button type="submit" variant="hero" size="xl" className="w-full" disabled={!SALES_WHATSAPP}>
                Continuar no WhatsApp
              </Button>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
