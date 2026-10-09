/**
 * T-26 (P-18): Blob privado com caminho por planta, banco guarda caminho (não URL),
 * leitura só da própria planta, arquivos antigos (URL pública) continuam legíveis.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const put = vi.fn()
const get = vi.fn()
vi.mock('@vercel/blob', () => ({
  put: (...a: unknown[]) => put(...a),
  get: (...a: unknown[]) => get(...a),
}))

const S = await import('@/lib/storage')
const dados = Buffer.from('conteudo')

const stream = (txt: string) => new Response(txt).body
beforeEach(() => {
  put.mockReset(); get.mockReset()
  vi.unstubAllEnvs()
  vi.stubEnv('VERCEL', '1')
})

describe('gravação', () => {
  it('padrão (sem BLOB_ACCESS): comportamento antigo, Blob público e URL', async () => {
    put.mockResolvedValueOnce({ url: 'https://abc.public.blob.vercel-storage.com/equipments/x.pdf' })
    const r = await S.saveUpload('equipments', 'x.pdf', dados, 'application/pdf', 'T1')
    expect(put).toHaveBeenCalledWith('equipments/x.pdf', dados, expect.objectContaining({ access: 'public' }))
    expect(r).toMatch(/^https:\/\//)
    expect(S.blobAccess()).toBe('public')
  })

  it('BLOB_ACCESS=private: grava privado em <planta>/<pasta>/<arquivo> e devolve o CAMINHO, não URL', async () => {
    vi.stubEnv('BLOB_ACCESS', 'private')
    put.mockResolvedValueOnce({ url: 'https://abc.private.blob.vercel-storage.com/T1/equipments/x.pdf' })
    const r = await S.saveUpload('equipments', 'x.pdf', dados, 'application/pdf', 'T1')
    expect(put).toHaveBeenCalledWith('T1/equipments/x.pdf', dados, expect.objectContaining({ access: 'private', addRandomSuffix: false }))
    expect(r).toBe('T1/equipments/x.pdf')
    expect(r).not.toMatch(/^https?:/)
  })

  it('valor diferente de "private" mantém o público (nada de ativar por engano)', () => {
    vi.stubEnv('BLOB_ACCESS', 'PRIVATE')
    expect(S.blobAccess()).toBe('public')
    vi.stubEnv('BLOB_ACCESS', 'true')
    expect(S.blobAccess()).toBe('public')
  })

  it.each([
    ['sem planta', undefined, 'equipments', 'x.pdf'],
    ['planta com barra', 'T1/../T2', 'equipments', 'x.pdf'],
    ['planta com ..', '..', 'equipments', 'x.pdf'],
    ['pasta com barra', 'T1', 'a/b', 'x.pdf'],
    ['arquivo com barra', 'T1', 'equipments', '../x.pdf'],
    ['arquivo vazio', 'T1', 'equipments', ''],
  ])('privado recusa %s', async (_n, tenant, pasta, nome) => {
    vi.stubEnv('BLOB_ACCESS', 'private')
    await expect(S.saveUpload(pasta, nome, dados, 'application/pdf', tenant as string)).rejects.toThrow(/privado exige/)
    expect(put).not.toHaveBeenCalled()
  })
})

describe('leitura do Blob privado', () => {
  it('lê o caminho da própria planta (via get privado)', async () => {
    get.mockResolvedValueOnce({ statusCode: 200, stream: stream('abc'), headers: new Headers(), blob: {} })
    const buf = await S.readUpload('equipments', 'T1/equipments/x.pdf', 'T1')
    expect(buf?.toString()).toBe('abc')
    expect(get).toHaveBeenCalledWith('T1/equipments/x.pdf', { access: 'private' })
  })

  it.each([
    ['caminho de outra planta', 'T2/equipments/x.pdf', 'equipments', 'T1'],
    ['pasta diferente da esperada', 'T1/occurrences/x.pdf', 'equipments', 'T1'],
    ['sem planta no pedido', 'T1/equipments/x.pdf', 'equipments', undefined],
    ['com ..', 'T1/equipments/..', 'equipments', 'T1'],
    ['mais de 3 partes', 'T1/equipments/a/x.pdf', 'equipments', 'T1'],
    ['menos de 3 partes', 'T1/x.pdf', 'equipments', 'T1'],
    ['planta com ..', '../equipments/x.pdf', 'equipments', '..'],
  ])('recusa %s sem chamar o Blob', async (_n, stored, pasta, tenant) => {
    expect(await S.readUpload(pasta, stored, tenant)).toBeNull()
    expect(get).not.toHaveBeenCalled()
  })

  it('arquivo inexistente, 304 ou erro do Blob → null', async () => {
    get.mockResolvedValueOnce(null)
    expect(await S.readUpload('equipments', 'T1/equipments/x.pdf', 'T1')).toBeNull()
    get.mockResolvedValueOnce({ statusCode: 304, stream: null })
    expect(await S.readUpload('equipments', 'T1/equipments/x.pdf', 'T1')).toBeNull()
    get.mockRejectedValueOnce(new Error('boom'))
    expect(await S.readUpload('equipments', 'T1/equipments/x.pdf', 'T1')).toBeNull()
  })
})

describe('arquivos antigos e disco', () => {
  it('URL pública antiga do nosso Blob continua legível', async () => {
    const f = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('velho'))
    const buf = await S.readUpload('equipments', 'https://abc.public.blob.vercel-storage.com/equipments/x.pdf', 'T1')
    expect(buf?.toString()).toBe('velho')
    expect(f).toHaveBeenCalledTimes(1)
    f.mockRestore()
  })

  it.each([
    'https://evil.example.com/x.pdf',
    'https://abc.blob.vercel-storage.com.evil.com/x.pdf',
    'http://abc.public.blob.vercel-storage.com/x.pdf',
    'https://169.254.169.254/latest/meta-data',
  ])('URL fora do nosso Blob (%s) não é buscada', async (url) => {
    const f = vi.spyOn(globalThis, 'fetch')
    expect(await S.readUpload('equipments', url, 'T1')).toBeNull()
    expect(f).not.toHaveBeenCalled()
    f.mockRestore()
  })

  it.each(['..', '.', '../x', 'a\\b', ''])('nome de disco inválido (%j) é recusado', async (nome) => {
    expect(await S.readUpload('equipments', nome, 'T1')).toBeNull()
  })
})

describe('o resto do sistema', () => {
  const raiz = join(process.cwd(), 'src')
  const arquivos = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    return statSync(p).isDirectory() ? (n === '__tests__' ? [] : arquivos(p)) : /\.tsx?$/.test(n) ? [p] : []
  })

  it('toda chamada de saveUpload/saveImageUpload/readUpload informa a planta', () => {
    const faltando: string[] = []
    for (const f of arquivos(raiz)) {
      if (f.endsWith('lib/storage.ts')) continue
      const linhas = readFileSync(f, 'utf-8').split('\n')
      linhas.forEach((l, i) => {
        if (/\b(saveUpload|saveImageUpload|readUpload)\(/.test(l) && !/import /.test(l)) {
          if (!/tenantId|tenant_id|getTenantId\(\)|ctx\.tenantId/.test(l)) faltando.push(`${f.replace(raiz + '/', '')}:${i + 1}`)
        }
      })
    }
    expect(faltando).toEqual([])
  })

  it('as páginas de equipamento não mandam URL do arquivo para o navegador', () => {
    for (const p of ['app/gestor/(manutencao)/equipamentos/[id]', 'app/tecnico/equipamentos/[id]']) {
      const page = readFileSync(join(raiz, p, 'page.tsx'), 'utf-8')
      const form = readFileSync(join(raiz, p, 'edit-form.tsx'), 'utf-8')
      expect(page).not.toMatch(/\bphoto_url:\s+equipment\.photo_url/)
      expect(page).not.toMatch(/\bmanual_url:\s+equipment\.manual_url/)
      expect(page).toMatch(/has_photo:\s+!!equipment\.photo_url/)
      expect(form).not.toMatch(/photo_url|manual_url/)
    }
  })
})
