import { test, expect, devices, type Page } from '@playwright/test';

// T-18 — bugs de tela do fluxo do operador.
// B-05: no celular, o botão "Registrar leitura" ficava atrás da barra inferior.
// B-12: duas setas de voltar na tela Nova leitura.
const OPERADOR = { email: process.env.E2E_OPERADOR_EMAIL ?? 'operador@solentis.local', pass: process.env.E2E_OPERADOR_SENHA ?? 'Operador@123' };

// Pixel 7, o aparelho da captura da auditoria (412 x 915 CSS px).
test.use({ ...devices['Pixel 7'], browserName: 'chromium' });

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', OPERADOR.email);
  await page.fill('input[name="password"]', OPERADOR.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname.startsWith('/operador'));
}

/** O botão está visível e é ele que recebe o toque no centro (nada por cima). */
async function botaoTocavel(page: Page, nome: RegExp) {
  const botao = page.getByRole('button', { name: nome });
  await botao.scrollIntoViewIfNeeded();
  // rola até o fim: é onde o operador vai tocar depois de preencher
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(200);
  return botao.evaluate((b) => {
    const r = b.getBoundingClientRect();
    const nav = document.querySelector('nav[aria-label="Navegação principal"]')?.getBoundingClientRect();
    const alvo = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return {
      noTopo: alvo === b || b.contains(alvo),
      sobreposicao: nav ? Math.max(0, r.bottom - nav.top) : 0,
      dentroDaTela: r.bottom <= window.innerHeight,
    };
  });
}

test('B-05: "Registrar leitura" não fica atrás da barra inferior no celular', async ({ page }) => {
  await login(page);
  await page.goto('/operador/leituras/novo');
  const r = await botaoTocavel(page, /registrar leitura/i);
  expect(r.sobreposicao, 'pixels do botão cobertos pela barra').toBe(0);
  expect(r.noTopo, 'o toque no centro do botão chega ao botão').toBe(true);
  expect(r.dentroDaTela).toBe(true);
});

test('B-12: Nova leitura tem uma única seta de voltar', async ({ page }) => {
  await login(page);
  await page.goto('/operador/leituras/novo');
  await expect(page.getByRole('heading', { name: /nova leitura/i })).toBeVisible();
  // a barra inferior também tem link para /operador/leituras; contamos só o conteúdo
  await expect(page.locator('main a[href="/operador/leituras"]')).toHaveCount(1);
  await expect(page.getByText(/voltar para leituras/i)).toHaveCount(0);
});
