/**
 * Limites de upload coerentes com a plataforma (T-24, P-17).
 *
 * A Vercel recusa, antes de o código rodar, qualquer requisição acima de 4,5 MB (limite fixo).
 * Server actions recebem o arquivo dentro da requisição, então o limite que vale é o da requisição,
 * não o "tamanho do arquivo que gostaríamos de aceitar".
 *
 * Arquivo sem este módulo ser 'use client' nem importar nada: pode ser usado no servidor e no navegador.
 */

/** Tamanho máximo de uma requisição com arquivo (margem sob os 4,5 MB da Vercel). */
export const MAX_REQUEST_BYTES = 4 * 1024 * 1024

/** Manual de equipamento (PDF) enviado por server action. */
export const MAX_MANUAL_BYTES = MAX_REQUEST_BYTES

/**
 * Laudo enviado à IA: o arquivo vai como base64 (4/3 do tamanho) dentro do corpo da action,
 * então o arquivo original precisa caber em ~3 MB para a requisição ficar abaixo de 4,5 MB.
 */
export const MAX_LAUDO_BYTES = 3 * 1024 * 1024
/** Teto do texto base64 aceito pelo servidor (4/3 do arquivo, com folga de 1 KB). */
export const MAX_LAUDO_BASE64_CHARS = Math.ceil((MAX_LAUDO_BYTES * 4) / 3) + 1024

export const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`
