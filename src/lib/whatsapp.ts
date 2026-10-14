import { logger } from '@/lib/logger'

/**
 * Envia um alerta por WhatsApp (best-effort: uma tentativa, sem retry). Nunca lança.
 * Devolve `true` se a mensagem foi aceita pela API, `false` caso contrário (sem credenciais,
 * telefone vazio, erro do provedor ou falha de rede) — para quem chama poder contar envios.
 */
export async function sendWhatsAppAlert(phone: string, message: string): Promise<boolean> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID

  if (!token || !phoneId) {
    logger.warn({ component: 'whatsapp' }, 'Credenciais do WhatsApp (WHATSAPP_TOKEN/WHATSAPP_PHONE_ID) não configuradas')
    return false
  }

  // Remove caracteres não numéricos do telefone
  const cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone) return false

  try {
    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: cleanPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      })
    })

    if (!response.ok) {
      const err = await response.json()
      logger.error({ err, status: response.status, component: 'whatsapp' }, 'Falha ao enviar mensagem WhatsApp')
      return false
    }
    return true
  } catch (error) {
    logger.error({ err: error, component: 'whatsapp' }, 'Erro de conexão com a WhatsApp API')
    return false
  }
}
