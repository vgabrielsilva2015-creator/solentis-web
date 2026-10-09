/**
 * T-26 — planejamento (puro, sem rede nem banco) da migração de arquivos do Blob público para o
 * privado. Cada linha do banco que guarda uma URL pública do nosso Blob vira um item
 * `<planta>/<pasta>/<arquivo>`. O script `scripts/ops/migrate-blobs-private.ts` usa isto.
 */
export type AlvoMigracao = 'equipment.photo_url' | 'equipment.manual_url' | 'reading.photo_filename' | 'occurrence_photo.filename' | 'shift_task_photo.filename'

export const PASTA_POR_ALVO: Record<AlvoMigracao, string> = {
  'equipment.photo_url': 'equipments',
  'equipment.manual_url': 'equipments',
  'reading.photo_filename': 'readings',
  'occurrence_photo.filename': 'occurrences',
  'shift_task_photo.filename': 'tasks',
}

export interface LinhaOrigem { alvo: AlvoMigracao; id: string; tenant_id: string; valor: string | null }
export interface ItemPlano { alvo: AlvoMigracao; id: string; tenant_id: string; de: string; para: string }
export type MotivoIgnorado = 'vazio' | 'ja_privado' | 'disco_local' | 'host_estranho' | 'nome_invalido'
export interface Plano { itens: ItemPlano[]; ignorados: { alvo: AlvoMigracao; id: string; motivo: MotivoIgnorado }[]; conflitos: string[] }

const HOST_BLOB = '.blob.vercel-storage.com'
const SEGMENTO = /^[A-Za-z0-9._-]+$/
const ok = (s: string) => SEGMENTO.test(s) && s !== '.' && s !== '..'

export function planejar(linhas: LinhaOrigem[]): Plano {
  const itens: ItemPlano[] = []
  const ignorados: Plano['ignorados'] = []
  const conflitos: string[] = []
  const destinos = new Map<string, string>() // para -> de

  for (const l of linhas) {
    const v = l.valor
    if (!v) { ignorados.push({ alvo: l.alvo, id: l.id, motivo: 'vazio' }); continue }
    if (!/^https?:\/\//i.test(v)) {
      ignorados.push({ alvo: l.alvo, id: l.id, motivo: v.includes('/') ? 'ja_privado' : 'disco_local' })
      continue
    }
    let url: URL
    try { url = new URL(v) } catch { ignorados.push({ alvo: l.alvo, id: l.id, motivo: 'nome_invalido' }); continue }
    if (url.protocol !== 'https:' || !url.hostname.endsWith(HOST_BLOB)) {
      ignorados.push({ alvo: l.alvo, id: l.id, motivo: 'host_estranho' }); continue
    }
    let nome = ''
    try { nome = decodeURIComponent(url.pathname.split('/').pop() ?? '') } catch { /* cai na validação */ }
    if (!ok(nome) || !ok(l.tenant_id)) { ignorados.push({ alvo: l.alvo, id: l.id, motivo: 'nome_invalido' }); continue }

    const para = `${l.tenant_id}/${PASTA_POR_ALVO[l.alvo]}/${nome}`
    const anterior = destinos.get(para)
    if (anterior && anterior !== v) { conflitos.push(`${para} <- ${anterior} e ${v}`); continue }
    destinos.set(para, v)
    itens.push({ alvo: l.alvo, id: l.id, tenant_id: l.tenant_id, de: v, para })
  }
  return { itens, ignorados, conflitos }
}

export function resumo(p: Plano): Record<string, number> {
  const r: Record<string, number> = { a_migrar: p.itens.length, conflitos: p.conflitos.length }
  for (const i of p.ignorados) r[`ignorado_${i.motivo}`] = (r[`ignorado_${i.motivo}`] ?? 0) + 1
  return r
}
