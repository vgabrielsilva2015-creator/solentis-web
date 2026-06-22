# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a2-permissions.spec.ts >> A2 - Permissões e Segurança >> Rota inexistente (xpto) mostra erro 404 customizado
- Location: tests\a2-permissions.spec.ts:37:7

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 404
Received: 200
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e6]:
        - generic:
          - img
        - generic [ref=e7]:
          - generic [ref=e15]: solentis
          - heading "Conformidade ambiental em tempo real." [level=1] [ref=e16]
          - paragraph [ref=e17]: Plataforma de monitoramento avançado para estações de tratamento de efluentes.
        - generic [ref=e18]:
          - generic [ref=e19]:
            - generic [ref=e20]:
              - img [ref=e21]
              - text: LGPD compliant
            - generic [ref=e24]:
              - img [ref=e25]
              - text: ISO 27001
            - generic [ref=e28]:
              - img [ref=e29]
              - text: Padrão CONAMA
          - generic [ref=e32]:
            - generic [ref=e33]: © 2026 Solentis
            - generic [ref=e34]: ·
            - link "Termos" [ref=e35] [cursor=pointer]:
              - /url: "#"
            - generic [ref=e36]: ·
            - link "Privacidade" [ref=e37] [cursor=pointer]:
              - /url: "#"
      - generic [ref=e39]:
        - heading "Entrar" [level=1] [ref=e42]
        - generic [ref=e44]:
          - generic [ref=e45]:
            - generic [ref=e46]: Email
            - textbox "Email" [ref=e47]:
              - /placeholder: voce@empresa.com.br
          - generic [ref=e48]:
            - generic [ref=e49]: Senha
            - generic [ref=e50]:
              - textbox "Senha" [ref=e51]:
                - /placeholder: Sua senha de acesso
              - button [ref=e52]:
                - img [ref=e53]
          - generic [ref=e56]:
            - checkbox "Manter conectado" [ref=e57]
            - generic [ref=e58]: Manter conectado
          - button "Entrar" [ref=e59]:
            - text: Entrar
            - img [ref=e60]
        - generic [ref=e62]:
          - link "Esqueci minha senha" [ref=e64] [cursor=pointer]:
            - /url: /forgot
          - link "Não tem conta? Solicitar acesso" [ref=e67] [cursor=pointer]:
            - /url: /signup
            - text: Não tem conta?
            - strong [ref=e68]: Solicitar acesso
  - alert [ref=e69]
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const USERS = {
  4  |   operador: { email: 'operador@solentis.local', pass: 'Operador@123' },
  5  |   tecnico: { email: 'tecnico@solentis.local', pass: 'Tecnico@123' },
  6  | };
  7  | 
  8  | async function login(page: any, user: { email: string; pass: string }) {
  9  |   await page.goto('/login');
  10 |   await page.fill('input[name="email"]', user.email);
  11 |   await page.fill('input[name="password"]', user.pass);
  12 |   await page.click('button[type="submit"]');
  13 |   await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {});
  14 | }
  15 | 
  16 | test.describe('A2 - Permissões e Segurança', () => {
  17 |   test('Operador não deve acessar rotas de gestor', async ({ page }) => {
  18 |     await login(page, USERS.operador);
  19 |     await page.goto('/gestor/dashboard');
  20 |     // Deve redirecionar para acesso negado ou NotFound, ou barrar
  21 |     const content = await page.textContent('body');
  22 |     expect(content).toContain('Acesso Restrito'); // Ou a mensagem do acesso negado
  23 |   });
  24 | 
  25 |   test('Técnico não deve acessar rotas de admin', async ({ page }) => {
  26 |     await login(page, USERS.tecnico);
  27 |     await page.goto('/admin/plantas');
  28 |     const content = await page.textContent('body');
  29 |     expect(content).toContain('Acesso Restrito');
  30 |   });
  31 | 
  32 |   test('Usuário deslogado redirecionado para o login', async ({ page }) => {
  33 |     await page.goto('/gestor/dashboard');
  34 |     expect(page.url()).toContain('/login');
  35 |   });
  36 | 
  37 |   test('Rota inexistente (xpto) mostra erro 404 customizado', async ({ page }) => {
  38 |     const response = await page.goto('/xpto');
> 39 |     expect(response?.status()).toBe(404);
     |                                ^ Error: expect(received).toBe(expected) // Object.is equality
  40 |     const content = await page.textContent('body');
  41 |     expect(content).toContain('Página não encontrada');
  42 |   });
  43 | });
  44 | 
```