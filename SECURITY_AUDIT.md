# SECURITY_AUDIT.md — Solentis (solentis-web)

**Tipo:** Auditoria AppSec / Pentest interno (análise estática autorizada)
**Escopo:** branch `main` local (⚠️ 4 commits atrás de `origin/main` — reaudite os deltas de UI/debug)
**Metodologia:** OWASP WSTG · ASVS · API Security Top 10 (2023)
**Data:** 2026-07-09
**Regra observada:** somente leitura/análise estática. Nenhuma migration, delete ou alteração em produção.

---

## 1. SUMÁRIO EXECUTIVO

### Contagem por severidade
| Severidade | Qtde |
|---|---|
| 🔴 Crítico | 0 |
| 🟠 Alto | 2 |
| 🟡 Médio | 7 |
| 🔵 Baixo | 6 |
| ⚪ Info / Verificação manual | 8 |

### Veredito: **NÃO está pronto para onboarding pago ainda** — mas está perto.

A base é **sólida e madura**: isolamento de tenant aplicado de forma consistente (padrão `findFirst/updateMany` com `tenant_id` em quase todas as superfícies), fluxo de reset de senha **bem construído** (token cripto, hash SHA-256, uso único, sem enumeração), bcrypt custo 12, Zod em todas as Server Actions, zero segredos no código/histórico, zero SQLi. Isso já coloca você acima da média de MVPs.

Faltam **2 correções de Alto** (rápidas, ~1 linha cada) e o **hardening de plataforma** (headers HTTP, que hoje estão ausentes). Nenhuma vulnerabilidade permite hoje ler dados de outro tenant em massa, mas há **uma quebra de isolamento de escrita** (comentários) que precisa ser fechada antes de ter mais de um cliente no mesmo banco.

### Top 3 riscos
1. **🟠 Usuário desativado ainda consegue logar** — `is_active` não é checado no login. Desligar um funcionário não revoga o acesso. (`src/lib/auth.ts`)
2. **🟠 IDOR cross-tenant em `addOccurrenceComment`** — comentário gravado por `occurrence_id` sem validar o tenant; a tabela `occurrence_comments` nem tem `tenant_id`. Um usuário do tenant B escreve na ocorrência do tenant A. (`src/app/operador/ocorrencias/actions.ts:249`)
3. **🟡 Ausência total de headers de segurança** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options) — o app é clickjackable e não tem defesa em profundidade contra XSS/sniffing. (`next.config.mjs`)

