import { test, expect, type Page } from '@playwright/test';

// T-01 — o envio de leitura sem conexão é bloqueado (sem fila local, sem
// sincronização automática). A nova fila offline com IndexedDB + idempotência
// fica para a T-15.

const OPERADOR = { email: 'operador@solentis.local', pass: 'Operador@123' };
const LEGACY_QUEUE_KEY = 'solentis_offline_leituras';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('input[name="email"]', OPERADOR.email);
  await page.fill('input[name="password"]', OPERADOR.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/operador/**', { timeout: 15000 });
}

// Envia o formulário de leitura. O clique é feito via DOM porque, no celular, o
// botão fica sob a barra de navegação inferior (B-05, tratado em outra tarefa) e
// porque o cabeçalho tem outro botão submit ("Sair").
async function enviarLeitura(page: Page) {
  await page.getByRole('button', { name: /registrar leitura/i }).evaluate((b) => (b as HTMLButtonElement).click());
}

async function preencherLeitura(page: Page, nota: string) {
  await page.goto('/operador/leituras/novo');
  // Primeiro ponto de coleta e primeiro parâmetro disponíveis
  const pontos = page.locator('form:has(input[name="collection_point_id"]) button[type="button"]');
  await pontos.first().click();
  await page.getByRole('button', { name: /pH/i }).first().click();
  await page.fill('input[name="value"]', '7.1');
  await page.fill('textarea[name="notes"]', nota);
}

test.describe('T-01 - Leitura sem conexão', () => {
  test('sem conexão: bloqueia o envio, não salva, não cria fila e mantém o rascunho', async ({ page, context }) => {
    const dialogs: string[] = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });

    await login(page);
    const nota = `t01-offline-${Date.now()}`;
    await preencherLeitura(page, nota);

    await context.setOffline(true);
    await enviarLeitura(page);

    // Mensagem clara, sem falsa confirmação
    await expect(page.getByText(/sem conexão/i).first()).toBeVisible();
    await expect(page.getByText(/não foi enviada/i)).toBeVisible();
    expect(dialogs).toEqual([]);
    expect(page.url()).toContain('/operador/leituras/novo');

    // Rascunho continua no formulário
    await expect(page.locator('input[name="value"]')).toHaveValue('7.1');
    await expect(page.locator('textarea[name="notes"]')).toHaveValue(nota);

    // Nenhuma fila local criada
    const fila = await page.evaluate((k) => localStorage.getItem(k), LEGACY_QUEUE_KEY);
    expect(fila).toBeNull();

    // Volta a conexão: a leitura NÃO aparece no histórico (não houve sync falso)
    await context.setOffline(false);
    await page.goto('/operador/leituras/historico');
    await expect(page.getByText(nota)).toHaveCount(0);
  });

  test('com conexão: o mesmo rascunho é enviado normalmente', async ({ page, context }) => {
    await login(page);
    const nota = `t01-online-${Date.now()}`;
    await preencherLeitura(page, nota);

    // Fica offline, tenta, volta online e envia de novo o mesmo formulário
    await context.setOffline(true);
    await enviarLeitura(page);
    await expect(page.getByText(/não foi enviada/i)).toBeVisible();
    await context.setOffline(false);
    await enviarLeitura(page);

    await page.waitForURL('**/operador/leituras', { timeout: 15000 });
    await page.goto('/operador/leituras/historico');
    await expect(page.getByText(nota)).toBeVisible();
  });

  test('fila antiga existente no aparelho não é apagada nem reenviada', async ({ page }) => {
    await login(page);
    const item = [{ collection_point_id: 'x', parameter_id: 'y', value: '1', recorded_at: '2026-01-01T00:00' }];
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [LEGACY_QUEUE_KEY, JSON.stringify(item)] as const);

    // O SyncManager antigo reenviava a fila como FormData com o campo point_id
    const reenvios: string[] = [];
    page.on('request', (r) => { if (r.method() === 'POST' && (r.postData() ?? '').includes('point_id')) reenvios.push(r.url()); });

    for (const rota of ['/operador/turnos', '/operador/leituras', '/operador/ocorrencias']) {
      await page.goto(rota);
      await page.waitForLoadState('networkidle');
    }

    const fila = await page.evaluate((k) => localStorage.getItem(k), LEGACY_QUEUE_KEY);
    expect(fila).toBe(JSON.stringify(item));
    expect(reenvios).toEqual([]);
  });

  test('indicador offline não promete salvamento local', async ({ page, context }) => {
    await login(page);
    await page.goto('/operador/turnos');
    await context.setOffline(true);
    await expect(page.getByText(/sem conexão/i).first()).toBeVisible();
    await expect(page.getByText(/modo de leitura local/i)).toHaveCount(0);
    await context.setOffline(false);
  });

  test('login e telas do operador continuam funcionando', async ({ page }) => {
    await login(page);
    for (const rota of ['/operador/turnos', '/operador/dashboard', '/operador/leituras', '/operador/leituras/novo', '/operador/ocorrencias', '/operador/ocorrencias/novo', '/operador/estoque']) {
      const resp = await page.goto(rota);
      expect(resp?.status(), rota).toBe(200);
      await expect(page.getByText(/algo deu errado|application error/i)).toHaveCount(0);
    }
  });
});
