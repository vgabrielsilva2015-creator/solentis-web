import { test, expect } from '@playwright/test';

// Este teste verifica o RBAC (Role-Based Access Control)
// simulando uma tentativa de "pula-pula" entre perfis.

test.describe('Testes Anti Pula-Pula (Segregação de Perfis)', () => {
  // Configurando o usuário logado via cookie ou forçando o login
  // Como temos credenciais de seed no banco, podemos usar o operador:

  test('Operador NÃO pode acessar dashboard do Gestor', async ({ page }) => {
    // 1. Ir para a tela de login
    await page.goto('/login');
    
    // 2. Fazer login como operador
    await page.fill('input[type="email"]', 'operador@solentis.local');
    await page.fill('input[type="password"]', 'senha123');
    await page.click('button[type="submit"]');

    // 3. Garantir que foi direcionado para o dashboard dele
    await expect(page).toHaveURL(/.*\/operador\/dashboard/);

    // 4. A TENTATIVA DE INVASÃO: Forçar a URL do gestor pela barra de endereços
    await page.goto('/gestor/dashboard');

    // 5. A VALIDAÇÃO: O sistema DEVE redirecionar para acesso-negado
    await expect(page).toHaveURL(/.*\/acesso-negado/);
    await expect(page.locator('h1')).toContainText('Acesso Negado');
  });

  test('Técnico NÃO pode acessar dashboard do Operador', async ({ page }) => {
    await page.goto('/login');
    
    await page.fill('input[type="email"]', 'tecnico@solentis.local');
    await page.fill('input[type="password"]', 'senha123');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/.*\/tecnico\/dashboard/);

    // Tentativa
    await page.goto('/operador/dashboard');

    // Validação
    await expect(page).toHaveURL(/.*\/acesso-negado/);
  });
});
