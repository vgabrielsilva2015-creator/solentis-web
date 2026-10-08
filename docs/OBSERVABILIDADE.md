# Observabilidade (T-30)

O que o sistema já mostra quando algo vai mal, e o que o dono precisa ligar fora do código.

## O que existe

| Peça | O que faz | Onde |
|---|---|---|
| Log estruturado (Pino, JSON) | Toda linha com `requestId`, `userId`, `tenantId`, `action`; dados pessoais e segredos mascarados | `src/lib/logger.ts` (T-21 ampliou a máscara) |
| Medição de ações críticas | `registrarLeitura`, `registrarSaida`, `registrarContagem`, `registrarEntrada` registram `durationMs` e `outcome`; acima de `SLOW_ACTION_MS` (2000) vira `warn`; exceção vira `error` e é reenviada ao Sentry | `src/lib/observability.ts` |
| Saúde | `GET /api/health` → `{"status":"ok"}` (200) ou `{"status":"falha"}` (503); faz `SELECT 1` com limite de 3 s; público e sem detalhes | `src/app/api/health/route.ts` |
| Batimento do cron | O cron de turnos registra `Cron de turnos concluído` (processados/criados/pulados/duração) e chama `CRON_HEARTBEAT_URL` (ok) ou `…/fail` | `src/app/api/cron/shifts/route.ts` |
| Sentry (servidor) | Só liga se `SENTRY_DSN` existir. Sem PII automático, sem corpo/cookies/headers de autenticação, sem migalhas de console, e-mails mascarados, `?query` cortada | `src/instrumentation.ts`, `src/lib/sentry-config.ts` |

`redirect()` e `notFound()` do Next **não** contam como erro. Retorno `{ error: '…' }` de validação também não.

## Como ligar (só o dono)

1. **Sentry**: criar projeto Next.js no Sentry → copiar o DSN → Vercel › Settings › Environment Variables › `SENTRY_DSN` (Production). Redeploy. Criar uma regra de alerta (e-mail/WhatsApp) no Sentry para "nova issue".
2. **Monitor de disponibilidade**: apontar UptimeRobot/Better Stack/Healthchecks para `https://<seu-dominio>/api/health` a cada 1–5 min, alerta se não for 200.
3. **Cron**: criar um check no Healthchecks.io com período de 1 dia + tolerância de 2 h, colar a URL de ping em `CRON_HEARTBEAT_URL`. Sem batimento no prazo, ele avisa — cobre o caso em que o cron nem dispara.
4. **Logs**: Vercel › Logs, filtrar por `action:registrarSaida`, `level:error`, `Ação lenta`. Retenção do plano Hobby é curta; para guardar mais, usar Log Drain (plano pago) — decisão do dono.

## O que NÃO está incluído (de propósito)

- **Sentry no navegador** (erros de tela) e **source maps**: exigem `withSentryConfig` (altera o build) e liberar o domínio do Sentry no CSP (`connect-src`, hoje `'self'`). Fica para uma tarefa própria depois de o CSP sair do modo "só relatório".
- **Log de consulta lenta do Prisma**: exigiria mudar o cliente Prisma (`src/lib/prisma.ts`), que é a peça mais sensível do sistema; a duração por ação já aponta onde olhar.
- **Métricas/dashboards**: o plano Vercel atual não dá; os logs JSON ficam prontos para um dreno quando houver.

## Verificação feita aqui × em produção

Feito: unidade (21 + 3 testes), build, servidor real com a DSN apontando para um receptor local, provocando um erro de ação e um erro de rota: o evento chegou com a etiqueta da ação e **sem** e-mail, cookie, `Authorization` nem `?token=`. **NÃO VERIFICADO:** envio ao Sentry real, regras de alerta, comportamento do `onRequestError` no runtime da Vercel, o monitor de uptime e o Healthchecks.
