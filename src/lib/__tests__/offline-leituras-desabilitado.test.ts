/**
 * T-01 — guarda de regressão do modo offline de leituras.
 *
 * A fila antiga (`localStorage['solentis_offline_leituras']` + SyncManager)
 * prometia "leitura salva localmente", reenviava com campos errados e apagava a
 * fila mesmo quando o servidor recusava. Até a nova fila offline (T-15, IndexedDB
 * + idempotência), nenhum código pode gravar, reenviar ou apagar essa fila.
 * O comportamento na tela é coberto pelo E2E `tests/t01-offline-leitura.spec.ts`.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const LEGACY_QUEUE_KEY = 'solentis_offline_leituras'

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules' || entry === '__tests__') continue
      walk(full, acc)
    } else if (/\.tsx?$/.test(entry)) {
      acc.push(full)
    }
  }
  return acc
}

const SRC = join(process.cwd(), 'src')
const FILES = walk(SRC).map((f) => ({ f, text: readFileSync(f, 'utf-8') }))

describe('modo offline de leituras desabilitado (T-01)', () => {
  it('nenhum código grava, lê ou apaga a fila offline antiga', () => {
    const usos = FILES.filter(({ text }) => text.includes(LEGACY_QUEUE_KEY)).map(({ f }) => f)
    expect(usos).toEqual([])
  })

  it('nenhum componente de sincronização automática é montado', () => {
    const usos = FILES.filter(({ text }) => /\bSyncManager\b|sync-manager/.test(text)).map(({ f }) => f)
    expect(usos).toEqual([])
  })

  it('formulário de leitura bloqueia o envio offline sem falsa confirmação', () => {
    const form = readFileSync(join(SRC, 'app/operador/leituras/novo/reading-form.tsx'), 'utf-8')
    const ramoOffline = form.slice(form.indexOf('if (!navigator.onLine)'), form.indexOf('setOfflineError(false)'))
    expect(ramoOffline).toContain('e.preventDefault()')
    expect(ramoOffline).toContain('setOfflineError(true)')
    expect(ramoOffline).not.toMatch(/alert\(|router\.push|localStorage/)
  })
})
