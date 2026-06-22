import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const USERS = {
  operador: { email: 'operador@solentis.local', pass: 'Operador@123' },
  tecnico: { email: 'tecnico@solentis.local', pass: 'Tecnico@123' },
  gestor: { email: 'admin@solentis.local', pass: 'Admin@123' }, // admin acts as manager and admin
};

async function login(page: any, user: { email: string; pass: string }) {
  await page.goto('/login');
  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.pass);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
}

test.describe('A1 - Cobertura de Rotas e Navegação', () => {
  let occurrenceId: string;
  let equipmentId: string;
  let categoryId: string;

  test.beforeAll(async () => {
    // Get valid IDs for dynamic routes
    const occurrence = await prisma.occurrence.findFirst();
    occurrenceId = occurrence?.id || 'mock-id';

    const equipment = await prisma.equipment.findFirst();
    equipmentId = equipment?.id || 'mock-id';

    const category = await prisma.equipmentCategory.findFirst();
    categoryId = category?.id || 'mock-id';
  });

  test('Operador routes should load without 404', async ({ page }) => {
    await login(page, USERS.operador);
    
    const routes = [
      '/operador/dashboard',
      '/operador/leituras',
      '/operador/leituras/nova',
      '/operador/ocorrencias',
      '/operador/ocorrencias/nova',
      `/operador/ocorrencias/${occurrenceId}`,
      '/operador/turnos',
      '/operador/turnos/abrir',
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).not.toBe(404);
      // Wait a bit to ensure it renders
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Técnico routes should load without 404', async ({ page }) => {
    await login(page, USERS.tecnico);
    
    const routes = [
      '/tecnico/dashboard',
      '/tecnico/analises',
      '/tecnico/analises/nova',
      '/tecnico/analises/historico',
      '/tecnico/equipamentos',
      '/tecnico/equipamentos/novo',
      `/tecnico/equipamentos/${equipmentId}`,
      '/tecnico/ocorrencias',
      '/tecnico/ocorrencias/nova',
      `/tecnico/ocorrencias/${occurrenceId}`,
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).not.toBe(404);
      await expect(page.locator('body')).toBeVisible();
    }
  });

  test('Gestor routes should load without 404', async ({ page }) => {
    await login(page, USERS.gestor);
    
    const routes = [
      '/gestor/dashboard',
      '/gestor/analises',
      '/gestor/analises-internas',
      '/gestor/categorias',
      '/gestor/categorias/novo',
      `/gestor/categorias/${categoryId}`,
      '/gestor/auditoria',
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      expect(response?.status()).not.toBe(404);
      await expect(page.locator('body')).toBeVisible();
    }
  });
});
