'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Copy, Check } from 'lucide-react'
import { criarPlanta, type PlantaFormState } from '../actions'

const initialState: PlantaFormState = {}

export default function NovaPlantaPage() {
  const [state, formAction, isPending] = useActionState(criarPlanta, initialState)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (state.success && state.tempPassword) {
    return (
      <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
        <div className="rounded-xl border border-green-900/50 bg-green-950/20 p-6 text-center space-y-4 shadow-lg">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-900/40">
            <Check className="h-6 w-6 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Planta criada com sucesso!</h2>
          <p className="text-sm text-muted-foreground">
            A planta e o primeiro Gestor foram cadastrados. Copie a senha temporária abaixo e envie para o Gestor.
          </p>
          
          <div className="mt-4 rounded-lg bg-card p-4 border border-border">
            <p className="text-xs text-muted-foreground mb-1">E-mail do Gestor</p>
            <p className="font-medium text-foreground">{state.gestorEmail}</p>
            
            <p className="text-xs text-muted-foreground mt-3 mb-1">Senha temporária</p>
            <div className="flex items-center justify-between gap-3 bg-background p-2 rounded border border-border">
              <code className="font-mono text-lg text-green-400 ml-2">{state.tempPassword}</code>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => copyToClipboard(state.tempPassword!)}
                className="h-8 border-border bg-muted text-foreground hover:bg-secondary"
              >
                {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                Copiar
              </Button>
            </div>
          </div>
          
          <div className="pt-4">
            <Link href="/admin/plantas">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                Voltar para Plantas
              </Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-lg px-4 py-8 space-y-6">
      <div className="space-y-1">
        <Link href="/admin/plantas" className="inline-block text-sm text-muted-foreground hover:text-foreground mb-2">
          ← Voltar para Plantas
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Nova Planta</h1>
        <p className="text-sm text-muted-foreground">Cadastre um novo Tenant e seu primeiro Gestor.</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-lg">
        <form action={formAction} className="space-y-5">
          
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">Dados da Planta</h2>
            
            <div className="space-y-1.5">
              <label htmlFor="tenantName" className="text-sm font-medium text-foreground">
                Nome da Planta (Tenant)
              </label>
              <Input
                id="tenantName"
                name="tenantName"
                placeholder="Ex: ETE Norte"
                required
                disabled={isPending}
                className="bg-muted border-border text-foreground focus-visible:ring-ring"
              />
              {state.fieldErrors?.tenantName && (
                <p className="text-xs text-red-400">{state.fieldErrors.tenantName[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="slug" className="text-sm font-medium text-foreground">
                Slug (URL única)
              </label>
              <Input
                id="slug"
                name="slug"
                placeholder="Ex: ete-norte"
                required
                disabled={isPending}
                className="bg-muted border-border text-foreground focus-visible:ring-ring"
              />
              {state.fieldErrors?.slug && (
                <p className="text-xs text-red-400">{state.fieldErrors.slug[0]}</p>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <h2 className="text-sm font-semibold text-foreground border-b border-border pb-2">Primeiro Gestor</h2>
            
            <div className="space-y-1.5">
              <label htmlFor="gestorName" className="text-sm font-medium text-foreground">
                Nome do Gestor
              </label>
              <Input
                id="gestorName"
                name="gestorName"
                placeholder="Ex: João Silva"
                required
                disabled={isPending}
                className="bg-muted border-border text-foreground focus-visible:ring-ring"
              />
              {state.fieldErrors?.gestorName && (
                <p className="text-xs text-red-400">{state.fieldErrors.gestorName[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="gestorEmail" className="text-sm font-medium text-foreground">
                E-mail do Gestor
              </label>
              <Input
                id="gestorEmail"
                name="gestorEmail"
                type="email"
                placeholder="joao@etenorte.com.br"
                required
                disabled={isPending}
                className="bg-muted border-border text-foreground focus-visible:ring-ring"
              />
              {state.fieldErrors?.gestorEmail && (
                <p className="text-xs text-red-400">{state.fieldErrors.gestorEmail[0]}</p>
              )}
            </div>
          </div>

          {state.error && (
            <p className="rounded-md border border-red-800/50 bg-red-950/40 px-3 py-2 text-sm text-red-400">
              {state.error}
            </p>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isPending ? 'Criando…' : 'Criar Planta e Gestor'}
          </Button>
        </form>
      </div>
    </main>
  )
}
