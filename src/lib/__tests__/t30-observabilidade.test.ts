import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const logs: Array<{ nivel: string; obj: Record<string, unknown>; msg: string }> = []
const filho = {
  info: (obj: Record<string, unknown>, msg: string) => logs.push({ nivel: 'info', obj, msg }),
  warn: (obj: Record<string, unknown>, msg: string) => logs.push({ nivel: 'warn', obj, msg }),
  error: (obj: Record<string, unknown>, msg: string) => logs.push({ nivel: 'error', obj, msg }),
}
vi.mock('@/lib/logger', () => ({
  getLogger: async (ctx: Record<string, unknown>) => ({
    info: (o: Record<string, unknown>, m: string) => filho.info({ ...ctx, ...o }, m),
    warn: (o: Record<string, unknown>, m: string) => filho.warn({ ...ctx, ...o }, m),
    error: (o: Record<string, unknown>, m: string) => filho.error({ ...ctx, ...o }, m),
  }),
  logger: { error: vi.fn() },
}))
vi.mock('@/server/auth/guards', () => ({
  getActor: async () => ({ userId: 'u1', tenantId: 't1', role: 'OPERATOR', email: 'a@b.com', name: 'x' }),
}))

import {
  medir, comMedicao, ehFluxoDoNext, limiteLentoMs, classificarDuracao, baterCoracaoDoCron,
} from '@/lib/observability'
import { limparEvento, mascararEmails, opcoesSentry, sentryAtivo } from '@/lib/sentry-config'

const esperar = () => new Promise((r) => setTimeout(r, 20))
const raiz = join(__dirname, '..', '..', '..')

beforeEach(() => { logs.length = 0; delete process.env.SENTRY_DSN })

describe('T-30 medir / comMedicao', () => {
  it('ação ok: devolve o resultado, registra duração e contexto, nível info', async () => {
    const r = await medir('minhaAcao', async () => ({ success: true }))
    await esperar()
    expect(r).toEqual({ success: true })
    expect(logs).toHaveLength(1)
    expect(logs[0].nivel).toBe('info')
    expect(logs[0].obj).toMatchObject({ action: 'minhaAcao', outcome: 'ok', tenantId: 't1', userId: 'u1' })
    expect(typeof logs[0].obj.durationMs).toBe('number')
  })

  it('ação lenta vira warn', async () => {
    process.env.SLOW_ACTION_MS = '5'
    try {
      await medir('lenta', () => new Promise((r) => setTimeout(() => r(1), 30)))
      await esperar()
      expect(logs[0].nivel).toBe('warn')
    } finally { delete process.env.SLOW_ACTION_MS }
  })

  it('exceção: relança a MESMA exceção e registra error', async () => {
    const boom = new Error('falha de banco')
    await expect(medir('quebra', async () => { throw boom })).rejects.toBe(boom)
    await esperar()
    expect(logs[0].nivel).toBe('error')
    expect(logs[0].obj).toMatchObject({ action: 'quebra', outcome: 'erro' })
  })

  it('redirect/notFound do Next NÃO são erro: relança, não registra error', async () => {
    const redir = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;replace;/login;307;' })
    await expect(medir('x', async () => { throw redir })).rejects.toBe(redir)
    await esperar()
    expect(logs.filter((l) => l.nivel === 'error')).toHaveLength(0)
    expect(ehFluxoDoNext(redir)).toBe(true)
    expect(ehFluxoDoNext(Object.assign(new Error(), { digest: 'NEXT_NOT_FOUND' }))).toBe(true)
    expect(ehFluxoDoNext(new Error('outro'))).toBe(false)
    expect(ehFluxoDoNext(null)).toBe(false)
  })

  it('retorno { error } de validação é resposta normal (info), não falha', async () => {
    const r = await medir('valida', async () => ({ error: 'Dados inválidos' }))
    await esperar()
    expect(r).toEqual({ error: 'Dados inválidos' })
    expect(logs[0].nivel).toBe('info')
  })

  it('comMedicao mantém argumentos e retorno', async () => {
    const f = comMedicao('soma', async (a: number, b: number) => a + b)
    expect(await f(2, 3)).toBe(5)
  })

  it('limite lento: padrão 2000 ms; valor inválido cai no padrão', () => {
    expect(limiteLentoMs({} as NodeJS.ProcessEnv)).toBe(2000)
    expect(limiteLentoMs({ SLOW_ACTION_MS: 'abc' } as unknown as NodeJS.ProcessEnv)).toBe(2000)
    expect(limiteLentoMs({ SLOW_ACTION_MS: '500' } as unknown as NodeJS.ProcessEnv)).toBe(500)
    expect(classificarDuracao(1999, 2000)).toBe('info')
    expect(classificarDuracao(2000, 2000)).toBe('warn')
  })

  it('o log de uma ação não carrega PII (só ids opacos)', async () => {
    await medir('a', async () => 1)
    await esperar()
    const json = JSON.stringify(logs)
    expect(json).not.toContain('a@b.com')
  })
})

