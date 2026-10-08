import { test, expect, type Page } from '@playwright/test'
import bcrypt from 'bcryptjs'
import { totpAt } from '../src/lib/mfa/totp'

/**
 * Fase 2 do Super Admin — segundo fator no navegador. O servidor sobe com MFA_ENFORCE=<modo> e
 * MFA_ENCRYPTION_KEY; o modo vem em MFA_E2E_MODE (enroll | required | off).
 *   enroll   : cadastro, login com código, replay, código de recuperação
 *   required : sem 2º fator só alcança o cadastro
 *   off      : conta com MFA ativo entra só com a senha (alavanca de emergência)
 * Exige DATABASE_URL de um banco LOCAL de teste (cria uma planta e um super admin descartáveis).
 */
const MODO = process.env.MFA_E2E_MODE ?? 'enroll'
const SENHA = 'Mfa-E2E-2026x'
const sufixo = Math.random().toString(36).slice(2, 8)
const EMAIL = `e2e-mfa-${MODO}-${sufixo}@teste.local`
// `pg` só existe no ambiente de teste com Postgres; carregado em tempo de execução para não exigir a dependência no projeto
interface Conexao { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ id: string }> }>; end: () => Promise<void> }
let pool: Conexao

test.beforeAll(async () => {
  const nome = 'pg'
  const mod = (await import(nome)) as { Pool?: new (o: object) => Conexao; default?: { Pool: new (o: object) => Conexao } }
  const Pool = (mod.Pool ?? mod.default!.Pool)
  pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const host = new URL(process.env.DATABASE_URL ?? 'postgresql://x@invalido/x').hostname
  if (!['localhost', '127.0.0.1', '::1'].includes(host)) throw new Error('Recusado: este teste só roda contra banco local.')
  const slug = `e2e-plat-${sufixo}`
  const t = await pool.query(
    `insert into tenants (id, name, slug, is_active, created_at) values ($1,$2,$3,true,now()) returning id`,
    [`t${sufixo}`, `Plataforma E2E ${sufixo}`, slug],
  )
  await pool.query(
    `insert into users (id, tenant_id, email, password_hash, name, role, must_change_password, is_active, created_at, updated_at) values ($1,$2,$3,$4,'Super E2E','SUPER_ADMIN',false,true,now(),now())`,
    [`u${sufixo}`, t.rows[0].id, EMAIL, await bcrypt.hash(SENHA, 4)],
  )
})
test.afterAll(async () => { await pool.end() })

async function entrar(page: Page, opts: { senha?: string; codigo?: string } = {}) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.fill('input[name="email"]', EMAIL)
  await page.fill('input[name="password"]', opts.senha ?? SENHA)
  await page.click('button[type="submit"]')
  if (opts.codigo !== undefined) {
    await page.waitForSelector('input[name="totp"]')
    await page.fill('input[name="totp"]', opts.codigo)
    await page.click('button[type="submit"]')
  }
}

let segredo = ''
let codigos: string[] = []

