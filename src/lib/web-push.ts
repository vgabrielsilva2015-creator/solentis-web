import webpush from 'web-push'

// Certifique-se de configurar essas variáveis no .env
// Você pode gerar chaves executando `npx web-push generate-vapid-keys` no terminal
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || ''

webpush.setVapidDetails(
  'mailto:suporte@solentis.com',
  vapidPublicKey,
  vapidPrivateKey
)

export { webpush }