describe('T-30 batimento do cron', () => {
  const orig = globalThis.fetch
  afterEach(() => { globalThis.fetch = orig })

  it('sem URL configurada não faz nada', async () => {
    const f = vi.fn(); globalThis.fetch = f as unknown as typeof fetch
    expect(await baterCoracaoDoCron(true, {} as NodeJS.ProcessEnv)).toBe(false)
    expect(f).not.toHaveBeenCalled()
  })

  it('sucesso chama a URL; falha chama /fail', async () => {
    const f = vi.fn(async () => ({ ok: true })); globalThis.fetch = f as unknown as typeof fetch
    const env = { CRON_HEARTBEAT_URL: 'https://hc.example/ping/abc/' } as unknown as NodeJS.ProcessEnv
    expect(await baterCoracaoDoCron(true, env)).toBe(true)
    expect(String((f.mock.calls[0] as unknown[])[0])).toBe('https://hc.example/ping/abc/')
    await baterCoracaoDoCron(false, env)
    expect(String((f.mock.calls[1] as unknown[])[0])).toBe('https://hc.example/ping/abc/fail')
  })

  it('rede quebrada ou URL http/ inválida: não lança', async () => {
    globalThis.fetch = vi.fn(async () => { throw new Error('rede') }) as unknown as typeof fetch
    const e = (u: string) => ({ CRON_HEARTBEAT_URL: u }) as unknown as NodeJS.ProcessEnv
    expect(await baterCoracaoDoCron(true, e('https://hc.example/x'))).toBe(false)
    const f = vi.fn(); globalThis.fetch = f as unknown as typeof fetch
    expect(await baterCoracaoDoCron(true, e('http://inseguro.example/x'))).toBe(false)
    expect(await baterCoracaoDoCron(true, e('não é url'))).toBe(false)
    expect(f).not.toHaveBeenCalled()
  })
})

describe('T-30 Sentry: limpeza de dados', () => {
  it('sem DSN fica desligado; com DSN liga e nunca envia PII por padrão', () => {
    expect(sentryAtivo({} as NodeJS.ProcessEnv)).toBe(false)
    const env = { SENTRY_DSN: 'https://x@o.ingest.sentry.io/1' } as unknown as NodeJS.ProcessEnv
    expect(sentryAtivo(env)).toBe(true)
    const o = opcoesSentry(env)
    expect(o.sendDefaultPii).toBe(false)
    expect(o.tracesSampleRate).toBe(0)
    expect(typeof o.beforeSend).toBe('function')
  })

  it('taxa de tracing: só aceita 0..1', () => {
    const e = (v: string) => ({ SENTRY_TRACES_SAMPLE_RATE: v }) as unknown as NodeJS.ProcessEnv
    expect(opcoesSentry(e('0.2')).tracesSampleRate).toBe(0.2)
    expect(opcoesSentry(e('5')).tracesSampleRate).toBe(0)
    expect(opcoesSentry(e('x')).tracesSampleRate).toBe(0)
  })

  it('limparEvento remove cookies, corpo, query, headers de autenticação, e-mail do usuário e mascara e-mails no texto', () => {
    const ev = limparEvento({
      type: undefined,
      message: 'falha para joao@empresa.com.br ao salvar',
      request: {
        cookies: { 'authjs.session-token': 'abc' },
        data: { password: 'x' },
        query_string: 'token=zzz',
        headers: { Authorization: 'Bearer s', Cookie: 'a=b', 'User-Agent': 'ua', 'x-vercel-id': 'gru1::1' },
      },
      user: { id: 'u1', email: 'joao@empresa.com.br', ip_address: '1.2.3.4', username: 'joao' },
      exception: { values: [{ value: 'erro com maria@x.com' }] },
    } as never) as never as {
      message: string
      request: { cookies?: unknown; data?: unknown; query_string?: unknown; headers: Record<string, string> }
      user: Record<string, unknown>
      exception: { values: Array<{ value: string }> }
    }
    expect(ev.request.cookies).toBeUndefined()
    expect(ev.request.data).toBeUndefined()
    expect(ev.request.query_string).toBeUndefined()
    expect(Object.keys(ev.request.headers).map((k) => k.toLowerCase())).toEqual(['user-agent', 'x-vercel-id'])
    expect(ev.user).toEqual({ id: 'u1' })
    expect(ev.message).toBe('falha para [email] ao salvar')
    expect(ev.exception.values[0].value).toBe('erro com [email]')
    expect(mascararEmails('a@b.co e c@d.org')).toBe('[email] e [email]')
  })

  it('migalhas de console saem; query string some de URL/caminho; e-mail some de qualquer texto aninhado', () => {
    const ev = limparEvento({
      breadcrumbs: [
        { category: 'console', message: 'erro maria@x.com', data: { arguments: ['maria@x.com'] } },
        { category: 'http', data: { url: 'https://app.exemplo/api/x?token=zzz&email=a@b.com' } },
      ],
      contexts: { nextjs: { request_path: '/api/health/zz2?token=zzz', router_path: '/api/health/zz2' } },
      request: { url: 'https://app.exemplo/reset?token=abc' },
      transaction: 'GET /reset?token=abc',
      extra: { fundo: { dono: 'carlos@empresa.com' } },
    } as never) as never as {
      breadcrumbs: Array<{ category: string; data: { url: string } }>
      contexts: { nextjs: { request_path: string } }
      request: { url: string }
      transaction: string
      extra: { fundo: { dono: string } }
    }
    expect(ev.breadcrumbs).toHaveLength(1)
    expect(ev.breadcrumbs[0].category).toBe('http')
    expect(ev.breadcrumbs[0].data.url).toBe('https://app.exemplo/api/x')
    expect(ev.contexts.nextjs.request_path).toBe('/api/health/zz2')
    expect(ev.request.url).toBe('https://app.exemplo/reset')
    expect(ev.transaction).toBe('GET /reset')
    expect(ev.extra.fundo.dono).toBe('[email]')
    expect(JSON.stringify(ev)).not.toMatch(/@x\.com|@b\.com|token=/)
  })

  it('usuário sem id é descartado por inteiro', () => {
    const ev = limparEvento({ user: { email: 'a@b.com' } } as never) as never as { user?: unknown }
    expect(ev.user).toBeUndefined()
  })
})

