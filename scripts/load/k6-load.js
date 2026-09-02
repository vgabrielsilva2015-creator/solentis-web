// ==============================================================
// Solentis — teste de carga (k6)
// ==============================================================
// Simula usuários reais logando e navegando (dashboard + leituras),
// subindo a carga em degraus até achar o "joelho" — o ponto onde o
// tempo de resposta dispara ou os erros começam. É assim que se
// descobre "quantas pessoas aguenta" com número, não com chute.
//
// COMO RODAR (contra o STAGING, nunca produção sem avisar):
//   1. Instale o k6:  https://k6.io/docs/get-started/installation/
//   2. Rode:
//        k6 run -e BASE_URL=https://SEU-STAGING.vercel.app \
//               -e EMAIL=operador@planta.local \
//               -e PASSWORD=SenhaDoStaging \
//               scripts/load/k6-load.js
//
// Para variar plantas/usuários, aponte EMAIL/PASSWORD para contas de
// tenants diferentes em execuções paralelas (veja o README ao lado).
// ==============================================================

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const EMAIL    = __ENV.EMAIL    || 'operador@solentis.local'
const PASSWORD = __ENV.PASSWORD || 'Operador@123'

// Métricas próprias para separar login de navegação no relatório final.
const loginFail   = new Rate('login_failed')
const loginTime   = new Trend('login_duration', true)
const browseTime  = new Trend('browse_duration', true)

export const options = {
  // Degraus de carga: sobe, segura, sobe mais. Assim dá pra ver EXATAMENTE
  // em qual patamar de usuários o sistema começa a sofrer.
  stages: [
    { duration: '1m', target: 50 },   // aquecimento
    { duration: '2m', target: 50 },   // patamar 1 — uso normal de uma planta
    { duration: '1m', target: 200 },  // sobe
    { duration: '2m', target: 200 },  // patamar 2 — várias plantas juntas
    { duration: '1m', target: 500 },  // sobe — aqui o Free do Supabase deve gritar
    { duration: '2m', target: 500 },  // patamar 3 — estresse
    { duration: '1m', target: 0 },    // desaquece
  ],
  thresholds: {
    // Metas: se estourar, o k6 marca o teste como FALHO — isso é o "veredito".
    http_req_duration: ['p(95)<2000'],   // 95% das requisições abaixo de 2s
    http_req_failed:   ['rate<0.02'],    // menos de 2% de erro
    login_failed:      ['rate<0.02'],
  },
}

// Login no NextAuth (fluxo credentials): pega o CSRF token, depois posta
// as credenciais. O cookie de sessão fica no jar do k6 automaticamente.
function login() {
  const t0 = Date.now()

  const csrfRes = http.get(`${BASE_URL}/api/auth/csrf`)
  const csrfToken = csrfRes.json('csrfToken')

  const res = http.post(`${BASE_URL}/api/auth/callback/credentials`, {
    csrfToken,
    email: EMAIL,
    password: PASSWORD,
    json: 'true',
  }, { redirects: 0 })

  loginTime.add(Date.now() - t0)

  // NextAuth responde 200/302 e seta o cookie de sessão quando dá certo.
  const ok = res.status === 200 || res.status === 302
  loginFail.add(!ok)
  return ok
}

export default function () {
  group('login', () => {
    const ok = login()
    check(null, { 'login ok': () => ok })
    if (!ok) { sleep(2); return }
  })

  // Usuário logado navegando — as telas mais quentes do dia a dia.
  group('navegar', () => {
    const t0 = Date.now()
    const responses = http.batch([
      ['GET', `${BASE_URL}/operador/dashboard`],
      ['GET', `${BASE_URL}/operador/leituras`],
    ])
    browseTime.add(Date.now() - t0)
    responses.forEach(r => check(r, { 'página 2xx/3xx': (x) => x.status < 400 }))
  })

  // "Think time" — gente real não recarrega sem parar. 3–8s entre ações.
  sleep(Math.random() * 5 + 3)
}
