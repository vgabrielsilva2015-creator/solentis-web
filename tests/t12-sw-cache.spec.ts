import { test, expect, type Page } from '@playwright/test';

// T-12 — com o service worker real ativo, telas autenticadas não vão para o
// Cache Storage, e o "Sair" limpa caches e rascunhos (mantendo a fila offline antiga).
const EMAIL = process.env.E2E_OPERADOR_EMAIL ?? 'operador@solentis.local';
const SENHA = process.env.E2E_OPERADOR_SENHA ?? 'Operador@123';

async function cacheUrls(page: Page) {
  return page.evaluate(async () => {
    const out: string[] = [];
    for (const name of await caches.keys()) {
      const c = await caches.open(name);
      for (const r of await c.keys()) out.push(`${name} ${new URL(r.url).pathname}`);
    }
    return out;
  });
}

test('telas autenticadas fora do cache e logout limpa o aparelho', async ({ page }) => {
  await page.goto('/login');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); // página controlada pelo SW
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);

  await page.fill('input[name="email"]', EMAIL);
  await page.fill('input[name="password"]', SENHA);
  await page.click('button[type="submit"]');
  await page.waitForURL((u) => u.pathname.startsWith('/operador'));

  // navegação client-side (gera requisições RSC e prefetch)
  for (const href of ['/operador/leituras', '/operador/estoque', '/operador/ocorrencias', '/operador/turnos']) {
    const link = page.locator(`a[href="${href}"]:visible`).first();
    if (await link.count()) { await link.click(); await page.waitForURL((u) => u.pathname === href); }
    else await page.goto(href);
  }
  await page.waitForTimeout(1500);

  const urls = await cacheUrls(page);
  const vazou = urls.filter((u) => /\s\/(operador|tecnico|gestor|manutencao|admin|api)(\/|$)/.test(u) || /^pages|^others|^apis/.test(u));
  expect(vazou, `cache com dado de usuário:\n${vazou.join('\n')}`).toEqual([]);
  expect(urls.some((u) => u.includes('/_next/static/'))).toBe(true); // o cache de build funciona

  // rascunho + fila antiga, como um operador deixaria no tablet
  await page.evaluate(() => {
    localStorage.setItem('reading_draft', '{"value":"7,2"}');
    localStorage.setItem('solentis_offline_leituras', '[{"x":1}]');
  });

  await page.getByRole('button', { name: 'Sair' }).click();
  await page.waitForURL((u) => u.pathname.startsWith('/login'));

  const depois = await page.evaluate(async () => ({
    caches: await caches.keys(),
    draft: localStorage.getItem('reading_draft'),
    fila: localStorage.getItem('solentis_offline_leituras'),
  }));
  // depois do logout só podem existir caches de build/estáticos recriados pela tela de login
  expect(depois.caches.filter((n) => !/^solentis-(build|static)$|precache/.test(n))).toEqual([]);
  expect(depois.draft).toBeNull();
  expect(depois.fila).toBe('[{"x":1}]');
});
