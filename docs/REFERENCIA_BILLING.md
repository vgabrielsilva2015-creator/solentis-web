# Referência de Billing (para quando o Solentis for monetizado)

> **Status:** documento de REFERÊNCIA, não implementado. Serve de blueprint para
> a futura camada de cobrança do Solentis.
>
> **Fonte:** modelo de dados do boilerplate open-source
> [`The-SaaS-Factory/next-14-saas-boilerplate`](https://github.com/The-SaaS-Factory/next-14-saas-boilerplate)
> (licença MIT, © 2023 The SaaS Factory). Aqui está uma leitura crítica do
> modelo deles + a adaptação recomendada para a arquitetura do Solentis.
>
> **Não copie o schema deles direto.** Eles usam MySQL, IDs `Int`, `Float` para
> dinheiro, auth Clerk e cobrança **por usuário**. O Solentis usa Postgres, IDs
> `cuid`, é **multi-tenant B2B** (cobrança por empresa/tenant) e tem regras
> próprias (ver "Adaptação para o Solentis").

---

## 1. Visão geral do modelo deles

O billing do boilerplate gira em torno de 4 blocos:

1. **Catálogo** — o que é vendido: `Plan` → `Pricing` (→ `PricingSetting`)
2. **Assinatura** — quem comprou o quê: `Membership` (liga usuário ↔ plano ↔ preço)
3. **Cobrança/histórico** — `Invoice` (→ `InvoiceItem`), `Coupon`, `PaymentMethod`,
   `StripeCustomer`
4. **Gating por plano** — o que cada plano libera: `Capabilitie` +
   `PlanCapabilities` + `UserCapabilities`

Blocos auxiliares (provavelmente dispensáveis no Solentis): multimoeda
(`AdminCurrencies`), carteira/créditos (`UserAmounts`, `AdminMovementsAmounts`) e
indicações (`Referral`).

---

## 2. Modelos (como eles são)

### Catálogo — Plan / Pricing / PricingSetting
- **`Plan`**: `name`, `stripeProductId`, `freeTrialDays`, `status`, `description`.
  Um plano tem vários `Pricing` (mensal, anual…) e várias `PlanCapabilities`.
- **`Pricing`**: `frequency` (enum `frequencyType`: MONTHLY, YEARLY, LIFETIME…),
  `price` (Float), `oldPrice`, `status`. Pertence a um `Plan`. É o "preço de uma
  frequência" (ex.: Plano Pro = R$99/mês OU R$990/ano → 2 Pricing).
- **`PricingSetting`**: pares chave/valor livres por preço (`settingName`,
  `settingValue`) — flexibiliza sem migração.

### Assinatura — Membership
- **`Membership`**: 1 por usuário (`userId @unique`). Liga `planId` + `pricingId`,
  guarda `startDate`, `endDate`, `endDateFreeTrial`. É a "assinatura vigente".
  Renovação/expiração é comparada por data (mesmo padrão "lazy" que o Solentis já
  usa em prazos de ocorrência/turno).

### Cobrança — Invoice / InvoiceItem / Coupon / PaymentMethod / StripeCustomer
- **`StripeCustomer`**: mapeia `userId` → `customerId` do Stripe.
- **`Invoice`**: `type` (`InvoiceModelType`: MEMBERSHIP/SERVICE/DEPOSIT), `status`
  (`InvoiceStatus`: DRAFT/PENDING/PAID/EXPIRED), `gateway` + `gatewayId` (id no
  Stripe), `invoiceUrl`/`invoicePdfUrl`, `paidAt`, `dueAt`. Uma fatura tem
  `InvoiceItem[]` e pode ter `Coupon[]`.
- **`InvoiceItem`**: linha da fatura (`name`, `quantity`, `price`, `modelType`/`modelId`).
- **`Coupon`** + **`CouponSettings`**: `code` único, `percentOff` OU `amountOff`,
  `duration` (`CouponDuration`: FOREVER/ONCE/REPEATING), `maxRedemptions`.
- **`PaymentMethod`**: catálogo de métodos disponíveis (nome/imagem/moedas).

### Gating por plano — Capabilitie / PlanCapabilities / UserCapabilities
Sistema de limites/recursos por plano — a peça mais reaproveitável conceitualmente:
- **`Capabilitie`**: define uma capacidade (`name`, `type` = "LIMIT" ou feature).
  Ex.: "pontos_de_coleta", "usuarios", "laudos_ia_por_mes".
- **`PlanCapabilities`**: quanto cada plano concede (`planId` + `capabilitieId` +
  `count`). Ex.: Plano Free → 1 ponto; Pro → 50 pontos.
- **`UserCapabilities`**: override/consumo por usuário. Serve para "quota
  consumida" ou concessões avulsas.

### Enums relevantes
`InvoiceStatus` (DRAFT/PENDING/PAID/EXPIRED) · `InvoiceModelType`
(MEMBERSHIP/SERVICE/DEPOSIT) · `CouponDuration` (FOREVER/ONCE/REPEATING) ·
`frequencyType` (MONTHLY/YEARLY/LIFETIME/…) · `Status` (ACTIVE/INACTIVE/…).

---

## 3. Fluxo de cobrança (como funciona na prática)

1. **Catálogo** cadastrado (Plans + Pricings) e espelhado no Stripe
   (`stripeProductId` no Plan, price ids no Stripe).
2. **Checkout**: cria/recupera `StripeCustomer`, abre Stripe Checkout Session para
   o `Pricing` escolhido.
3. **Webhook do Stripe** (eles usam `svix` para receber; com Stripe puro, usa-se a
   verificação de assinatura nativa do Stripe):
   - `checkout.session.completed` → cria/atualiza `Membership` + `Invoice` PAID.
   - `invoice.paid` / `invoice.payment_failed` → atualiza `Invoice.status`.
   - `customer.subscription.updated` / `.deleted` → ajusta `Membership.endDate` /
     cancela.
4. **Gating em runtime**: antes de uma ação limitada, checa
   `PlanCapabilities`/`UserCapabilities` do plano vigente (via `Membership`).
5. **Expiração**: `Membership.endDate < now` → tratado como plano expirado
   (checagem lazy na leitura, sem cron obrigatório).

---

## 4. Adaptação para o Solentis (IMPORTANTE)

O Solentis é **B2B multi-tenant**: quem assina é a **empresa (tenant)**, não o
usuário. Isso muda o modelo. Ajustes obrigatórios ao portar:

| Aspecto | No boilerplate | No Solentis (fazer assim) |
|---|---|---|
| Sujeito da assinatura | por **usuário** (`userId`) | por **tenant** (`tenant_id`) — a `Subscription` é da empresa |
| IDs | `Int @default(autoincrement())` | `String @default(cuid())` (padrão do projeto) |
| Banco | MySQL (`@db.VarChar`, `@db.Text`) | **Postgres** — remover anotações MySQL |
| **Dinheiro** | `Float` (`price`, `amount`) | **`Decimal @db.Decimal(12,2)`** — regra inviolável do Solentis: dinheiro NUNCA em Float |
| Enums | enums nativos MySQL | seguir o padrão atual do projeto (hoje String + const TS em `src/types`; ver nota de "reverte migração enum/Json para String" no CLAUDE.md) |
| Auth / cliente Stripe | Clerk (`externalId`) | NextAuth v5; `StripeCustomer` mapeia **tenant → customerId** |
| Multimoeda | `AdminCurrencies` + rates | dispensável — fixar **BRL** |
| Carteira/créditos | `UserAmounts`/`AdminMovementsAmounts` | dispensável (Solentis não é marketplace) |
| Indicações | `Referral` | opcional |
| Tenant safety | — | toda query de billing filtra por `tenant_id` via `getTenantId()` |

### Subset mínimo recomendado (schema-alvo do Solentis)

```prisma
// Catálogo (global, sem tenant_id — é o catálogo da plataforma)
model Plan {
  id              String   @id @default(cuid())
  name            String
  description     String?
  stripe_product_id String?
  free_trial_days Int?
  is_active       Boolean  @default(true)
  pricings        Pricing[]
  capabilities    PlanCapability[]
  subscriptions   Subscription[]
}

model Pricing {
  id                String  @id @default(cuid())
  plan_id           String
  frequency         String  // 'MONTHLY' | 'YEARLY' | 'LIFETIME' (const TS em src/types)
  price             Decimal @db.Decimal(12,2)
  stripe_price_id   String?
  is_active         Boolean @default(true)
  plan              Plan    @relation(fields: [plan_id], references: [id], onDelete: Cascade)
  subscriptions     Subscription[]
  @@index([plan_id])
}

// Assinatura POR TENANT
model Subscription {
  id                 String    @id @default(cuid())
  tenant_id          String    @unique          // 1 assinatura vigente por empresa
  plan_id            String
  pricing_id         String?
  status             String    @default("ACTIVE") // ACTIVE/PAST_DUE/CANCELED/TRIALING
  start_date         DateTime
  trial_end_date     DateTime?
  end_date           DateTime
  stripe_subscription_id String?
  tenant             Tenant    @relation(fields: [tenant_id], references: [id])
  plan               Plan      @relation(fields: [plan_id], references: [id])
  pricing            Pricing?  @relation(fields: [pricing_id], references: [id])
  @@index([tenant_id])
}

model StripeCustomer {
  id          String  @id @default(cuid())
  tenant_id   String  @unique
  customer_id String  @unique
  tenant      Tenant  @relation(fields: [tenant_id], references: [id])
}

model Invoice {
  id              String   @id @default(cuid())
  tenant_id       String
  status          String   @default("PENDING") // DRAFT/PENDING/PAID/EXPIRED
  amount          Decimal  @db.Decimal(12,2)
  gateway_id      String?  // id da invoice no Stripe
  invoice_pdf_url String?
  paid_at         DateTime?
  due_at          DateTime?
  created_at      DateTime @default(now())
  tenant          Tenant   @relation(fields: [tenant_id], references: [id])
  @@index([tenant_id, status])
}

// Limites por plano (gating de features)
model PlanCapability {
  id            String @id @default(cuid())
  plan_id       String
  capability    String // 'collection_points' | 'users' | 'ai_reports_per_month' ...
  limit_count   Int
  plan          Plan   @relation(fields: [plan_id], references: [id], onDelete: Cascade)
  @@index([plan_id])
}
```

> `Coupon`, `PaymentMethod`, `PricingSetting` e `InvoiceItem` podem entrar depois,
> se necessário. O `PlanCapability` acima é o mínimo para "travar" recursos por
> plano (ex.: nº de pontos de coleta, usuários, laudos IA/mês).

### Como fazer o gating no Solentis
Criar um helper `getTenantPlanLimits(tenantId)` que:
1. Busca a `Subscription` vigente do tenant (`status ACTIVE`, `end_date > now`).
2. Junta as `PlanCapability` do plano.
3. Antes de uma ação limitada (ex.: criar ponto de coleta), compara o uso atual
   (`count` real via query) com o limite. Bloqueia com mensagem clara se estourar.

### Webhook
Criar `src/app/api/webhooks/stripe/route.ts` com **verificação de assinatura do
Stripe** (`stripe.webhooks.constructEvent` com `STRIPE_WEBHOOK_SECRET`) — não
precisa de `svix`. Tratar: `checkout.session.completed`, `invoice.paid`,
`invoice.payment_failed`, `customer.subscription.updated`,
`customer.subscription.deleted`. Excluir `/api/webhooks` do matcher do `proxy.ts`
(mesma lógica já usada para `/api/cron`), pois roda sem sessão.

---

## 5. O que NÃO trazer do boilerplate
- **Clerk** (temos NextAuth v5).
- **Tremor / Headless UI / Heroicons** (temos shadcn/ui + Recharts).
- **imagekit** (temos Vercel Blob).
- **i18n `next-intl` / rotas `[locale]`** (Solentis é pt-BR).
- **Multimoeda, carteira/créditos, referral** (fora do escopo B2B do Solentis).

---

## 6. Resumo executivo
O valor desse boilerplate para o Solentis é **exclusivamente como referência de
modelagem de billing** — a ser reimplementada quando houver decisão de
comercializar. O caminho é: **cobrança por tenant**, catálogo `Plan`/`Pricing`,
`Subscription` por empresa, `Invoice` para histórico, `PlanCapability` para gating,
e webhook do Stripe. Dinheiro em `Decimal`, IDs `cuid`, tudo filtrado por
`tenant_id`. Nada disso é urgente para o piloto atual.
