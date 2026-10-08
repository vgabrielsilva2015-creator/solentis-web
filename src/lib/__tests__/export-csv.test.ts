import { describe, it, expect } from 'vitest'
import { csvSafe, lerPeriodo, diaBR, csvStream, EXPORT_PAGE_SIZE, EXPORT_MAX_DAYS } from '@/lib/export-csv'

describe('lerPeriodo', () => {
  it.each([[null, null], ['2026-01-01', null], [null, '2026-01-31'], ['', '']])('sem período (%j, %j) é recusado', (a, b) => {
    expect(lerPeriodo(a, b).erro).toMatch(/Informe o período/)
  })
  it.each([['01/01/2026', '2026-01-31'], ['2026-02-31', '2026-03-01'], ['2026-13-01', '2026-13-02'], ['ontem', 'hoje']])('data inválida (%j, %j)', (a, b) => {
    expect(lerPeriodo(a, b).erro).toMatch(/inválido/)
  })
  it('data final antes da inicial', () => expect(lerPeriodo('2026-03-02', '2026-03-01').erro).toMatch(/anterior/))
  it('período acima do máximo é recusado, o máximo exato passa', () => {
    expect(lerPeriodo('2025-01-01', '2026-01-02').erro).toMatch(/grande demais/)
    expect(lerPeriodo('2025-01-01', '2025-12-31').erro).toBeUndefined()
    expect(EXPORT_MAX_DAYS).toBe(366)
  })
  it('intervalo [início 00:00 Brasília, dia seguinte 00:00) em UTC', () => {
    const { periodo } = lerPeriodo('2026-03-10', '2026-03-10')
    expect(periodo!.from.toISOString()).toBe('2026-03-10T03:00:00.000Z')
    expect(periodo!.to.toISOString()).toBe('2026-03-11T03:00:00.000Z')
  })
})

describe('diaBR', () => {
  it('usa o dia de Brasília (23h BRT ainda é o mesmo dia; 01h UTC do dia seguinte não vira o dia)', () => {
    expect(diaBR(0, new Date('2026-03-11T01:30:00Z'))).toBe('2026-03-10')
    expect(diaBR(-30, new Date('2026-03-11T12:00:00Z'))).toBe('2026-02-09')
  })
})

describe('csvSafe', () => {
  it.each([['=1+1', `"'=1+1"`], ['@cmd', `"'@cmd"`], ['-5', `"'-5"`], ['normal', '"normal"'], ['a"b', '"a""b"'], [null, '""']])('%j', (v, esperado) => {
    expect(csvSafe(v)).toBe(esperado)
  })
})

describe('csvStream', () => {
  async function ler(s: ReadableStream<Uint8Array>) {
    const r = s.getReader(); const dec = new TextDecoder('utf-8', { ignoreBOM: true }); let out = ''; let chunks = 0
    for (;;) { const { done, value } = await r.read(); if (done) break; out += dec.decode(value); chunks++ }
    return { out, chunks }
  }
  const itens = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `id${String(i).padStart(6, '0')}`, v: `=cmd${i}` }))

  it('entrega TODAS as linhas (50 mil), em páginas, sem cortar em 1000', async () => {
    const todos = itens(50_000)
    const pedidos: number[] = []
    const fonte = {
      headers: ['ID', 'Valor'],
      pagina: async (cursor: string | null, take: number) => {
        pedidos.push(take)
        const ini = cursor ? todos.findIndex((t) => t.id === cursor) + 1 : 0
        return todos.slice(ini, ini + take)
      },
      linha: (i: { id: string; v: string }) => [i.id, i.v],
    }
    const { out, chunks } = await ler(csvStream(fonte))
    const linhas = out.replace(/^﻿/, '').split('\n').filter(Boolean)
    expect(linhas).toHaveLength(50_001) // cabeçalho + 50 mil
    expect(linhas[0]).toBe('ID;Valor')
    expect(linhas[1]).toBe(`"id000000";"'=cmd0"`) // injeção neutralizada
    expect(out.startsWith('﻿')).toBe(true)
    expect(Math.max(...pedidos)).toBe(EXPORT_PAGE_SIZE)
    expect(pedidos.length).toBeGreaterThanOrEqual(50)
    expect(chunks).toBeGreaterThan(50) // veio aos poucos, não de uma vez
  })

  it('não busca a próxima página antes de o leitor pedir (memória constante)', async () => {
    let buscas = 0
    const fonte = { headers: ['ID'], pagina: async () => { buscas++; return itens(EXPORT_PAGE_SIZE) }, linha: (i: { id: string }) => [i.id] }
    const r = csvStream(fonte).getReader()
    await r.read(); await r.read()
    expect(buscas).toBeLessThanOrEqual(2)
    await r.cancel()
  })

  it('sem linhas: só o cabeçalho', async () => {
    const { out } = await ler(csvStream({ headers: ['A', 'B'], pagina: async () => [] as Array<{ id: string }>, linha: () => [] }))
    expect(out).toBe('﻿A;B\n')
  })
})
