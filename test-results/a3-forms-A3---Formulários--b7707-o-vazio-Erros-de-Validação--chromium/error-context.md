# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a3-forms.spec.ts >> A3 - Formulários & Dados (CRUD) >> Deve bloquear formulário vazio (Erros de Validação)
- Location: tests\a3-forms.spec.ts:50:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button[type="submit"]')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - img [ref=e5]
      - heading "Algo deu errado" [level=1] [ref=e7]
      - paragraph [ref=e8]: Um erro inesperado ocorreu. Nossa equipe já foi notificada.
      - generic [ref=e9]:
        - button "Tentar novamente" [ref=e10]
        - link "Voltar ao início" [ref=e11] [cursor=pointer]:
          - /url: /
  - alert [ref=e12]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { PrismaClient } from '@prisma/client';
  3  | 
  4  | const prisma = new PrismaClient();
  5  | 
  6  | const USERS = {
  7  |   operador: { email: 'operador@solentis.local', pass: 'Operador@123' },
  8  | };
  9  | 
  10 | async function login(page: any, user: { email: string; pass: string }) {
  11 |   await page.goto('/login');
  12 |   await page.fill('input[name="email"]', user.email);
  13 |   await page.fill('input[name="password"]', user.pass);
  14 |   await page.click('button[type="submit"]');
  15 |   await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
  16 | }
  17 | 
  18 | test.describe('A3 - Formulários & Dados (CRUD)', () => {
  19 |   let collectionPointId: string;
  20 | 
  21 |   test.beforeAll(async () => {
  22 |     const cp = await prisma.collectionPoint.findFirst();
  23 |     collectionPointId = cp?.id || '';
  24 |   });
  25 | 
  26 |   test('Operador deve conseguir criar uma nova ocorrência (Validação de Sucesso)', async ({ page }) => {
  27 |     await login(page, USERS.operador);
  28 |     await page.goto('/operador/ocorrencias/nova');
  29 | 
  30 |     // Preenche o formulário
  31 |     await page.fill('textarea[name="description"]', 'Vazamento no reator 2 - Teste Playwright');
  32 |     await page.selectOption('select[name="category"]', 'VAZAMENTO');
  33 |     
  34 |     if (collectionPointId) {
  35 |       await page.selectOption('select[name="collection_point_id"]', collectionPointId);
  36 |     }
  37 |     
  38 |     await page.selectOption('select[name="severity"]', 'HIGH');
  39 | 
  40 |     // Submete
  41 |     await page.click('button[type="submit"]');
  42 | 
  43 |     // Deve ser redirecionado para a lista de ocorrências
  44 |     await page.waitForURL('**/operador/ocorrencias');
  45 |     
  46 |     // Verifica se a ocorrência recém criada aparece na lista (pode demorar a renderizar)
  47 |     await expect(page.locator('text=Vazamento no reator 2 - Teste Playwright')).toBeVisible({ timeout: 10000 });
  48 |   });
  49 | 
  50 |   test('Deve bloquear formulário vazio (Erros de Validação)', async ({ page }) => {
  51 |     await login(page, USERS.operador);
  52 |     await page.goto('/operador/ocorrencias/nova');
  53 |     
  54 |     // Tenta submeter sem preencher nada
> 55 |     await page.click('button[type="submit"]');
     |                ^ Error: page.click: Test timeout of 30000ms exceeded.
  56 |     
  57 |     // Espera mensagens de erro do Zod (exemplo: 'Categoria é obrigatória')
  58 |     // Não vai navegar
  59 |     expect(page.url()).toContain('/operador/ocorrencias/nova');
  60 |     
  61 |     // Verifica se as mensagens vermelhas de erro apareceram
  62 |     const errorMessages = page.locator('.text-red-400');
  63 |     expect(await errorMessages.count()).toBeGreaterThan(0);
  64 |   });
  65 | });
  66 | 
```