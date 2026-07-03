/**
 * Wrapper de logging seguro para uso em Client Components ('use client').
 * 
 * Durante o desenvolvimento local (NODE_ENV !== 'production'), os logs
 * são direcionados para o console do navegador.
 * Em produção, erros críticos ('error' e 'fatal') são enviados via POST
 * para /api/logs para serem injetados no fluxo do Pino (Datadog/ELK/Vercel Logs).
 */

type LogPayload = {
  message: string
  err?: any
  context?: Record<string, unknown>
}

async function sendLogToServer(level: 'info' | 'warn' | 'error' | 'fatal', payload: LogPayload) {
  // Em dev, sempre loga no console do navegador e evita spam no backend local
  if (process.env.NODE_ENV !== 'production') {
    const consoleMsg = `[Client Logger] ${level.toUpperCase()}: ${payload.message}`
    if (level === 'error' || level === 'fatal') {
      console.error(consoleMsg, payload.err, payload.context || '')
    } else if (level === 'warn') {
      console.warn(consoleMsg, payload.context || '')
    } else {
      console.log(consoleMsg, payload.context || '')
    }
    return
  }

  // Em prod, só enviamos error e fatal para economizar banda/requests
  if (level !== 'error' && level !== 'fatal') {
    return
  }

  try {
    // Fire and forget (não usa await para não bloquear a thread UI principal)
    // Opcionalmente, pode ser melhorado com um beacon navigator.sendBeacon
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message: payload.message,
        err: payload.err instanceof Error ? { name: payload.err.name, message: payload.err.message, stack: payload.err.stack } : payload.err,
        context: payload.context,
      }),
      keepalive: true // ajuda a garantir a entrega mesmo se o usuário fechar a aba
    }).catch(() => {})
  } catch (e) {
    // Se o próprio envio falhar no catch block do fetch, engolimos 
    // para não causar loop infinito ou crash.
  }
}

export const clientLogger = {
  info: (message: string, context?: Record<string, unknown>) => sendLogToServer('info', { message, context }),
  warn: (message: string, context?: Record<string, unknown>) => sendLogToServer('warn', { message, context }),
  error: (message: string, err?: any, context?: Record<string, unknown>) => sendLogToServer('error', { message, err, context }),
  fatal: (message: string, err?: any, context?: Record<string, unknown>) => sendLogToServer('fatal', { message, err, context }),
}
