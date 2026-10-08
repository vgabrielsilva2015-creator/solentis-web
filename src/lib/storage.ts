import path from 'path'
import fs from 'fs/promises'
import { put, get } from '@vercel/blob'
import crypto from 'crypto'

/**
 * Camada de armazenamento de arquivos enviados pelos usuários.
 *
 * Em produção (Vercel) o filesystem é efêmero/somente-leitura, então os
 * uploads vão para o Vercel Blob. Em desenvolvimento, sem token de Blob,
 * caímos para disco local (./uploads/<pasta>) para não travar o dev.
 *
 * O valor RETORNADO por `saveUpload` é o que deve ser persistido no banco:
 * - com Blob: a URL completa (https://...)
 * - em disco: apenas o nome do arquivo
 *
 * `readUpload` aceita os dois formatos de forma transparente.
 *
 * T-26 — modo privado (`BLOB_ACCESS=private`, exige um Blob store privado):
 * - o objeto é gravado com `access: 'private'` em `<tenantId>/<pasta>/<arquivo>`;
 * - o valor guardado no banco é esse CAMINHO (nunca uma URL), então nada de URL de Blob vai para o
 *   navegador nem fica acessível sem login;
 * - `readUpload` só lê caminho que começa pela planta de quem pede.
 * Sem `BLOB_ACCESS=private` o comportamento é o antigo (Blob público + URL). Arquivos antigos
 * (URL pública) continuam legíveis nos dois modos até a migração.
 */

const HOST_BLOB = '.blob.vercel-storage.com'

/** 'private' só quando pedido explicitamente; qualquer outro valor mantém o comportamento antigo. */
export function blobAccess(): 'public' | 'private' {
  return process.env.BLOB_ACCESS === 'private' ? 'private' : 'public'
}

/** Pasta e nome gerados por nós: só letras, números, ponto, hífen e sublinhado. */
const SEGMENTO = /^[A-Za-z0-9._-]+$/
/** Segmento válido de caminho: sem '.' nem '..' (travessia de diretório). */
const segmentoValido = (p: string | undefined): p is string => !!p && SEGMENTO.test(p) && p !== '.' && p !== '..'

function hasBlob() {
  // Na Vercel o Blob autentica por OIDC (projeto conectado recebe BLOB_STORE_ID,
  // sem BLOB_READ_WRITE_TOKEN). Fora da Vercel, só com token explícito.
  return !!process.env.VERCEL || !!process.env.BLOB_READ_WRITE_TOKEN
}

/**
 * Inspeciona os magic bytes reais do arquivo (não o Content-Type informado pelo
 * cliente, que é forjável) e devolve o MIME de imagem detectado, ou null se o
 * conteúdo não for JPEG/PNG/WebP. Use antes de salvar qualquer upload de imagem.
 */
export function sniffImageType(buffer: Buffer): 'image/jpeg' | 'image/png' | 'image/webp' | null {
  if (buffer.length < 12) return null
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png'
  // WebP: "RIFF"...."WEBP"
  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) return 'image/webp'
  return null
}

export async function saveUpload(
  folder: string,
  filename: string,
  data: Buffer,
  contentType: string,
  tenantId?: string,
): Promise<string> {
  if (hasBlob()) {
    if (blobAccess() === 'private') {
      if (!segmentoValido(tenantId) || !segmentoValido(folder) || !segmentoValido(filename)) {
        throw new Error('Upload privado exige planta, pasta e nome de arquivo válidos.')
      }
      const pathname = `${tenantId}/${folder}/${filename}`
      await put(pathname, data, { access: 'private', contentType, addRandomSuffix: false })
      return pathname // o banco guarda o caminho, nunca uma URL
    }
    const blob = await put(`${folder}/${filename}`, data, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    })
    return blob.url
  }

  // Em produção (Vercel) o filesystem da função é somente-leitura: sem Blob
  // configurado, o `mkdir` abaixo estouraria com ENOENT cru na tela do operador.
  // Falha explícita e legível (o call site transforma em mensagem amigável).
  if (process.env.VERCEL) {
    throw new Error('Storage de arquivos não configurado (BLOB_READ_WRITE_TOKEN ausente).')
  }

  // Fallback de disco local — apenas em desenvolvimento.
  const dir = path.join(process.cwd(), 'uploads', folder)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, filename), data)
  return filename
}

/**
 * Processa um File de imagem (valida tamanho, sniffImageType, gera UUID e salva).
 * Retorna a string da URL gerada.
 */
export async function saveImageUpload(
  file: File,
  folder: string,
  maxBytes: number = 5 * 1024 * 1024,
  tenantId?: string,
): Promise<string> {
  if (file.size > maxBytes) {
    throw new Error(`Arquivo muito grande. Máximo de ${maxBytes / 1024 / 1024} MB.`)
  }
  const buffer = Buffer.from(await file.arrayBuffer())
  const realType = sniffImageType(buffer)
  if (!realType) {
    throw new Error('Formato de foto inválido. Use JPG, PNG ou WEBP.')
  }
  const ext = realType === 'image/jpeg' ? 'jpg' : realType.split('/')[1]
  const filename = `${crypto.randomUUID()}.${ext}`
  return saveUpload(folder, filename, buffer, realType, tenantId)
}

export async function readUpload(folder: string, stored: string, tenantId?: string): Promise<Buffer | null> {
  // Valor salvo é uma URL do Blob público (arquivo antigo) → busca remota.
  if (stored.startsWith('http://') || stored.startsWith('https://')) {
    try {
      // Só buscamos o que é do nosso Blob: o valor vem do banco, mas não vale a pena confiar cegamente.
      const url = new URL(stored)
      if (url.protocol !== 'https:' || !url.hostname.endsWith(HOST_BLOB)) return null
      const res = await fetch(stored)
      if (!res.ok) return null
      return Buffer.from(await res.arrayBuffer())
    } catch {
      return null
    }
  }

  // Caminho do Blob privado: `<planta>/<pasta>/<arquivo>`. Só lê o que é da planta de quem pede.
  if (stored.includes('/')) {
    const partes = stored.split('/')
    if (
      !tenantId || partes.length !== 3 || !partes.every((p) => SEGMENTO.test(p) && p !== '.' && p !== '..') ||
      partes[0] !== tenantId || partes[1] !== folder
    ) return null
    try {
      const r = await get(stored, { access: 'private' })
      if (!r || r.statusCode !== 200) return null
      return Buffer.from(await new Response(r.stream).arrayBuffer())
    } catch {
      return null
    }
  }

  // Caso contrário, é um arquivo em disco local (dev). Só o nome, sem subpasta nem "..".
  if (!SEGMENTO.test(stored) || stored === '.' || stored === '..') return null
  try {
    return await fs.readFile(path.join(process.cwd(), 'uploads', folder, stored))
  } catch {
    return null
  }
}
