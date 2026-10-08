/**
 * T-20 (decisão 2) — toda resolução de ocorrência registra responsável,
 * data/hora e a ação tomada; evidência opcional; resolução gravada uma vez;
 * reabrir mantém a resolução anterior na auditoria.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

const findFirst = vi.fn()
const updateMany = vi.fn()
const photoCreate = vi.fn()
const logAudit = vi.fn()
const saveImageUpload = vi.fn()
const tx = { occurrence: { findFirst: (a: unknown) => findFirst(a), updateMany: (a: unknown) => updateMany(a) }, occurrencePhoto: { create: (a: unknown) => photoCreate(a) } }
vi.mock('@/lib/prisma', () => ({
  prisma: { ...tx, $transaction: (fn: (t: typeof tx) => unknown) => fn(tx) },
}))
vi.mock('@/lib/audit', () => ({ logAudit: (_t: unknown, p: unknown) => logAudit(p) }))
vi.mock('@/lib/storage', () => ({ saveImageUpload: (...a: unknown[]) => saveImageUpload(...a) }))

const ctx = { userId: 'u-op', tenantId: 'A', role: 'OPERATOR' as const, email: 'o@a', name: 'Operador' }
const foto = (type = 'image/jpeg') => new File([new Uint8Array([1, 2, 3])], 'evidencia.jpg', { type })

describe('resolver ocorrência', async () => {
  const { resolverOcorrencia, reabrirOcorrencia, evidenciaDoForm } = await import('@/server/occurrences/resolve')
  beforeEach(() => {
    for (const m of [findFirst, updateMany, photoCreate, logAudit, saveImageUpload]) m.mockReset()
    findFirst.mockResolvedValue({ status: 'OPEN' })
    updateMany.mockResolvedValue({ count: 1 })
    saveImageUpload.mockResolvedValue('arquivo-salvo.jpg')
  })

  it.each([[undefined], [''], ['   '], ['ok'], ['Resolvido']])('ação vazia ou curta (%j) é recusada sem tocar no banco', async (notas) => {
    const r = await resolverOcorrencia(ctx, 'oc1', notas, null, 'tela')
    expect(r).toMatchObject({ ok: false, field: 'resolution_notes' })
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('grava responsável, data/hora e a ação (sem espaços sobrando) e audita tudo', async () => {
    const antes = Date.now()
    const r = await resolverOcorrencia(ctx, 'oc1', '  Troquei a gaxeta da bomba B2  ', null, 'kanban')
    expect(r.ok).toBe(true)
    const arg = updateMany.mock.calls[0][0]
    expect(arg.where).toEqual({ id: 'oc1', tenant_id: 'A', status: { not: 'RESOLVED' } })
    expect(arg.data).toMatchObject({ status: 'RESOLVED', resolved_by: 'u-op', resolution_notes: 'Troquei a gaxeta da bomba B2' })
    expect(arg.data.resolved_at.getTime()).toBeGreaterThanOrEqual(antes)
    const audit = logAudit.mock.calls[0][0]
    expect(audit).toMatchObject({ tenantId: 'A', userId: 'u-op', tableName: 'occurrences', recordId: 'oc1', before: { status: 'OPEN' } })
    expect(audit.after).toMatchObject({ status: 'RESOLVED', resolved_by: 'u-op', resolution_notes: 'Troquei a gaxeta da bomba B2', via: 'kanban', evidencia: null })
    expect(typeof audit.after.resolved_at).toBe('string')
  })

  it('ocorrência já resolvida não é resolvida de novo (responsável e data originais ficam)', async () => {
    findFirst.mockResolvedValue({ status: 'RESOLVED' })
    expect(await resolverOcorrencia(ctx, 'oc1', 'Ação descrita aqui', null, 'tela')).toEqual({ ok: false, error: 'Ocorrência já encerrada.' })
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('duas resoluções ao mesmo tempo: a segunda não grava nem audita', async () => {
    updateMany.mockResolvedValue({ count: 0 })
    expect(await resolverOcorrencia(ctx, 'oc1', 'Ação descrita aqui', null, 'tela')).toEqual({ ok: false, error: 'Ocorrência já encerrada.' })
    expect(logAudit).not.toHaveBeenCalled()
  })

  it('foto de evidência entra como RESOLUTION e aparece na auditoria', async () => {
    await resolverOcorrencia(ctx, 'oc1', 'Ação descrita aqui', foto(), 'tela')
    expect(photoCreate.mock.calls[0][0].data).toMatchObject({ kind: 'RESOLUTION', occurrence_id: 'oc1', uploaded_by: 'u-op', filename: 'arquivo-salvo.jpg', tenant_id: 'A' })
    expect(logAudit.mock.calls[0][0].after.evidencia).toBe('evidencia.jpg')
  })

  it('evidência que não é foto é recusada antes de gravar', async () => {
    const r = await resolverOcorrencia(ctx, 'oc1', 'Ação descrita aqui', foto('application/pdf'), 'tela')
    expect(r).toMatchObject({ ok: false, field: 'evidence' })
    expect(saveImageUpload).not.toHaveBeenCalled()
    expect(updateMany).not.toHaveBeenCalled()
  })

  it('campo de foto vazio do navegador conta como "sem evidência"', () => {
    const fd = new FormData()
    fd.set('evidence', new File([], ''))
    expect(evidenciaDoForm(fd)).toBeNull()
    fd.set('evidence', foto())
    expect(evidenciaDoForm(fd)).not.toBeNull()
  })

  it('reabrir limpa a resolução atual e guarda a anterior na auditoria', async () => {
    const quando = new Date('2026-10-08T10:00:00Z')
    findFirst.mockResolvedValue({ resolved_at: quando, resolved_by: 'u-tec', resolution_notes: 'Trocada a válvula' })
    expect(await reabrirOcorrencia(ctx, 'oc1', 'IN_PROGRESS')).toBe(true)
    expect(updateMany.mock.calls[0][0]).toEqual({
      where: { id: 'oc1', tenant_id: 'A', status: 'RESOLVED' },
      data: { status: 'IN_PROGRESS', resolved_at: null, resolved_by: null, resolution_notes: null },
    })
    expect(logAudit.mock.calls[0][0].before).toEqual({
      status: 'RESOLVED', resolved_by: 'u-tec', resolved_at: quando.toISOString(), resolution_notes: 'Trocada a válvula',
    })
  })
})

describe('não existe outro caminho que resolva ocorrência', () => {
  function walk(dir: string, acc: string[] = []): string[] {
    for (const e of readdirSync(dir)) {
      const full = join(dir, e)
      if (statSync(full).isDirectory()) { if (e !== '__tests__') walk(full, acc) }
      else if (/\.tsx?$/.test(e)) acc.push(full)
    }
    return acc
  }
  it('só src/server/occurrences/resolve.ts grava resolved_by / resolution_notes', () => {
    const src = join(process.cwd(), 'src')
    const fora = walk(src)
      .filter((f) => /\b(resolved_by|resolution_notes)\s*:\s*(?!true\b)/.test(readFileSync(f, 'utf-8').replace(/select:\s*\{[^}]*\}/g, '')))
      .map((f) => relative(src, f))
      .filter((f) => !f.startsWith(join('server', 'occurrences')) && f !== join('lib', 'occurrence-resolution.ts')) // schema da tela
    expect(fora).toEqual([])
  })
})
