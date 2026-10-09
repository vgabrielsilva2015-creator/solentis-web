/**
 * T-26 — copia arquivos do Blob PÚBLICO para o PRIVADO (`<planta>/<pasta>/<arquivo>`) e troca a URL
 * guardada no banco pelo caminho. Roda na máquina do dono, nunca em CI.
 *
 *   # 1) ensaio (padrão): só lista o que faria; não escreve nada
 *   DATABASE_URL=... npx tsx scripts/ops/migrate-blobs-private.ts
 *
 *   # 2) de verdade — precisa do Blob store PRIVADO conectado e BLOB_ACCESS=private
 *   DATABASE_URL=... BLOB_READ_WRITE_TOKEN=<token do store privado> \
 *     npx tsx scripts/ops/migrate-blobs-private.ts --apply --confirm-host <host do DATABASE_URL>
 *
 * Segurança:
 * - nunca apaga nada: o arquivo público antigo fica onde está (remova só depois de conferir);
 * - a cópia é gravada ANTES de a linha do banco ser trocada; se a cópia falha, a linha não muda;
 * - cada linha é trocada só se ainda tiver a URL antiga (`updateMany ... where valor = antigo`);
 * - pode ser rodado de novo: linhas já migradas viram "ja_privado" e são ignoradas;
 * - não imprime URLs, tokens nem conteúdo, só contagens e ids.
 */
import { PrismaClient } from '@prisma/client'
import { put } from '@vercel/blob'
import { planejar, resumo, type LinhaOrigem } from '../../src/lib/blob-migration'

const args = process.argv.slice(2)
const aplicar = args.includes('--apply')
const hostConfirmado = args[args.indexOf('--confirm-host') + 1]

async function main() {
  const prisma = new PrismaClient()
  try {
    const dbHost = new URL(process.env.DATABASE_URL ?? 'postgres://x@invalido/x').hostname
    const [eq, rd, op, tp] = await Promise.all([
      prisma.equipment.findMany({ select: { id: true, tenant_id: true, photo_url: true, manual_url: true } }),
      prisma.reading.findMany({ where: { photo_filename: { not: null } }, select: { id: true, tenant_id: true, photo_filename: true } }),
      prisma.occurrencePhoto.findMany({ select: { id: true, tenant_id: true, filename: true } }),
      prisma.shiftTaskPhoto.findMany({ select: { id: true, tenant_id: true, filename: true } }),
    ])
    const linhas: LinhaOrigem[] = [
      ...eq.flatMap((e) => [
        { alvo: 'equipment.photo_url' as const, id: e.id, tenant_id: e.tenant_id, valor: e.photo_url },
        { alvo: 'equipment.manual_url' as const, id: e.id, tenant_id: e.tenant_id, valor: e.manual_url },
      ]),
      ...rd.map((r) => ({ alvo: 'reading.photo_filename' as const, id: r.id, tenant_id: r.tenant_id, valor: r.photo_filename })),
      ...op.map((r) => ({ alvo: 'occurrence_photo.filename' as const, id: r.id, tenant_id: r.tenant_id, valor: r.filename })),
      ...tp.map((r) => ({ alvo: 'shift_task_photo.filename' as const, id: r.id, tenant_id: r.tenant_id, valor: r.filename })),
    ]
    const plano = planejar(linhas)
    console.log('Plano:', JSON.stringify(resumo(plano)))
    if (plano.conflitos.length) console.log(`Conflitos de destino: ${plano.conflitos.length} (ignorados; resolver à mão)`)

    if (!aplicar) { console.log('Ensaio: nada foi escrito. Use --apply para executar.'); return }
    if (process.env.BLOB_ACCESS !== 'private') { console.error('Defina BLOB_ACCESS=private (e o token do store privado).'); process.exit(1) }
    if (hostConfirmado !== dbHost) { console.error('--confirm-host precisa ser o host do DATABASE_URL.'); process.exit(1) }

    let feitos = 0, falhas = 0
    for (const it of plano.itens) {
      try {
        const res = await fetch(it.de)
        if (!res.ok) throw new Error(`origem ${res.status}`)
        const dados = Buffer.from(await res.arrayBuffer())
        await put(it.para, dados, { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: res.headers.get('content-type') ?? undefined })
        const n = await trocar(prisma, it)
        if (n === 1) feitos++; else { falhas++; console.error(`linha mudou durante a migração: ${it.alvo} ${it.id}`) }
      } catch (e) {
        falhas++
        console.error(`falhou: ${it.alvo} ${it.id}: ${(e as Error).message}`)
      }
    }
    console.log(`Concluído: ${feitos} migrados, ${falhas} falhas. Nada foi apagado do Blob público.`)
    if (falhas) process.exit(2)
  } finally {
    await prisma.$disconnect()
  }
}

async function trocar(prisma: PrismaClient, it: { alvo: string; id: string; tenant_id: string; de: string; para: string }): Promise<number> {
  const base = { id: it.id, tenant_id: it.tenant_id }
  switch (it.alvo) {
    case 'equipment.photo_url': return (await prisma.equipment.updateMany({ where: { ...base, photo_url: it.de }, data: { photo_url: it.para } })).count
    case 'equipment.manual_url': return (await prisma.equipment.updateMany({ where: { ...base, manual_url: it.de }, data: { manual_url: it.para } })).count
    case 'reading.photo_filename': return (await prisma.reading.updateMany({ where: { ...base, photo_filename: it.de }, data: { photo_filename: it.para } })).count
    case 'occurrence_photo.filename': return (await prisma.occurrencePhoto.updateMany({ where: { ...base, filename: it.de }, data: { filename: it.para } })).count
    default: return (await prisma.shiftTaskPhoto.updateMany({ where: { ...base, filename: it.de }, data: { filename: it.para } })).count
  }
}

main().catch((e) => { console.error((e as Error).message); process.exit(1) })
