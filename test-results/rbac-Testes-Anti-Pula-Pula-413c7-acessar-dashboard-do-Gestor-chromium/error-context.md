# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: rbac.spec.ts >> Testes Anti Pula-Pula (Segregação de Perfis) >> Operador NÃO pode acessar dashboard do Gestor
- Location: tests\rbac.spec.ts:10:7

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*\/operador\/dashboard/
Received string:  "http://localhost:3000/login"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    13 × unexpected value "http://localhost:3000/login"

```

```yaml
- main:
  - img
  - text: solentis
  - heading "Conformidade ambiental em tempo real." [level=1]
  - paragraph: Plataforma de monitoramento avançado para estações de tratamento de efluentes.
  - text: LGPD compliant ISO 27001 Padrão CONAMA © 2026 Solentis ·
  - link "Termos":
    - /url: "#"
  - text: ·
  - link "Privacidade":
    - /url: "#"
  - heading "Entrar" [level=1]
  - text: Email
  - textbox "Email":
    - /placeholder: voce@empresa.com.br
  - text: Senha
  - textbox "Senha":
    - /placeholder: Sua senha de acesso
  - button
  - checkbox "Manter conectado"
  - text: Manter conectado
  - paragraph: E-mail ou senha incorretos.
  - button "Entrar"
  - link "Esqueci minha senha":
    - /url: /forgot
  - link "Não tem conta? Solicitar acesso":
    - /url: /signup
    - text: Não tem conta?
    - strong: Solicitar acesso
- alert
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | // Este teste verifica o RBAC (Role-Based Access Control)
  4  | // simulando uma tentativa de "pula-pula" entre perfis.
  5  | 
  6  | test.describe('Testes Anti Pula-Pula (Segregação de Perfis)', () => {
  7  |   // Configurando o usuário logado via cookie ou forçando o login
  8  |   // Como temos credenciais de seed no banco, podemos usar o operador:
  9  | 
  10 |   test('Operador NÃO pode acessar dashboard do Gestor', async ({ page }) => {
  11 |     // 1. Ir para a tela de login
  12 |     await page.goto('/login');
  13 |     
  14 |     // 2. Fazer login como operador
  15 |     await page.fill('input[type="email"]', 'operador@solentis.local');
  16 |     await page.fill('input[type="password"]', 'senha123');
  17 |     await page.click('button[type="submit"]');
  18 | 
  19 |     // 3. Garantir que foi direcionado para o dashboard dele
> 20 |     await expect(page).toHaveURL(/.*\/operador\/dashboard/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  21 | 
  22 |     // 4. A TENTATIVA DE INVASÃO: Forçar a URL do gestor pela barra de endereços
  23 |     await page.goto('/gestor/dashboard');
  24 | 
  25 |     // 5. A VALIDAÇÃO: O sistema DEVE redirecionar para acesso-negado
  26 |     await expect(page).toHaveURL(/.*\/acesso-negado/);
  27 |     await expect(page.locator('h1')).toContainText('Acesso Negado');
  28 |   });
  29 | 
  30 |   test('Técnico NÃO pode acessar dashboard do Operador', async ({ page }) => {
  31 |     await page.goto('/login');
  32 |     
  33 |     await page.fill('input[type="email"]', 'tecnico@solentis.local');
  34 |     await page.fill('input[type="password"]', 'senha123');
  35 |     await page.click('button[type="submit"]');
  36 | 
  37 |     await expect(page).toHaveURL(/.*\/tecnico\/dashboard/);
  38 | 
  39 |     // Tentativa
  40 |     await page.goto('/operador/dashboard');
  41 | 
  42 |     // Validação
  43 |     await expect(page).toHaveURL(/.*\/acesso-negado/);
  44 |   });
  45 | });
  46 | 
```