describe('T-30 amarrações (arquivos)', () => {
  const ler = (p: string) => readFileSync(join(raiz, p), 'utf8')

  it('instrumentação: continua definindo o fuso e só liga o Sentry com DSN no runtime Node', () => {
    const s = ler('src/instrumentation.ts')
    expect(s).toContain("process.env.TZ = 'America/Sao_Paulo'")
    expect(s).toMatch(/NEXT_RUNTIME === 'nodejs' && process\.env\.SENTRY_DSN/)
    expect(s).toContain('export async function onRequestError')
  })

  it('o health check é público no proxy, mínimo e sem cache', () => {
    expect(ler('src/proxy.ts')).toContain('api/health')
    const r = ler('src/app/api/health/route.ts')
    expect(r).toContain("dynamic = 'force-dynamic'")
    expect(r).toContain("{ status: 'ok' }")
    expect(r).toContain("{ status: 'falha' }")
    expect(r).not.toMatch(/err\.message|String\(err\)|stack/)
  })

  it('ações críticas passam por medir (e a lógica original segue em *Impl)', () => {
    const casos: Array<[string, string[]]> = [
      ['src/app/operador/leituras/actions.ts', ['registrarLeitura']],
      ['src/app/operador/estoque/actions.ts', ['registrarSaida', 'registrarContagem']],
      ['src/app/gestor/produtos-quimicos/actions.ts', ['registrarEntrada']],
    ]
    for (const [arq, nomes] of casos) {
      const s = ler(arq)
      for (const n of nomes) {
        expect(s).toContain(`async function ${n}Impl(`)
        expect(s).toContain(`medir('${n}', () => ${n}Impl(...args))`)
        expect(s).toMatch(new RegExp(`export async function ${n}\\(`))
      }
    }
  })

  it('o cron registra conclusão e bate o coração (ok e falha)', () => {
    const s = ler('src/app/api/cron/shifts/route.ts')
    expect(s).toContain('Cron de turnos concluído')
    expect(s).toContain('baterCoracaoDoCron(true)')
    expect(s).toContain('baterCoracaoDoCron(false)')
  })

  it('@sentry/nextjs está fixado em versão exata', () => {
    const pkg = JSON.parse(ler('package.json'))
    expect(pkg.dependencies['@sentry/nextjs']).toMatch(/^\d+\.\d+\.\d+$/)
  })
})
