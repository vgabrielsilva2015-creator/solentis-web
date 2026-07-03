import webpush from 'web-push'
import { logger } from '@/lib/logger'

// Certifique-se de configurar essas variáveis no .env
// Você pode gerar chaves executando `npx web-push generate-vapid-keys` no terminal
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(
      'mailto:suporte@solentis.com',
      vapidPublicKey,
      vapidPrivateKey
    )
  } catch (err) {
    logger.error({ err, component: 'web-push' }, 'Falha ao configurar VAPID details')
  }
} else {
  logger.warn({ component: 'web-push' }, 'Chaves VAPID ausentes — push notifications não vão funcionar')
}

export { webpush }