### Nota arquitetural que amplifica tudo (Fase 6)
O Prisma conecta via `DATABASE_URL`/`DIRECT_URL` com o papel do Postgres que **bypassa RLS**. Ou seja: **o isolamento de tenant está 100% na aplicação.** Cada query esquecida do `tenant_id` (como a #2) é uma brecha real, sem rede de segurança no banco. Habilitar RLS no Supabase como defesa em profundidade é a mudança de maior alavancagem de médio prazo.

---

## 2. ACHADOS DETALHADOS

---

### 🟠 ALTO-01 — Usuário desativado (`is_active = false`) ainda autentica
**Arquivo:** `src/lib/auth.ts:64-146` (função `authorize`)
**WSTG-ATHN / ASVS 2.1**

**Descrição:** O `authorize` do NextAuth busca o usuário por e-mail e valida a senha, mas **nunca verifica `is_active`**. O soft-delete (`toggleAtivo` em `gestor/usuarios/actions.ts`) apenas seta `is_active = false`. Nem o `jwt`/`session` callback nem o `proxy.ts` reavaliam a flag. Resultado: um funcionário desligado, ou uma conta desativada por suspeita de comprometimento, **continua conseguindo fazer login novo e operar normalmente**.

**Impacto:** Falha do controle de revogação de acesso. Em contexto B2B (operador demitido de uma ETE) isso é grave — a única forma de barrar é resetar a senha, o que não é o que o gestor espera ao "desativar".

**Prova:**
```ts
// src/lib/auth.ts
const user = await prisma.user.findUnique({ where: { email } })
// ... verifica senha ...
if (!isValid) return null
// ⚠️ nenhuma checagem de user.is_active aqui
return { id: user.id, email: user.email, /* ... */ }
```

**Correção (patch):**
```ts
const isValid = await verifyPassword(password, user.password_hash)

// registra tentativa (mantém como está) ...

if (!isValid) return null

// ⬇️ ADICIONAR: conta desativada não autentica
if (!user.is_active) {
  log.warn({ tenantId: tenantIdForLog, userId: user.id }, 'Login bloqueado: conta desativada')
  return null
}
```
> Opcional (defesa extra): revalidar `is_active` no callback `jwt` a cada renovação para expulsar sessões já ativas — exige uma query por request; avalie o custo.

---

### 🟠 ALTO-02 — IDOR cross-tenant em `addOccurrenceComment`
**Arquivo:** `src/app/operador/ocorrencias/actions.ts:249-282`
**API Security Top 10: API1 (BOLA) / WSTG-ATHZ**

**Descrição:** A action recebe `occurrenceId` do cliente e cria um `OccurrenceComment` **sem verificar que a ocorrência pertence ao tenant do usuário**. Agravante: o model `OccurrenceComment` (schema linha 909) **não tem `tenant_id`** — o isolamento dependeria inteiramente de um check na action, que não existe. Todas as outras actions de ocorrência (`resolverOcorrencia`, `updateOccurrenceStatus`) fazem o check corretamente; esta é a exceção.

**Impacto:** Qualquer usuário autenticado (de qualquer tenant) pode injetar comentários em ocorrências de **outro tenant**, poluindo a timeline e o audit trail com registros cruzados. Quebra de isolamento de escrita — o pilar do SaaS multi-tenant.

**Prova:**
```ts
export async function addOccurrenceComment(occurrenceId: string, text: string) {
  const session = await requireAuthenticated()
  const tenantId = await getTenantId()
  const userId = await resolveUserId(session.user.email!)
  // ⚠️ NÃO valida que occurrenceId pertence a tenantId
  await prisma.occurrenceComment.create({
    data: { occurrence_id: occurrenceId, user_id: userId, text: text.trim() },
  })
```

**Correção (patch):**
```ts
if (!text || text.trim().length < 2) {
  throw new Error('Comentário deve ter pelo menos 2 caracteres.')
}

// ⬇️ ADICIONAR: confirma que a ocorrência é do tenant do usuário
const occ = await prisma.occurrence.findFirst({
  where: { id: occurrenceId, tenant_id: tenantId },
  select: { id: true },
})
if (!occ) throw new Error('Ocorrência não encontrada.')

await prisma.occurrenceComment.create({ /* ... */ })
```
> Recomendado a médio prazo: adicionar `tenant_id` ao model `OccurrenceComment` (via SQL aditivo, conforme convenção do projeto) para permitir consultas tenant-safe diretas e futura RLS.

---

### 🟡 MÉDIO-01 — Ausência total de headers de segurança HTTP
**Arquivo:** `next.config.mjs` (não há `headers()`)
**WSTG-CONF / ASVS 14.4**

**Descrição:** Nenhum header de segurança é emitido: sem **CSP**, **HSTS**, **X-Frame-Options/frame-ancestors**, **X-Content-Type-Options**, **Referrer-Policy** nem **Permissions-Policy**. O app pode ser embutido em iframe (clickjacking) e não tem `nosniff` (agrava o risco de MIME-sniffing dos uploads — ver MÉDIO-05).

**Correção (patch):**
```js
// next.config.mjs
const nextConfig = {
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(), microphone=()' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        // CSP: comece em Report-Only para não quebrar Recharts/inline styles, depois promova
        { key: 'Content-Security-Policy-Report-Only',
          value: "default-src 'self'; img-src 'self' data: blob: https://*.public.blob.vercel-storage.com; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" },
      ],
    }]
  },
}
```
> A Vercel já força HTTPS; o HSTS reforça. Calibre a CSP em `Report-Only` primeiro (o app usa `<style dangerouslySetInnerHTML>` no ThemeScript e styles inline do Recharts, que exigem `'unsafe-inline'` em `style-src`).

---

### 🟡 MÉDIO-02 — Senhas provisórias geradas com `Math.random()`
**Arquivos:** `src/app/gestor/usuarios/actions.ts:30-35` · `src/app/admin/plantas/actions.ts:20-25`
**WSTG-CRYP / ASVS 6.3.1 (CSPRNG)**

**Descrição:** `gerarSenhaProvisoria()` usa `Math.floor(Math.random() * ...)`. `Math.random()` **não é criptograficamente seguro** — a sequência é previsível a partir do estado do PRNG. A senha provisória tem só 6 caracteres aleatórios sobre um prefixo fixo `Sol@`, o que reduz ainda mais a entropia. Mitigadores: `must_change_password = true` e o convite por e-mail (token forte) como caminho principal — mas a senha provisória ainda é um credencial válido que trafega/aparece na tela.

**Correção (patch):**
```ts
import { randomInt } from 'crypto'

function gerarSenhaProvisoria(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let pwd = 'Sol@'
  for (let i = 0; i < 10; i++) pwd += chars[randomInt(chars.length)]  // CSPRNG + mais caracteres
  return pwd
}
```

---

### 🟡 MÉDIO-03 — Server Action de IA (`extractDataFromPDF`) sem guard de role
**Arquivo:** `src/app/gestor/laudos/importar/actions.ts:10-99`
**API Security Top 10: API5 (BFLA) / API4 (Unrestricted Resource Consumption)**

**Descrição:** Estar sob `/gestor/` **não protege a action** — Server Actions são endpoints públicos invocáveis por qualquer sessão. `extractDataFromPDF` não checa role e não limita tamanho do `base64Data`. Um OPERATOR autenticado (ou script com sessão) pode chamá-la repetidamente com PDFs arbitrários, **consumindo a cota paga do `GEMINI_API_KEY`** (abuso de custo / DoS financeiro). As outras actions do arquivo (`saveMappedReadings`, `createParameterFromImport`) checam `MANAGER`; esta e `getMappingContext` não.

**Correção (patch):**
```ts
export async function extractDataFromPDF(base64Data: string, mimeType: string) {
  const session = await auth()
  if (!session || session.user.role !== 'MANAGER') {
    throw new Error('Não autorizado.')
  }
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(mimeType)) {
    throw new Error('Tipo de arquivo inválido.')
  }
  // limite de tamanho (base64 ~= 1.37x bytes): ~10MB de PDF
  if (base64Data.length > 14_000_000) throw new Error('Arquivo muito grande.')
  // ... resto
}
```
> Aplique o mesmo guard de role em `getMappingContext`. Considere rate-limit por usuário para a importação (ver MÉDIO/lógica de negócio).

---

### 🟡 MÉDIO-04 — CSV / Formula Injection na exportação
**Arquivo:** `src/app/api/export/route.ts` (todos os blocos de `csv +=`)
**WSTG-CLNT / CWE-1236**

**Descrição:** Campos controlados por usuário (descrição de ocorrência, nome de equipamento, notas, nome do reporter) são escritos no CSV apenas com aspas duplas escapadas. Isso **não impede formula injection**: uma célula começando com `=`, `+`, `-` ou `@` é interpretada como fórmula pelo Excel/Sheets ao abrir o arquivo, permitindo `=HYPERLINK`, execução de comando via DDE, ou exfiltração de dados da planilha do gestor.

**Prova:** `oc.description` = `=cmd|'/c calc'!A1` → gravado como `"=cmd|..."`, ainda executa no Excel.

**Correção (patch):**
```ts
function csvSafe(value: unknown): string {
  const s = String(value ?? '')
  // Neutraliza gatilhos de fórmula prefixando com apóstrofo
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s
  return `"${safe.replace(/"/g, '""')}"`
}
// usar csvSafe() em TODAS as células de texto livre (description, name, notes, reporter.name...)
```

---

### 🟡 MÉDIO-05 — Uploads validados só pelo `Content-Type` do cliente (sem magic bytes)
**Arquivos:** `src/app/operador/ocorrencias/actions.ts:102-114` · uploads de leituras, tarefas e equipamentos · `src/lib/storage.ts`
**WSTG-BUSL-09 / ASVS 12.2**

**Descrição:** A validação de tipo confia em `file.type` (o MIME informado pelo navegador, forjável), não nos magic bytes reais do arquivo. Combinado com a **ausência de `X-Content-Type-Options: nosniff`** (MÉDIO-01) e uploads no Vercel Blob com `access: 'public'`, um arquivo poliglota/malicioso servido inline pode ser sniffado pelo browser. Tamanho (5MB) e extensão são checados — bom —, mas o conteúdo não é inspecionado.

**Correção:**
- Emitir `nosniff` (já incluso no patch MÉDIO-01).
- Validar magic bytes antes de salvar:
```ts
const sig = buffer.subarray(0, 12)
const isJpg = sig[0] === 0xFF && sig[1] === 0xD8
const isPng = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4E && sig[3] === 0x47
const isWebp = sig.subarray(0,4).toString('ascii') === 'RIFF' && sig.subarray(8,12).toString('ascii') === 'WEBP'
if (!isJpg && !isPng && !isWebp) return { error: `Conteúdo de ${file.name} não é uma imagem válida.` }
```
> Nota: os blobs são `access: 'public'` mas com nome `crypto.randomUUID()` (não adivinhável) e servidos por rotas autenticadas tenant-safe — a URL do Blob não é exposta. Aceitável, mas documente que a URL pública, se vazar, dá acesso sem auth ao arquivo.

---

### 🟡 MÉDIO-06 — Enumeração de usuário por timing no login (dummy hash inválido)
**Arquivo:** `src/lib/auth.ts:68-76`
**WSTG-ATHN-03**

**Descrição:** A defesa contra timing attack usa um "dummy hash" **malformado** (`"$2a$10$8.z8o.bM..."` não é um hash bcrypt válido). `bcrypt.compare` com hash inválido retorna rápido **sem** fazer o trabalho de KDF, então o tempo de resposta para e-mail inexistente ≠ e-mail existente (que roda bcrypt custo 12). Além disso, só para usuário existente há `loginAttempt.create` + `count`, adicionando latência assimétrica. Dá para enumerar contas medindo o tempo de resposta.

**Correção (patch):**
```ts
// Hash bcrypt REAL de uma senha qualquer (gere uma vez com bcrypt.hash e cole):
const dummyHash = '$2a$12$C6UzMDM.H6dfI/f/IKcEeO3f7Z1I0rN8b3vJb1a9m0q2n5s7u9wXy'
if (!user) {
  await verifyPassword(password, dummyHash).catch(() => {}) // agora gasta o mesmo tempo
  return null
}
```
> Prioridade menor que os Altos, mas fácil de corrigir. A superfície é estreita porque o e-mail é único global.

---

### 🟡 MÉDIO-07 — Service Worker (Serwist) pode cachear páginas autenticadas em dispositivo compartilhado
**Arquivo:** `src/app/sw.ts` (usa `defaultCache` do `@serwist/next`)
**WSTG-CLNT / contexto: tablets de campo compartilhados entre operadores**

**Descrição:** `runtimeCaching: defaultCache` inclui estratégia de cache para navegação (páginas). Em tablets de ETE compartilhados por vários operadores, páginas server-rendered com dados do operador A podem ficar no CacheStorage e ser recuperadas offline pelo operador B após logout. Sessão é JWT (cookie), mas o **conteúdo HTML renderizado** persiste no cache do dispositivo.

**Correção:** Definir `runtimeCaching` custom que use `NetworkOnly` para rotas dinâmicas (`/operador`, `/tecnico`, `/gestor`, `/api`) e cacheie apenas assets estáticos; e limpar caches no logout (`caches.keys().then(...)` no client de logout). Requer verificação de qual estratégia o `defaultCache` aplica na sua versão do Serwist.

---

### 🔵 BAIXO-01 — `/api/logs` aceita entrada não validada e faz spread de `context` no logger
**Arquivo:** `src/app/api/logs/route.ts:14-21`
**Descrição:** O corpo do POST é logado sem validação; `...context` (objeto do cliente) é espalhado no logger-filho, permitindo sobrescrever/forjar campos estruturados (`userId`, `tenantId`, `action`) e poluir os logs (log injection / spam). A auth vem só do middleware (defesa única). **Correção:** validar `level`/`message` com Zod, allowlist de chaves de `context`, e truncar tamanho.

### 🔵 BAIXO-02 — `saveMappedReadings` não rejeita `pointId` inválido/de outro tenant
**Arquivo:** `src/app/gestor/laudos/importar/actions.ts:192-195`
**Descrição:** `point = findFirst({id, tenant})` mas, se `null`, a função **prossegue** e cria a análise com `collection_point_id: data.pointId` mesmo assim (FK é global). Um MANAGER poderia associar um ponto de outro tenant à sua própria análise (integridade/vazamento menor de nome de ponto). **Correção:** `if (!point) return { success: false, error: 'Ponto inválido.' }`.

### 🔵 BAIXO-03 — Sessões JWT não são revogadas ao trocar senha / mudar role
**Descrição:** Estratégia `jwt` é stateless; após `resetPassword` ou mudança de role, tokens antigos seguem válidos até `exp` (30-60 min). Inerente ao design. **Aceitável** dado o TTL curto; documente. Se precisar revogação imediata, migre para sessão em DB ou adote uma `token_version` no User checada no callback.

### 🔵 BAIXO-04 — Inconsistência de política de senha
**Arquivos:** `src/lib/password.ts` (`passwordSchema` min 10 vs `validatePassword` min 8, não usado) · `trocar-senha/actions.ts:12` (schema local min 8, depois revalida com `passwordSchema` min 10)
**Descrição:** Duas políticas coexistem; `validatePassword` parece morta. Sem impacto direto (o caminho real aplica min 10), mas confunde manutenção. **Correção:** remover `validatePassword`/`PASSWORD_POLICY` e usar só `passwordSchema`.

### 🔵 BAIXO-05 — Troca de senha forçada não exige senha atual
**Arquivo:** `src/app/(auth)/trocar-senha/actions.ts`
**Descrição:** No 1º acesso não há senha "antiga" a confirmar (ok), mas não existe fluxo de "alterar minha senha" autenticado que exija a atual. Se um atacante obtiver uma sessão ativa, troca a senha sem conhecer a anterior. Baixo (requer sessão já comprometida). **Correção:** se criar um fluxo de troca voluntária, exigir `currentPassword`.

### 🔵 BAIXO-06 — `npm audit`: 2 vulnerabilidades moderate (postcss via Next)
**Descrição:** `postcss <8.5.10` (XSS via `</style>` no stringify) puxado pelo Next. Risco prático baixo (build-time, não runtime de request). **Correção:** acompanhar release do Next que atualize o postcss transitivo; não force `audit fix --force` (rebaixaria o Next). Ativar Dependabot (já presente no repo).

---

## 3. VERIFICADO E CORRETO (não são achados — registre a cobertura)

- ✅ **Isolamento de tenant** aplicado corretamente em: fotos (`readings/occurrences/equipments/shift-task-photos` — todas `findFirst {id, tenant_id}`), gestão de usuários (`updateMany {id, tenant_id}`), export CSV, busca global, `resolverOcorrencia`/`updateOccurrenceStatus`, cron (job de sistema, itera por tenant). O padrão IDOR-safe é a regra; ALTO-02 é a única exceção encontrada.
- ✅ **Reset de senha:** token `randomBytes(32)`, armazenado só como hash SHA-256, TTL 60min, uso único, invalida anteriores, transação atômica, sem enumeração (`/forgot` sempre retorna sucesso). Exemplar.
- ✅ **Hash de senha:** bcrypt custo 12.
- ✅ **SQL Injection:** nenhum. `$queryRaw` no dashboard usa `Prisma.sql` (template parametrizado); resto via Prisma Client.
- ✅ **Segredos:** nenhum hardcoded em `src/`; `.env*` no `.gitignore` com `!.env.example`; `.env` nunca esteve no histórico do git.
- ✅ **`NEXT_PUBLIC_`:** só `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (chave pública VAPID — correto expor).
- ✅ **RBAC nas Server Actions:** guard de role no início da maioria das actions (padrão `requireManager`/`requireTechnicianOrManager`/`requireAuthenticated`). Exceções: MÉDIO-03.
- ✅ **Privilege escalation:** `UsuarioSchema` restringe role a `OPERATOR/TECHNICIAN/MANAGER/MAINTENANCE` — MANAGER não consegue criar `SUPER_ADMIN`.
- ✅ **Open redirect:** `callbackUrl` no `proxy.ts` usa só `pathname` (sem host) → sem redirect externo.
- ✅ **SSRF:** `readUpload` faz `fetch` apenas de URLs geradas por `saveUpload` (Blob), não de input de usuário; `photo_url`/`manual_url` vêm de upload, não de string livre.
- ✅ **Cron:** fail-closed em produção (`Bearer CRON_SECRET`), excluído do middleware corretamente, `opened_by` usa FK válida (bug antigo corrigido).
- ✅ **CSRF:** Server Actions do Next 15/16 têm proteção de origem embutida (checagem Origin/Host, só POST same-origin); NextAuth cuida do CSRF das próprias rotas.

