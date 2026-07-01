import { Resend } from 'resend'
import { logger } from '@/lib/logger'

interface SendEmailParams {
  to: string | string[]
  subject: string
  html: string
}

type SendEmailResult =
  | { success: true; simulated?: boolean; id?: string }
  | { success: false; error: string }

/**
 * Camada reutilizável de envio de e-mail transacional via Resend.
 *
 * Comportamento por ambiente:
 * - Sem RESEND_API_KEY em produção: lança erro claro (envio é obrigatório).
 * - Sem RESEND_API_KEY em desenvolvimento: NÃO falha — apenas loga o e-mail
 *   no console e retorna { success: true, simulated: true }.
 * - Com RESEND_API_KEY: envia de verdade. Erros do Resend/rede são logados
 *   internamente (para debug nos logs) mas o caller recebe apenas uma
 *   mensagem amigável, sem vazar stack trace.
 */
export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  // Sem API key configurada.
  if (!apiKey) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('RESEND_API_KEY não configurada — envio de e-mail indisponível em produção.')
    }

    // Dev: simula o envio para não bloquear o fluxo local.
    logger.info(
      { to, subject, htmlPreview: html.slice(0, 120), component: 'email' },
      'Envio de e-mail simulado (RESEND_API_KEY ausente em dev)',
    )
    return { success: true, simulated: true }
  }

  // Há API key, mas falta o remetente: erro amigável (sem lançar).
  if (!from) {
    logger.error({ component: 'email' }, 'EMAIL_FROM não configurado, mas RESEND_API_KEY está presente')
    return { success: false, error: 'Remetente de e-mail não configurado. Contate o administrador.' }
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({ from, to, subject, html })

    if (error) {
      logger.error({ err: error, component: 'email' }, 'Falha ao enviar via Resend')
      return { success: false, error: 'Não foi possível enviar o e-mail. Tente novamente.' }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    logger.error({ err, component: 'email' }, 'Erro inesperado ao enviar e-mail')
    return { success: false, error: 'Não foi possível enviar o e-mail. Tente novamente.' }
  }
}
