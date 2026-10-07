import { test, expect } from '@playwright/test';

// "Sair" confiável: uma requisição que estava em andamento no momento do logout
// devolve um cookie de sessão renovado DEPOIS do logout. Antes da correção esse
// cookie atrasado ressuscitava a sessão (intermitente no E2E da T-15).
const OPERADOR = { email: process.env.E2E_OPERADOR_EMAIL ?? 'operador@solentis.local', pass: process.env.E2E_OPERADOR_SENHA ?? 'Operador@123' };

test('resposta atrasada depois do "Sair" não ressuscita a sessão', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', OPERADOR.email);
  await page.fill('input[name="password"]', OPERADOR.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname.startsWith('/operador'));

  // segura a resposta de uma requisição de fundo até depois do logout
  let liberar!: () => void;
  const segurar = new Promise<void>((r) => { liberar = r; });
  await page.route('**/operador/estoque?atrasada=1', async (route) => {
    const resp = await route.fetch(); // o servidor já respondeu (com cookie renovado)
    await segurar;
    await route.fulfill({ response: resp });
  });
  const atrasada = page.evaluate(() => fetch('/operador/estoque?atrasada=1', { credentials: 'include' }).then((r) => r.status));
  await page.waitForTimeout(500);

  await page.getByRole('button', { name: 'Sair' }).click();
  await page.waitForURL('**/login');

  liberar();
  await atrasada; // o cookie renovado da resposta atrasada chega agora

  const resp = await page.goto('/operador/turnos');
  expect(new URL(page.url()).pathname, `status ${resp?.status()}`).toBe('/login');
});