---

## 4. PLANO DE REMEDIAÇÃO PRIORIZADO (ciclos de commit)

**Ciclo 1 — Altos (fazer antes de qualquer tenant novo):**
1. `fix(auth): bloqueia login de conta desativada (is_active)` → ALTO-01
2. `fix(ocorrencias): valida tenant em addOccurrenceComment (IDOR)` → ALTO-02

**Ciclo 2 — Hardening de plataforma (1 commit, alto impacto):**
3. `feat(security): headers HTTP (CSP-RO, HSTS, X-Frame-Options, nosniff)` → MÉDIO-01 (+ resolve metade do MÉDIO-05)

**Ciclo 3 — Médios de aplicação:**
4. `fix(security): senha provisoria com CSPRNG` → MÉDIO-02
5. `fix(laudos): guard de role + limites em extractDataFromPDF/getMappingContext` → MÉDIO-03
6. `fix(export): neutraliza formula injection no CSV` → MÉDIO-04
7. `fix(uploads): valida magic bytes das imagens` → MÉDIO-05
8. `fix(auth): dummy hash valido contra enumeração por timing` → MÉDIO-06
9. `fix(pwa): runtimeCaching NetworkOnly em rotas autenticadas + limpa cache no logout` → MÉDIO-07

**Ciclo 4 — Baixos + defesa em profundidade:**
10. BAIXO-01..06 (validar `/api/logs`, rejeitar pointId inválido, limpar política de senha duplicada, etc.)
11. **Arquitetural:** habilitar RLS no Supabase (política `tenant_id = current_setting(...)`) como rede de segurança sob a camada de aplicação — a mudança de maior alavancagem de longo prazo.

