export async function sendWhatsAppAlert(phone: string, message: string) {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID

  if (!token || !phoneId) {
    console.warn('⚠️ WhatsApp credentials (WHATSAPP_TOKEN ou WHATSAPP_PHONE_ID) não configuradas no .env')
    return
  }

  // Remove caracteres não numéricos do telefone
  const cleanPhone = phone.replace(/\D/g, '')
  if (!cleanPhone) return

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
      console.error('❌ Falha ao enviar WhatsApp:', err)
    } else {
      console.log(`✅ WhatsApp enviado com sucesso para ${cleanPhone}`)
    }
  } catch (error) {
    console.error('❌ Erro de conexão com WhatsApp API:', error)
  }
}