if (MODO === 'enroll') {
  test.describe.serial('MFA_ENFORCE=enroll', () => {
    test('sem TOTP cadastrado entra normalmente e vê o aviso', async ({ page }) => {
      await entrar(page)
      await page.waitForURL(/\/admin\//)
      await expect(page.getByText(/ainda não tem o segundo fator/i)).toBeVisible()
    })

    test('cadastro: senha errada é recusada; certa mostra o QR; código errado é recusado; certo mostra 8 códigos', async ({ page }) => {
      await entrar(page)
      await page.waitForURL(/\/admin\//)
      await page.goto('/mfa/cadastro')
      await page.fill('input[name="password"]', 'senha-errada')
      await page.getByRole('button', { name: /continuar/i }).click()
      await expect(page.getByText('Senha incorreta.')).toBeVisible()
      await page.fill('input[name="password"]', SENHA)
      await page.getByRole('button', { name: /continuar/i }).click()
      await expect(page.getByAltText(/QR code/i)).toBeVisible()
      segredo = (await page.getByTestId('mfa-secret').innerText()).trim()
      expect(segredo).toMatch(/^[A-Z2-7]{32}$/)
      await page.fill('input[name="code"]', '000000')
      await page.getByRole('button', { name: /ativar segundo fator/i }).click()
      await expect(page.getByText(/código incorreto/i)).toBeVisible()
      await page.fill('input[name="code"]', totpAt(segredo, Date.now()))
      await page.getByRole('button', { name: /ativar segundo fator/i }).click()
      const bloco = page.getByTestId('recovery-codes')
      await expect(bloco).toBeVisible()
      codigos = (await bloco.innerText()).trim().split('\n').map((s) => s.trim())
      expect(codigos).toHaveLength(8)
    })

    test('depois de ativar, o login passa a pedir o código', async ({ page }) => {
      await entrar(page)
      await expect(page.locator('input[name="totp"]')).toBeVisible()
      await expect(page).toHaveURL(/\/login/)
    })

    test('código errado é recusado com mensagem clara; código certo (passo seguinte) entra', async ({ page }) => {
      await entrar(page, { codigo: '123456' })
      await expect(page.getByText(/código inválido/i)).toBeVisible()
      await expect(page).toHaveURL(/\/login/)
      await entrar(page, { codigo: totpAt(segredo, Date.now() + 30_000) })
      await page.waitForURL(/\/admin\//)
    })

    test('replay: o mesmo código não entra duas vezes', async ({ page }) => {
      // zera o último passo aceito só para o teste não depender de quantos segundos se passaram desde o cadastro
      await pool.query(`update user_mfa set last_step = 0 where user_id = $1`, [`u${sufixo}`])
      const cod = totpAt(segredo, Date.now())
      await entrar(page, { codigo: cod })
      await page.waitForURL(/\/admin\//)
      await entrar(page, { codigo: cod })
      await expect(page.getByText(/código inválido/i)).toBeVisible()
      await expect(page).toHaveURL(/\/login/)
    })

    test('código de recuperação entra uma vez e só uma', async ({ page }) => {
      await entrar(page, { codigo: codigos[0] })
      await page.waitForURL(/\/admin\//)
      await entrar(page, { codigo: codigos[0] })
      await expect(page.getByText(/código inválido/i)).toBeVisible()
    })

    test('senha errada continua dando a mensagem genérica (sem pedir o código)', async ({ page }) => {
      await entrar(page, { senha: 'outra-senha-qualquer' })
      await expect(page.getByText(/e-mail ou senha incorretos/i)).toBeVisible()
      await expect(page.locator('input[name="totp"]')).toHaveCount(0)
    })

    test('o cartão de Segurança mostra o estado', async ({ page }) => {
      await entrar(page, { codigo: codigos[1] })
      await page.waitForURL(/\/admin\//)
      await page.goto('/admin/seguranca')
      await expect(page.getByTestId('cartao-mfa')).toContainText('Ativo')
      await expect(page.getByTestId('cartao-mfa')).toContainText('enroll')
    })
  })
}

if (MODO === 'required') {
  test.describe.serial('MFA_ENFORCE=required', () => {
    test('sem 2º fator, qualquer tela do painel leva ao cadastro; o cadastro abre', async ({ page }) => {
      await entrar(page)
      await page.waitForURL(/\/mfa\/cadastro/)
      for (const rota of ['/admin/plantas', '/admin/auditoria', '/admin/seguranca']) {
        await page.goto(rota)
        await expect(page).toHaveURL(/\/mfa\/cadastro/)
      }
      await expect(page.getByRole('heading', { name: /segundo fator/i }).first()).toBeVisible()
    })

    test('cadastra e, na próxima entrada, só com o código chega ao painel', async ({ page }) => {
      await entrar(page)
      await page.waitForURL(/\/mfa\/cadastro/)
      await page.fill('input[name="password"]', SENHA)
      await page.getByRole('button', { name: /continuar/i }).click()
      segredo = (await page.getByTestId('mfa-secret').innerText()).trim()
      await page.fill('input[name="code"]', totpAt(segredo, Date.now()))
      await page.getByRole('button', { name: /ativar segundo fator/i }).click()
      await expect(page.getByTestId('recovery-codes')).toBeVisible()
      await entrar(page, { codigo: totpAt(segredo, Date.now() + 30_000) })
      await page.waitForURL(/\/admin\/plantas/)
    })

    test('com a sessão completa, o painel abre e as telas dos clientes continuam negadas', async ({ page }) => {
      await pool.query(`update user_mfa set last_step = 0 where user_id = $1`, [`u${sufixo}`])
      await entrar(page, { codigo: totpAt(segredo, Date.now()) })
      await page.waitForURL(/\/admin\/plantas/)
      await page.goto('/gestor/dashboard')
      await expect(page).toHaveURL(/\/acesso-negado/)
    })
  })
}

if (MODO === 'off') {
  test.describe.serial('MFA_ENFORCE=off (alavanca de emergência)', () => {
    test('conta com 2º fator ativo no banco entra só com a senha e o painel não pede nada', async ({ page }) => {
      await pool.query(
        `insert into user_mfa (user_id, secret_enc, key_version, enabled_at, last_step, created_at, updated_at) values ($1,'v1.x.y.z',1,now(),0,now(),now())`,
        [`u${sufixo}`],
      )
      await entrar(page)
      await page.waitForURL(/\/admin\//)
      await expect(page.getByText(/ainda não tem o segundo fator/i)).toHaveCount(0)
    })
  })
}