---

## 5. MATRIZ DE COBERTURA

| Fase | Tema | Status | Observação |
|---|---|---|---|
| 0 | Recon e mapeamento | ✅ Auditada | 39 models, 9 rotas API, 29 arquivos de action, `tenant_id` em ~todas as tabelas (exceção: `occurrence_comments`, `parameter_history`) |
| 1 | Isolamento de tenant / IDOR | ✅ Auditada | 1 IDOR (ALTO-02); resto consistente. Prisma bypassa RLS → isolamento 100% app-layer |
| 2 | Autenticação | ✅ Auditada | ALTO-01, MÉDIO-06; reset exemplar. AUTH_SECRET → verificação manual |
| 3 | Sessão e CSRF | ✅ Auditada | JWT stateless (BAIXO-03); CSRF coberto pelo framework; cookies = defaults NextAuth (verificar `__Secure` em prod) |
| 4 | Autorização / RBAC | ✅ Auditada | Guards presentes; exceção MÉDIO-03 |
| 5 | Injeção e validação | ✅ Auditada | Sem SQLi/XSS/SSRF/open-redirect; CSV injection (MÉDIO-04) |
| 6 | Supabase / RLS | ⚠️ Parcial | Código confirma uso de conexão direta (bypassa RLS). **Verificação manual:** estado de RLS nas tabelas e ausência de anon key exposta (nenhuma encontrada no código) |
| 7 | Segredos e dados | ✅ Auditada | Sem segredos no código/histórico; masking de log já existe (`logger.ts`) |
| 8 | Criptografia | ✅ Auditada | bcrypt 12 ✅; tokens de reset cripto ✅; `Math.random` em senha provisória (MÉDIO-02) |
| 9 | Upload / Blob | ✅ Auditada | MÉDIO-05 (magic bytes/nosniff); paths gerados por UUID (sem traversal) |
| 10 | Config / hardening | ✅ Auditada | MÉDIO-01 (headers). Sem endpoint de debug no branch local (há um removido em `origin/main` — reauditar) |
| 11 | Lógica de negócio / race | ⚠️ Parcial | Turno duplicado tem `@@unique` no schema (bom); rate-limit em ops caras ausente (MÉDIO-03). Revisão profunda de máquina de estados = verificação manual |
| 12 | PWA / Serwist | ✅ Auditada | MÉDIO-07 (cache de páginas autenticadas em device compartilhado) |
| 13 | Cron / webhooks | ✅ Auditada | Cron fail-closed ✅; sem webhooks de terceiros recebidos |
| 14 | Dependências | ✅ Auditada | 2 moderate (postcss via Next) — BAIXO-06; next-auth em beta (verificação manual de advisories da versão exata) |
| 15 | Logging / detecção | ✅ Auditada | `login_attempts` + `audit_logs` cobrem eventos-chave; masking de PII no `logger.ts` ✅; `/api/logs` frouxo (BAIXO-01) |

### Itens que exigem verificação manual (fora do alcance da análise estática)
- **`AUTH_SECRET`/`NEXTAUTH_SECRET`** forte e presente na Vercel (não visível no repo).
- **RLS habilitado** nas tabelas do Supabase e privilégios do papel do Postgres usado pelo Prisma.
- **`CRON_SECRET`, `RESEND_API_KEY`, `BLOB_READ_WRITE_TOKEN`, `GEMINI_API_KEY`, `WHATSAPP_TOKEN`** configurados só no server (nenhum com `NEXT_PUBLIC_`).
- **Advisories da versão exata do `next-auth@5.0.0-beta.31`** — beta no caminho crítico de auth; acompanhe o changelog de segurança.
- **Cookies em produção** com prefixo `__Secure-`/`__Host-` (depende de HTTPS + `trustHost`; padrão do NextAuth v5 na Vercel deve cobrir).
- **Reauditar os 4 commits de `origin/main`** ainda não presentes no working tree local (incluíam uma rota de diagnóstico de e-mail adicionada e depois removida).

---
*Fim do relatório. Gerado por análise estática autorizada — nenhum dado foi alterado.*
