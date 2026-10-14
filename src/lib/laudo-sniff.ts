/**
 * Magic bytes do laudo enviado à IA (M-16).
 *
 * `extractDataFromPDF` recebe o arquivo como base64 + um `mimeType` informado pelo
 * cliente — e o `mimeType` é forjável. Sem olhar o conteúdo real, alguém poderia
 * mandar qualquer coisa rotulada como "application/pdf" e queimar a cota paga do
 * Gemini. Esta função inspeciona os primeiros bytes de verdade e devolve o tipo
 * detectado (ou null). Pura e testável; não importa nada.
 */
export type LaudoMime = 'application/pdf' | 'image/jpeg' | 'image/png'

export function sniffLaudoType(buffer: Buffer): LaudoMime | null {
  if (buffer.length < 8) return null
  // PDF: "%PDF" = 25 50 44 46
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return 'application/pdf'
  }
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png'
  return null
}
