// ==============================================================
// Solentis — teste de carga em Node puro (sem instalar k6)
// ==============================================================
// Roda com o Node que já existe no projeto. Simula usuários simultâneos
// fazendo login (NextAuth credentials) e navegando, em degraus de carga,
// e reporta latência (p50/p95/max), throughput e taxa de erro por degrau.
//
// USO:
//   node scripts/load/node-load.mjs \
//     --url=https://SEU-APP.vercel.app \
//     --email=operador@planta.local \
//     --password=SenhaDeTeste
//
// Opcional: --stages=10,50,100  (nº de usuários simultâneos por degrau)
//           --seconds=30        (duração de cada degrau)
//           --no-auth           (testa só páginas públicas, sem login)
//
// ⚠️ Rode contra STAGING. Só use produção se estiver pré-lançamento
//    (sem usuários reais) e com consciência de que cria dados de teste.
// ==============================================================

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...v] = a.replace(/^--/, '').split('=')
    return [k, v.length ? v.join('=') : true]
  }),
)

const BASE_URL = (args.url || '').replace(/\/$/, '')
const EMAIL = args.email || ''
const PASSWORD = args.password || ''
const NO_AUTH = !!args['no-auth']
const STAGES = (args.stages ? String(args.stages).split(',') : ['10', '50', '100']).map(Number)
const SECONDS = Number(args.seconds || 30)

if (!BASE_URL) {
  console.error('Falta --url=https://seu-app.vercel.app')
  process.exit(1)
}
if (!NO_AUTH && (!EMAIL || !PASSWORD)) {
  console.error('Falta --email e --password (ou use --no-auth para testar só páginas públicas)')
  process.exit(1)
}

// ── Cookie jar mínimo por "usuário virtual" ──────────────────────────────────
function makeJar() {
  const cookies = new Map()
  return {
    store(res) {
      const setCookies = res.headers.getSetCookie?.() ?? []
      for (const c of setCookies) {
        const [pair] = c.split(';')
        const idx = pair.indexOf('=')
        if (idx > 0) cookies.set(pair.slice(0, idx).trim(), pair.slice(idx + 1).trim())
      }
    },
    header() {
      return [...cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
    },
  }
}

async function login(jar) {
  // 1) CSRF token (NextAuth)
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`, { redirect: 'manual' })
  jar.store(csrfRes)
  const { csrfToken } = await csrfRes.json()

  // 2) POST credenciais
  const body = new URLSearchParams({ csrfToken, email: EMAIL, password: PASSWORD, json: 'true' })
  const res = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: jar.header() },
    body,
    redirect: 'manual',
  })
  jar.store(res)
  return res.status < 400 || res.status === 302
}

async function timed(fn) {
  const t0 = performance.now()
  let ok = true
  try {
    ok = await fn()
  } catch {
    ok = false
  }
  return { ms: performance.now() - t0, ok }
}

// Um "usuário virtual": loga (se preciso) e repete navegação até o degrau acabar.
async function virtualUser(deadline, samples) {
  const jar = makeJar()
  if (!NO_AUTH) {
    const r = await timed(() => login(jar))
    samples.push({ kind: 'login', ...r })
    if (!r.ok) return
  }
  while (performance.now() < deadline) {
    const path = NO_AUTH ? '/login' : '/operador/dashboard'
    const r = await timed(async () => {
      const res = await fetch(`${BASE_URL}${path}`, { headers: { cookie: jar.header() }, redirect: 'manual' })
      return res.status < 400
    })
    samples.push({ kind: 'browse', ...r })
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 700)) // think time
  }
}

function pct(sortedArr, p) {
  if (!sortedArr.length) return 0
  return sortedArr[Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length))]
}

function report(label, samples) {
  const all = samples.map((s) => s.ms).sort((a, b) => a - b)
  const errors = samples.filter((s) => !s.ok).length
  const dur = all.map((n) => Math.round(n))
  console.log(
    `  ${label.padEnd(14)} reqs=${String(samples.length).padStart(5)}  ` +
      `erros=${String(errors).padStart(4)} (${((errors / (samples.length || 1)) * 100).toFixed(1)}%)  ` +
      `p50=${String(pct(dur, 50)).padStart(5)}ms  p95=${String(pct(dur, 95)).padStart(5)}ms  max=${String(dur.at(-1) ?? 0).padStart(6)}ms`,
  )
}

async function runStage(vus) {
  const samples = []
  const deadline = performance.now() + SECONDS * 1000
  await Promise.all(Array.from({ length: vus }, () => virtualUser(deadline, samples)))
  const logins = samples.filter((s) => s.kind === 'login')
  const browses = samples.filter((s) => s.kind === 'browse')
  console.log(`\n▶ Degrau: ${vus} usuários simultâneos por ${SECONDS}s`)
  if (logins.length) report('login', logins)
  report('navegação', browses)
  const errRate = samples.filter((s) => !s.ok).length / (samples.length || 1)
  return errRate
}

console.log(`\n=== Teste de carga Solentis → ${BASE_URL} ${NO_AUTH ? '(sem auth)' : `(login: ${EMAIL})`} ===`)
for (const vus of STAGES) {
  const errRate = await runStage(vus)
  if (errRate > 0.3) {
    console.log(`\n⛔ Taxa de erro ${(errRate * 100).toFixed(0)}% no degrau de ${vus} — parando (achamos o teto).`)
    break
  }
}
console.log('\n✅ Fim do teste.')
