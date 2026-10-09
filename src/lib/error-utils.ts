/**
 * Leitura segura de erros capturados (`catch (e)` entrega `unknown`).
 * Existe para não usar `catch (e: any)` (T-29): nada aqui lança.
 */
const campo = (e: unknown, nome: string): unknown =>
  typeof e === 'object' && e !== null && nome in e ? (e as Record<string, unknown>)[nome] : undefined

/** `e.message` quando é texto; senão o `fallback`. */
export function errorMessage(e: unknown, fallback = ''): string {
  const m = campo(e, 'message')
  return typeof m === 'string' && m ? m : fallback
}

/** `e.code` quando é texto (ex.: 'P2002' do Prisma). */
export function errorCode(e: unknown): string | undefined {
  const c = campo(e, 'code')
  return typeof c === 'string' ? c : undefined
}

/** `e.statusCode` quando é número (ex.: erro do web-push). */
export function errorStatusCode(e: unknown): number | undefined {
  const s = campo(e, 'statusCode')
  return typeof s === 'number' ? s : undefined
}
