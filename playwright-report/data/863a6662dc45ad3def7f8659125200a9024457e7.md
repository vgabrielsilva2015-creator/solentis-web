# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a5-mobile-edge.spec.ts >> A5 - Mobile & Borda >> Operador mobile: BottomNav deve estar visível, sidebar oculta
- Location: tests\a5-mobile-edge.spec.ts:18:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('nav.fixed.bottom-0')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('nav.fixed.bottom-0')

```

```yaml
- main:
  - heading "Algo deu errado" [level=1]
  - paragraph: Um erro inesperado ocorreu. Nossa equipe já foi notificada.
  - button "Tentar novamente"
  - link "Voltar ao início":
    - /url: /
- alert
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
  15 | test.describe('A5 - Mobile & Borda', () => {
  16 |   test.use({ viewport: { width: 360, height: 800 } });
  17 | 
  18 |   test('Operador mobile: BottomNav deve estar visível, sidebar oculta', async ({ page }) => {
  19 |     await login(page, USERS.operador);
  20 |     await page.goto('/operador/turnos');
  21 | 
  22 |     // Sidebar oculta (assumindo que seja via md:hidden ou lg:hidden)
  23 |     const desktopNav = page.locator('nav.hidden.lg\\:block'); // ajustável conforme o seletor exato
  24 |     if (await desktopNav.count() > 0) {
  25 |       await expect(desktopNav).toBeHidden();
  26 |     }
  27 | 
  28 |     // BottomNav visível
  29 |     const bottomNav = page.locator('nav.fixed.bottom-0');
> 30 |     await expect(bottomNav).toBeVisible();
     |                             ^ Error: expect(locator).toBeVisible() failed
  31 |   });
  32 | });
  33 | 
```