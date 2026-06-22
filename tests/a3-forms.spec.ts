import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USERS = {
  operador: { email: 'operador@solentis.local', pass: 'Operador@123' },
};

async function login(page: any, user: { email: string; pass: string }) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
}

test.describe('A3 - Formulários & Dados (CRUD)', () => {
  let collectionPointId: string;

  test.beforeAll(async () => {
    const cp = await prisma.collectionPoint.findFirst();
    collectionPointId = cp?.id || '';
  });

  test('Operador deve conseguir criar uma nova ocorrência (Validação de Sucesso)', async ({ page }) => {
    await login(page, USERS.operador);
    await page.goto('/operador/ocorrencias/nova');

    // Preenche o formulário
    await page.fill('textarea[name="description"]', 'Vazamento no reator 2 - Teste Playwright');
    await page.selectOption('select[name="category"]', 'VAZAMENTO');
    
    if (collectionPointId) {
      await page.selectOption('select[name="collection_point_id"]', collectionPointId);
    }
    
    await page.selectOption('select[name="severity"]', 'HIGH');

    // Submete
    await page.click('button[type="submit"]');

    // Deve ser redirecionado para a lista de ocorrências
    await page.waitForURL('**/operador/ocorrencias');
    
    // Verifica se a ocorrência recém criada aparece na lista (pode demorar a renderizar)
    await expect(page.locator('text=Vazamento no reator 2 - Teste Playwright')).toBeVisible({ timeout: 10000 });
  });

  test('Deve bloquear formulário vazio (Erros de Validação)', async ({ page }) => {
    await login(page, USERS.operador);
    await page.goto('/operador/ocorrencias/nova');
    
    // Tenta submeter sem preencher nada
    await page.click('button[type="submit"]');
    
    // Espera mensagens de erro do Zod (exemplo: 'Categoria é obrigatória')
    // Não vai navegar
    expect(page.url()).toContain('/operador/ocorrencias/nova');
    
    // Verifica se as mensagens vermelhas de erro apareceram
    const errorMessages = page.locator('.text-red-400');
    expect(await errorMessages.count()).toBeGreaterThan(0);
  });
});
