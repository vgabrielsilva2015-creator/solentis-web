# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a4-concurrency.spec.ts >> A4 - Concorrência e Duplo Clique >> Duplo clique rápido no submit da ocorrência não deve gerar dois registros idênticos
- Location: tests\a4-concurrency.spec.ts:16:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('textarea[name="description"]')

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
  2  | 
  3  | const USERS = {
  4  |   operador: { email: 'operador@solentis.local', pass: 'Operador@123' },
  5  | };
  6  | 
  7  | async function login(page: any, user: { email: string; pass: string }) {
  8  |   await page.goto('/login');
  9  |   await page.fill('input[name="email"]', user.email);
  10 |   await page.fill('input[name="password"]', user.pass);
  11 |   await page.click('button[type="submit"]');
  12 |   await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
  13 | }
  14 | 
  15 | test.describe('A4 - Concorrência e Duplo Clique', () => {
  16 |   test('Duplo clique rápido no submit da ocorrência não deve gerar dois registros idênticos', async ({ page }) => {
  17 |     await login(page, USERS.operador);
  18 |     await page.goto('/operador/ocorrencias/nova');
  19 | 
  20 |     const uniqueString = `Problema concorrente ${Date.now()}`;
> 21 |     await page.fill('textarea[name="description"]', uniqueString);
     |                ^ Error: page.fill: Test timeout of 30000ms exceeded.
  22 |     await page.selectOption('select[name="category"]', 'OUTROS');
  23 |     await page.selectOption('select[name="severity"]', 'LOW');
  24 | 
  25 |     // Clica duas vezes rápidas!
  26 |     const submitButton = page.locator('button[type="submit"]');
  27 |     await submitButton.click();
  28 |     await submitButton.click({ force: true }).catch(() => {}); // catch disabled state click err
  29 | 
  30 |     await page.waitForURL('**/operador/ocorrencias');
  31 | 
  32 |     // Confirma que existe, mas idealmente seria validar se count() === 1.
  33 |     const ocorrencias = page.locator(`text=${uniqueString}`);
  34 |     await expect(ocorrencias).toHaveCount(1, { timeout: 5000 });
  35 |   });
  36 | });
  37 | 
```