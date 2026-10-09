import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { planejar, resumo, type LinhaOrigem } from '@/lib/blob-migration'

const L = (valor: string | null, over: Partial<LinhaOrigem> = {}): LinhaOrigem =>
  ({ alvo: 'equipment.photo_url', id: 'e1', tenant_id: 'T1', valor, ...over })
const U = (f: string) => `https://abc.public.blob.vercel-storage.com/equipments/${f}`

describe('planejar', () => {
  it('URL pública vira <planta>/<pasta>/<arquivo> conforme o campo', () => {
    const p = planejar([
      L(U('a.png')),
      L(U('m.pdf'), { alvo: 'equipment.manual_url' }),
      L('https://abc.public.blob.vercel-storage.com/readings/r.jpg', { alvo: 'reading.photo_filename', id: 'r1' }),
      L('https://abc.public.blob.vercel-storage.com/occurrences/o.jpg', { alvo: 'occurrence_photo.filename', id: 'o1' }),
      L('https://abc.public.blob.vercel-storage.com/tasks/t.jpg', { alvo: 'shift_task_photo.filename', id: 't1' }),
    ])
    expect(p.itens.map((i) => i.para)).toEqual([
      'T1/equipments/a.png', 'T1/equipments/m.pdf', 'T1/readings/r.jpg', 'T1/occurrences/o.jpg', 'T1/tasks/t.jpg',
    ])
    expect(p.conflitos).toEqual([])
  })

  it('usa a planta da própria linha (nunca de outra)', () => {
    const p = planejar([L(U('a.png'), { tenant_id: 'T2' })])
    expect(p.itens[0].para.startsWith('T2/')).toBe(true)
  })

  it('ignora vazio, caminho já privado, arquivo de disco, host estranho e nome inválido', () => {
    const p = planejar([
      L(null), L(''), L('T1/equipments/x.png'), L('x.png'),
      L('https://evil.example.com/a.png'), L('https://abc.blob.vercel-storage.com.evil.com/a.png'),
      L('http://abc.public.blob.vercel-storage.com/a.png'),
      L('https://abc.public.blob.vercel-storage.com/equipments/'),
      L('https://abc.public.blob.vercel-storage.com/equipments/%2E%2E'),
      L(U('a.png'), { tenant_id: '../x' }),
    ])
    expect(p.itens).toEqual([])
    expect(resumo(p)).toMatchObject({ a_migrar: 0, ignorado_vazio: 2, ignorado_ja_privado: 1, ignorado_disco_local: 1, ignorado_host_estranho: 3, ignorado_nome_invalido: 3 })
  })

  it('rodar de novo depois de migrar não planeja nada (idempotente)', () => {
    const p1 = planejar([L(U('a.png'))])
    const depois = p1.itens.map((i) => L(i.para, { id: i.id }))
    expect(planejar(depois).itens).toEqual([])
  })

  it('dois arquivos diferentes para o mesmo destino viram conflito, não sobrescrita', () => {
    const p = planejar([
      L(U('a.png'), { id: 'e1' }),
      L('https://zzz.public.blob.vercel-storage.com/equipments/a.png', { id: 'e2' }),
    ])
    expect(p.itens).toHaveLength(1)
    expect(p.conflitos).toHaveLength(1)
  })

  it('a mesma URL em duas linhas (cópia de equipamento) migra as duas para o mesmo destino', () => {
    const p = planejar([L(U('a.png'), { id: 'e1' }), L(U('a.png'), { id: 'e2' })])
    expect(p.itens).toHaveLength(2)
    expect(p.conflitos).toEqual([])
  })
})

describe('script de migração', () => {
  const s = readFileSync('scripts/ops/migrate-blobs-private.ts', 'utf8')
  it('é ensaio por padrão e só escreve com --apply', () => {
    expect(s).toMatch(/const aplicar = args\.includes\('--apply'\)/)
    expect(s.indexOf("if (!aplicar)")).toBeLessThan(s.indexOf('await put('))
  })
  it('exige BLOB_ACCESS=private e --confirm-host', () => {
    expect(s).toMatch(/BLOB_ACCESS !== 'private'/)
    expect(s).toMatch(/hostConfirmado !== dbHost/)
  })
  it('nunca apaga (nem do Blob nem do banco) e troca só se a linha ainda tem a URL antiga', () => {
    expect(s).not.toMatch(/\bdel\(|\.delete\(|deleteMany|\.unlink/)
    expect(s).toMatch(/updateMany/)
    expect(s).toMatch(/allowOverwrite: false/)
  })
  it('grava a cópia antes de trocar a linha', () => {
    expect(s.indexOf('await put(')).toBeLessThan(s.indexOf('await trocar('))
  })
})
