'use client'

import imageCompression from 'browser-image-compression'

/**
 * Compressão de fotos no navegador, ANTES do envio ao servidor.
 *
 * Por que existe: os uploads passam por server actions, e o Vercel impõe um
 * limite fixo de 4,5 MB por requisição (não configurável). Fotos de câmera de
 * celular têm 3 a 12 MB, então sem compressão o envio falha com erro 413 antes
 * mesmo do código do servidor rodar. Comprimir aqui resolve o erro, acelera o
 * envio no 4G da planta e economiza armazenamento no Blob.
 *
 * Alvo: ~1 MB por foto, lado maior limitado a 1920 px (mais que suficiente
 * para foto de comprovação/ocorrência em tela e em PDF de relatório).
 */

/** Limite de segurança do TOTAL da requisição (margem sob os 4,5 MB do Vercel). */
export const MAX_TOTAL_UPLOAD_BYTES = 3.5 * 1024 * 1024

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

/**
 * Comprime uma imagem. Se algo der errado (formato exótico, navegador antigo),
 * devolve o arquivo original — a validação de tamanho segue valendo depois.
 */
export async function compressPhoto(file: File): Promise<File> {
  if (!IMAGE_TYPES.includes(file.type)) return file
  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8,
    })
    // A lib pode devolver Blob; garante um File com nome original.
    if (compressed instanceof File) return compressed
    return new File([compressed], file.name, { type: (compressed as Blob).type || file.type })
  } catch {
    return file
  }
}

/**
 * Para formulários que enviam o <input type="file"> direto na action
 * (sem estado controlado): comprime as imagens selecionadas e substitui
 * os arquivos do próprio input via DataTransfer. Arquivos que não são
 * imagem (ex.: PDF de manual) passam intactos.
 *
 * Se o navegador não suportar DataTransfer programático, mantém os
 * arquivos originais (a validação de total ainda bloqueia envio grande).
 */
export async function compressFilesInInput(input: HTMLInputElement): Promise<void> {
  const files = input.files ? Array.from(input.files) : []
  if (files.length === 0) return

  const processed = await Promise.all(files.map((f) => compressPhoto(f)))

  try {
    const dt = new DataTransfer()
    for (const f of processed) dt.items.add(f)
    input.files = dt.files
  } catch {
    // navegador sem suporte: segue com os originais
  }
}

/** Soma o tamanho em bytes de uma lista de arquivos. */
export function sumBytes(files: Iterable<File>): number {
  let total = 0
  for (const f of files) total += f.size
  return total
}

/** Formata bytes para exibição amigável (ex.: "4,2 MB"). */
export function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`
}
