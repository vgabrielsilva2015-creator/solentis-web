# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: a2-permissions.spec.ts >> A2 - Permissões e Segurança >> Técnico não deve acessar rotas de admin
- Location: tests\a2-permissions.spec.ts:25:7

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "Acesso Restrito"
Received string:    "403Acesso negadoVocê não tem permissão para esta área.Voltar ao meu painel(self.__next_f=self.__next_f||[]).push([0])self.__next_f.push([1,\"1:\\\"$Sreact.fragment\\\"\\n2:I[72737,[\\\"3146\\\",\\\"static/chunks/3146-a7eb15f9fbb5979b.js\\\",\\\"8767\\\",\\\"static/chunks/8767-b51be67990d0a252.js\\\",\\\"7177\\\",\\\"static/chunks/app/layout-9608e2e56053bfaf.js\\\"],\\\"ThemeScript\\\"]\\n3:I[57121,[],\\\"\\\"]\\n4:I[17267,[\\\"8500\\\",\\\"static/chunks/8500-f62a38ff68ab7f42.js\\\",\\\"8039\\\",\\\"static/chunks/app/error-a89c2b5580ca661f.js\\\"],\\\"default\\\"]\\n5:I[74581,[],\\\"\\\"]\\n6:I[71265,[\\\"8500\\\",\\\"static/chunks/8500-f62a38ff68ab7f42.js\\\",\\\"4345\\\",\\\"static/chunks/app/not-found-4982f63cf7d1bc2f.js\\\"],\\\"default\\\"]\\n7:I[98500,[\\\"8500\\\",\\\"static/chunks/8500-f62a38ff68ab7f42.js\\\",\\\"2088\\\",\\\"static/chunks/app/acesso-negado/page-beba0cb377fafa02.js\\\"],\\\"\\\"]\\n8:I[16994,[\\\"3146\\\",\\\"static/chunks/3146-a7eb15f9fbb5979b.js\\\",\\\"8767\\\",\\\"static/chunks/8767-b51be67990d0a252.js\\\",\\\"7177\\\",\\\"static/chunks/app/layout-9608e2e56053bfaf.js\\\"],\\\"CommandMenu\\\"]\\n9:I[30282,[\\\"3146\\\",\\\"static/chunks/3146-a7eb15f9fbb5979b.js\\\",\\\"8767\\\",\\\"static/chunks/8767-b51be67990d0a252.js\\\",\\\"7177\\\",\\\"static/chunks/app/layout-9608e2e56053bfaf.js\\\"],\\\"Analytics\\\"]\\nb:I[90484,[],\\\"OutletBoundary\\\"]\\nc:\\\"$Sreact.suspense\\\"\\nf:I[90484,[],\\\"ViewportBoundary\\\"]\\n11:I[90484,[],\\\"MetadataBoundary\\\"]\\n13:I[26719,[\\\"4219\\\",\\\"static/chunks/app/global-error-e84119095309f16b.js\\\"],\\\"default\\\"]\\n15:I[86869,[],\\\"IconMark\\\"]\\n:HL[\\\"/_next/static/css/0763af953992c03e.css\\\",\\\"style\\\"]\\n:HL[\\\"/_next/static/css/4d64c093f548b2bf.css\\\",\\\"style\\\"]\\n\"])self.__next_f.push([1,\"0:{\\\"P\\\":null,\\\"c\\\":[\\\"\\\",\\\"acesso-negado\\\"],\\\"q\\\":\\\"\\\",\\\"i\\\":false,\\\"f\\\":[[[\\\"\\\",{\\\"children\\\":[\\\"acesso-negado\\\",{\\\"children\\\":[\\\"__PAGE__\\\",{}]}]},\\\"$undefined\\\",\\\"$undefined\\\",16],[[\\\"$\\\",\\\"$1\\\",\\\"c\\\",{\\\"children\\\":[[[\\\"$\\\",\\\"link\\\",\\\"0\\\",{\\\"rel\\\":\\\"stylesheet\\\",\\\"href\\\":\\\"/_next/static/css/0763af953992c03e.css\\\",\\\"precedence\\\":\\\"next\\\",\\\"crossOrigin\\\":\\\"$undefined\\\",\\\"nonce\\\":\\\"$undefined\\\"}],[\\\"$\\\",\\\"link\\\",\\\"1\\\",{\\\"rel\\\":\\\"stylesheet\\\",\\\"href\\\":\\\"/_next/static/css/4d64c093f548b2bf.css\\\",\\\"precedence\\\":\\\"next\\\",\\\"crossOrigin\\\":\\\"$undefined\\\",\\\"nonce\\\":\\\"$undefined\\\"}]],[\\\"$\\\",\\\"html\\\",null,{\\\"lang\\\":\\\"pt-BR\\\",\\\"className\\\":\\\"__variable_75787b __variable_1bc20f __variable_46fe82 h-full antialiased\\\",\\\"suppressHydrationWarning\\\":true,\\\"children\\\":[[\\\"$\\\",\\\"head\\\",null,{\\\"children\\\":[\\\"$\\\",\\\"$L2\\\",null,{}]}],[\\\"$\\\",\\\"body\\\",null,{\\\"className\\\":\\\"min-h-full flex flex-col\\\",\\\"children\\\":[[\\\"$\\\",\\\"$L3\\\",null,{\\\"parallelRouterKey\\\":\\\"children\\\",\\\"error\\\":\\\"$4\\\",\\\"errorStyles\\\":[],\\\"errorScripts\\\":[],\\\"template\\\":[\\\"$\\\",\\\"$L5\\\",null,{}],\\\"templateStyles\\\":\\\"$undefined\\\",\\\"templateScripts\\\":\\\"$undefined\\\",\\\"notFound\\\":[[\\\"$\\\",\\\"main\\\",null,{\\\"className\\\":\\\"min-h-screen flex items-center justify-center bg-slate-950 p-6\\\",\\\"children\\\":[\\\"$\\\",\\\"div\\\",null,{\\\"className\\\":\\\"max-w-md text-center space-y-4\\\",\\\"children\\\":[[\\\"$\\\",\\\"div\\\",null,{\\\"className\\\":\\\"w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto\\\",\\\"children\\\":[\\\"$\\\",\\\"$L6\\\",null,{\\\"ref\\\":\\\"$undefined\\\",\\\"iconNode\\\":[[\\\"path\\\",{\\\"d\\\":\\\"m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3\\\",\\\"key\\\":\\\"wmoenq\\\"}],[\\\"path\\\",{\\\"d\\\":\\\"M12 9v4\\\",\\\"key\\\":\\\"juzpu7\\\"}],[\\\"path\\\",{\\\"d\\\":\\\"M12 17h.01\\\",\\\"key\\\":\\\"p32p05\\\"}]],\\\"className\\\":\\\"lucide-triangle-alert w-8 h-8 text-amber-500\\\"}]}],[\\\"$\\\",\\\"p\\\",null,{\\\"className\\\":\\\"text-5xl font-bold text-amber-400\\\",\\\"children\\\":\\\"404\\\"}],[\\\"$\\\",\\\"h1\\\",null,{\\\"className\\\":\\\"text-xl font-semibold text-slate-100\\\",\\\"children\\\":\\\"Página não encontrada\\\"}],[\\\"$\\\",\\\"p\\\",null,{\\\"className\\\":\\\"text-sm text-slate-400\\\",\\\"children\\\":\\\"A rota ou o recurso que você está procurando não existe ou foi removido.\\\"}],[\\\"$\\\",\\\"div\\\",null,{\\\"className\\\":\\\"pt-4\\\",\\\"children\\\":[\\\"$\\\",\\\"$L7\\\",null,{\\\"href\\\":\\\"/\\\",\\\"className\\\":\\\"inline-flex h-11 items-center justify-center rounded-lg bg-sky-500 px-6 font-medium text-white transition-colors hover:bg-sky-400\\\",\\\"children\\\":\\\"Voltar ao início\\\"}]}]]}]}],[]],\\\"forbidden\\\":\\\"$undefined\\\",\\\"unauthorized\\\":\\\"$undefined\\\"}],[\\\"$\\\",\\\"$L8\\\",null,{}],[\\\"$\\\",\\\"$L9\\\",null,{}]]}]]}]]}],{\\\"children\\\":[[\\\"$\\\",\\\"$1\\\",\\\"c\\\",{\\\"children\\\":[null,[\\\"$\\\",\\\"$L3\\\",null,{\\\"parallelRouterKey\\\":\\\"children\\\",\\\"error\\\":\\\"$undefined\\\",\\\"errorStyles\\\":\\\"$undefined\\\",\\\"errorScripts\\\":\\\"$undefined\\\",\\\"template\\\":[\\\"$\\\",\\\"$L5\\\",null,{}],\\\"templateStyles\\\":\\\"$undefined\\\",\\\"templateScripts\\\":\\\"$undefined\\\",\\\"notFound\\\":\\\"$undefined\\\",\\\"forbidden\\\":\\\"$undefined\\\",\\\"unauthorized\\\":\\\"$undefined\\\"}]]}],{\\\"children\\\":[[\\\"$\\\",\\\"$1\\\",\\\"c\\\",{\\\"children\\\":[\\\"$La\\\",null,[\\\"$\\\",\\\"$Lb\\\",null,{\\\"children\\\":[\\\"$\\\",\\\"$c\\\",null,{\\\"name\\\":\\\"Next.MetadataOutlet\\\",\\\"children\\\":\\\"$@d\\\"}]}]]}],{},null,false,null]},null,false,\\\"$@e\\\"]},null,false,null],[\\\"$\\\",\\\"$1\\\",\\\"h\\\",{\\\"children\\\":[null,[\\\"$\\\",\\\"$Lf\\\",null,{\\\"children\\\":\\\"$L10\\\"}],[\\\"$\\\",\\\"div\\\",null,{\\\"hidden\\\":true,\\\"children\\\":[\\\"$\\\",\\\"$L11\\\",null,{\\\"children\\\":[\\\"$\\\",\\\"$c\\\",null,{\\\"name\\\":\\\"Next.Metadata\\\",\\\"children\\\":\\\"$L12\\\"}]}]}],null]}],false]],\\\"m\\\":\\\"$undefined\\\",\\\"G\\\":[\\\"$13\\\",[]],\\\"S\\\":false,\\\"h\\\":null,\\\"s\\\":\\\"$undefined\\\",\\\"l\\\":\\\"$undefined\\\",\\\"p\\\":\\\"$undefined\\\",\\\"d\\\":\\\"$undefined\\\",\\\"b\\\":\\\"Nn1TosO6Q9-T79nkDC4_A\\\"}\\n\"])self.__next_f.push([1,\"14:[]\\ne:\\\"$W14\\\"\\n10:[[\\\"$\\\",\\\"meta\\\",\\\"0\\\",{\\\"charSet\\\":\\\"utf-8\\\"}],[\\\"$\\\",\\\"meta\\\",\\\"1\\\",{\\\"name\\\":\\\"viewport\\\",\\\"content\\\":\\\"width=device-width, initial-scale=1\\\"}]]\\nd:null\\n12:[[\\\"$\\\",\\\"title\\\",\\\"0\\\",{\\\"children\\\":\\\"Solentis\\\"}],[\\\"$\\\",\\\"meta\\\",\\\"1\\\",{\\\"name\\\":\\\"description\\\",\\\"content\\\":\\\"Sistema de gestão de Estação de Tratamento de Efluentes\\\"}],[\\\"$\\\",\\\"link\\\",\\\"2\\\",{\\\"rel\\\":\\\"icon\\\",\\\"href\\\":\\\"/icon.svg?d1affa2ee086cb34\\\",\\\"type\\\":\\\"image/svg+xml\\\",\\\"sizes\\\":\\\"any\\\"}],[\\\"$\\\",\\\"$L15\\\",\\\"3\\\",{}]]\\n\"])self.__next_f.push([1,\"a:[\\\"$\\\",\\\"main\\\",null,{\\\"className\\\":\\\"min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-6\\\",\\\"children\\\":[\\\"$\\\",\\\"div\\\",null,{\\\"className\\\":\\\"max-w-sm text-center space-y-4\\\",\\\"children\\\":[[\\\"$\\\",\\\"p\\\",null,{\\\"className\\\":\\\"text-5xl font-bold text-amber-400\\\",\\\"children\\\":\\\"403\\\"}],[\\\"$\\\",\\\"h1\\\",null,{\\\"className\\\":\\\"text-xl font-semibold\\\",\\\"children\\\":\\\"Acesso negado\\\"}],[\\\"$\\\",\\\"p\\\",null,{\\\"className\\\":\\\"text-sm text-slate-400\\\",\\\"children\\\":\\\"Você não tem permissão para esta área.\\\"}],[\\\"$\\\",\\\"$L7\\\",null,{\\\"href\\\":\\\"/tecnico/analises\\\",\\\"className\\\":\\\"inline-block rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-sky-400\\\",\\\"children\\\":\\\"Voltar ao meu painel\\\"}]]}]}]\\n\"])"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - generic [ref=e3]:
      - paragraph [ref=e4]: "403"
      - heading "Acesso negado" [level=1] [ref=e5]
      - paragraph [ref=e6]: Você não tem permissão para esta área.
      - link "Voltar ao meu painel" [ref=e7] [cursor=pointer]:
        - /url: /tecnico/analises
  - alert [ref=e8]
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
> 29 |     expect(content).toContain('Acesso Restrito');
     |                     ^ Error: expect(received).toContain(expected) // indexOf
  30 |   });
  31 | 
  32 |   test('Usuário deslogado redirecionado para o login', async ({ page }) => {
  33 |     await page.goto('/gestor/dashboard');
  34 |     expect(page.url()).toContain('/login');
  35 |   });
  36 | 
  37 |   test('Rota inexistente (xpto) mostra erro 404 customizado', async ({ page }) => {
  38 |     const response = await page.goto('/xpto');
  39 |     expect(response?.status()).toBe(404);
  40 |     const content = await page.textContent('body');
  41 |     expect(content).toContain('Página não encontrada');
  42 |   });
  43 | });
  44 | 
```