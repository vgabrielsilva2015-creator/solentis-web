import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// T-15 — fila offline de leituras (IndexedDB + client_id idempotente).
// Substitui o E2E da T-01 (que testava o envio offline BLOQUEADO).

const OPERADOR = { email: process.env.E2E_OPERADOR_EMAIL ?? 'operador@solentis.local', pass: process.env.E2E_OPERADOR_SENHA ?? 'Operador@123' };
const TECNICO = { email: process.env.E2E_TECNICO_EMAIL ?? 'tecnico@solentis.local', pass: process.env.E2E_TECNICO_SENHA ?? 'Tecnico@123' };
const LEGACY_QUEUE_KEY = 'solentis_offline_leituras';

async function login(page: Page, u = OPERADOR) {
  await page.goto('/login');
  await page.fill('input[name="email"]', u.email);
  await page.fill('input[name="password"]', u.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
}

// clique via DOM: no celular o botão pode ficar sob a barra inferior (B-05, T-18)
async function enviarLeitura(page: Page) {
  await page.getByRole('button', { name: /registrar leitura/i }).evaluate((b) => (b as HTMLButtonElement).click());
}

async function preencherLeitura(page: Page, nota: string) {
  await page.goto('/operador/leituras/novo');
  await page.locator('form:has(input[name="collection_point_id"]) button[type="button"]').first().click();
  await page.getByRole('button', { name: /pH/i }).first().click();
  await page.fill('input[name="value"]', '7.1');
  await page.fill('textarea[name="notes"]', nota);
}

async function fila(page: Page) {
  return page.evaluate(() => new Promise<Array<{ client_id: string; owner: string | null; status: string; attempts: number; fields: Record<string, string> }>>((resolve) => {
    const req = indexedDB.open('solentis', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('leituras_pendentes', { keyPath: 'client_id' });
    req.onsuccess = () => {
      const g = req.result.transaction('leituras_pendentes', 'readonly').objectStore('leituras_pendentes').getAll();
      g.onsuccess = () => { resolve(g.result); req.result.close(); };
    };
  }));
}

async function quantasNoHistorico(page: Page, nota: string) {
  await page.goto('/operador/leituras/historico');
  return page.getByText(nota).count();
}

async function esperarFilaVazia(page: Page, ctx: BrowserContext) {
  // a sincronização dispara refresh da rota (revalidatePath); tolera navegação no meio
  await expect.poll(async () => { try { return (await fila(page)).length } catch { return -1 } }, { timeout: 20000 }).toBe(0);
  void ctx;
}

test.describe.serial('T-15 - fila offline de leituras', () => {
  test('sem conexão: guarda no aparelho e envia sozinha quando a internet volta (uma vez só)', async ({ page, context }) => {
    const dialogs: string[] = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });
    await login(page);
    const nota = `t15-offline-${Date.now()}`;
    await preencherLeitura(page, nota);

    await context.setOffline(true);
    await enviarLeitura(page);
    await expect(page.getByTestId('leitura-guardada')).toBeVisible();
    expect(dialogs).toEqual([]);
    const itens = await fila(page);
    expect(itens).toHaveLength(1);
    expect(itens[0]).toMatchObject({ status: 'pendente', fields: { notes: nota } });
    expect(itens[0].owner).toBeTruthy();
    await expect(page.locator('input[name="value"]')).toHaveValue(''); // pronto para a próxima

    await context.setOffline(false); // evento 'online' → sincroniza
    await esperarFilaVazia(page, context);
    expect(await quantasNoHistorico(page, nota)).toBe(1);
  });

  test('resposta perdida no meio do envio: reenvio não duplica', async ({ page, context }) => {
    await login(page);
    const nota = `t15-resposta-perdida-${Date.now()}`;
    await preencherLeitura(page, nota);
    // o servidor grava, mas o aparelho não recebe a resposta
    await page.route('**/operador/leituras/novo', async (route) => {
      if (route.request().method() === 'POST') { await route.fetch(); await route.abort('failed'); }
      else await route.continue();
    }, { times: 1 });
    await enviarLeitura(page);
    await expect(page.getByTestId('leitura-guardada')).toBeVisible();
    expect(await fila(page)).toHaveLength(1);

    await page.goto('/operador/leituras/pendentes'); // a sincronização roda ao abrir
    await esperarFilaVazia(page, context);
    expect(await quantasNoHistorico(page, nota)).toBe(1);
  });

  test('recusada pelo servidor: fica guardada com o motivo, não some', async ({ page }) => {
    await login(page);
    await page.goto('/operador/leituras/pendentes');
    const userId = await page.evaluate(async () => (await (await fetch('/api/auth/session')).json()).user.id as string);
    await page.evaluate((owner) => new Promise<void>((resolve) => {
      const req = indexedDB.open('solentis', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('leituras_pendentes', { keyPath: 'client_id' });
      req.onsuccess = () => {
        const t = req.result.transaction('leituras_pendentes', 'readwrite');
        t.objectStore('leituras_pendentes').put({ client_id: 'e2e-recusa-0001', owner, fields: { collection_point_id: 'nao-existe', value: '7', recorded_at: '2026-10-07T08:00' }, created_at: Date.now(), attempts: 0, next_try_at: 0, status: 'pendente' });
        t.oncomplete = () => { req.result.close(); resolve(); };
      };
    }), userId);
    await page.reload();
    await page.getByRole('button', { name: /enviar agora/i }).click();
    await expect(page.getByText(/recusada/i).first()).toBeVisible();
    await expect(page.getByText(/ponto de coleta inválido/i)).toBeVisible();
    expect((await fila(page)).find((i) => i.client_id === 'e2e-recusa-0001')?.status).toBe('recusada');
    page.once('dialog', (d) => d.accept());
    await page.getByRole('button', { name: /descartar/i }).first().click();
    await expect.poll(async () => (await fila(page)).length).toBe(0);
  });

  test('fila antiga (versão anterior): migrada sem perder, enviada só com confirmação do autor', async ({ page, context }) => {
    await login(page);
    await page.goto('/operador/leituras/novo');
    await page.locator('form:has(input[name="collection_point_id"]) button[type="button"]').first().click();
    const cp = await page.locator('input[name="collection_point_id"]').first().inputValue();
    const nota = `t15-legado-${Date.now()}`;
    // horário atual: o histórico é paginado pela data da leitura (mais recentes primeiro)
    const recente = await page.evaluate(() => { const d = new Date(Date.now() + 60e3); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; });
    const antiga = [{ collection_point_id: cp, parameter_id: '', value: '', unit: '', notes: nota, recorded_at: recente }];
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [LEGACY_QUEUE_KEY, JSON.stringify(antiga)] as const);

    await page.goto('/operador/leituras/pendentes'); // OfflineSync migra ao montar
    await expect.poll(() => page.evaluate((k) => localStorage.getItem(k), LEGACY_QUEUE_KEY)).toBeNull();
    await expect(page.getByText(/leituras antigas sem autor/i)).toBeVisible();
    expect(await quantasNoHistorico(page, nota)).toBe(0); // não enviou sozinho

    await page.goto('/operador/leituras/pendentes');
    await page.getByRole('button', { name: /fui eu, enviar/i }).click();
    await page.getByRole('button', { name: /enviar agora/i }).click({ timeout: 5000 }).catch(() => {});
    await esperarFilaVazia(page, context);
    expect(await quantasNoHistorico(page, nota)).toBe(1);
  });

  test('tablet compartilhado: leitura guardada por um usuário não é enviada por outro, e o "Sair" não apaga a fila', async ({ page, context }) => {
    await login(page);
    const nota = `t15-compartilhado-${Date.now()}`;
    await preencherLeitura(page, nota);
    await context.setOffline(true);
    await enviarLeitura(page);
    await expect(page.getByTestId('leitura-guardada')).toBeVisible();
    // o dono sai antes de a leitura sincronizar: bloqueia só o envio da leitura
    await page.route('**/operador/**', (r) => (r.request().method() === 'POST' && (r.request().postDataBuffer()?.toString('latin1') ?? '').includes('client_id')) ? r.abort() : r.continue());
    await context.setOffline(false);
    // espera a tentativa automática (bloqueada) terminar antes de sair
    await expect.poll(async () => { try { return (await fila(page))[0]?.attempts ?? 0 } catch { return 0 } }, { timeout: 15000 }).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Sair' }).click();
    await page.waitForURL('**/login');
    await page.unroute('**/operador/**');
    expect(await fila(page)).toHaveLength(1);

    await login(page, TECNICO);
    await page.goto('/operador/leituras/pendentes');
    await expect(page.getByText(/de outro usuário/i)).toBeVisible();
    await page.waitForTimeout(2000);
    expect(await fila(page)).toHaveLength(1);
    expect(await quantasNoHistorico(page, nota)).toBe(0);

    await page.getByRole('button', { name: 'Sair' }).click();
    await page.waitForURL('**/login');
    await login(page); // o dono volta → envia (ignorando a espera entre tentativas)
    await page.goto('/operador/leituras/pendentes');
    await page.getByRole('button', { name: /enviar agora/i }).click({ timeout: 5000 }).catch(() => {});
    await esperarFilaVazia(page, context);
    expect(await quantasNoHistorico(page, nota)).toBe(1);
  });

  test('indicador offline e telas do operador continuam funcionando', async ({ page, context }) => {
    await login(page);
    for (const rota of ['/operador/turnos', '/operador/dashboard', '/operador/leituras', '/operador/leituras/novo', '/operador/leituras/pendentes', '/operador/ocorrencias', '/operador/estoque']) {
      const resp = await page.goto(rota);
      expect(resp?.status(), rota).toBe(200);
      await expect(page.getByText(/algo deu errado|application error/i)).toHaveCount(0);
    }
    await context.setOffline(true);
    await expect(page.getByText(/sem conexão/i).first()).toBeVisible();
    await context.setOffline(false);
  });
});
