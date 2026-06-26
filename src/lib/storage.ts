import path from 'path'
import fs from 'fs/promises'
import { put } from '@vercel/blob'

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
 */

function hasBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN
}

export async function saveUpload(
  folder: string,
  filename: string,
  data: Buffer,
  contentType: string,
): Promise<string> {
  if (hasBlob()) {
    const blob = await put(`${folder}/${filename}`, data, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
    })
    return blob.url
  }

  const dir = path.join(process.cwd(), 'uploads', folder)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, filename), data)
  return filename
}

export async function readUpload(folder: string, stored: string): Promise<Buffer | null> {
  // Valor salvo é uma URL do Blob → busca remota.
  if (stored.startsWith('http://') || stored.startsWith('https://')) {
    try {
      const res = await fetch(stored)
      if (!res.ok) return null
      return Buffer.from(await res.arrayBuffer())
    } catch {
      return null
    }
  }

  // Caso contrário, é um arquivo em disco local (dev).
  try {
    return await fs.readFile(path.join(process.cwd(), 'uploads', folder, stored))
  } catch {
    return null
  }
}
