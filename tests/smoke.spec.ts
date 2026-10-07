import { test, expect, type Page } from '@playwright/test';

// Smoke de regressão: cada perfil faz login e abre todas as suas telas estáticas.
// Falha se alguma tela responder != 200 ou cair numa tela de erro.
// Credenciais por variável de ambiente (CI/staging); padrão = usuários do seed.

type Perfil = { nome: string; email: string; senha: string; rotas: string[] };

const PERFIS: Perfil[] = [
  {
    nome: 'operador',
    email: process.env.E2E_OPERADOR_EMAIL ?? 'operador@solentis.local',
    senha: process.env.E2E_OPERADOR_SENHA ?? 'Operador@123',
    rotas: ['/operador/dashboard', '/operador/estoque', '/operador/leituras', '/operador/leituras/historico',
      '/operador/leituras/novo', '/operador/ocorrencias', '/operador/ocorrencias/novo', '/operador/turnos',
      '/operador/turnos/abrir', '/operador/turnos/escala'],
  },
  {
    nome: 'tecnico',
    email: process.env.E2E_TECNICO_EMAIL ?? 'tecnico@solentis.local',
    senha: process.env.E2E_TECNICO_SENHA ?? 'Tecnico@123',
    rotas: ['/tecnico/analises', '/tecnico/analises/historico', '/tecnico/analises/novo', '/tecnico/dashboard',
      '/tecnico/equipamentos', '/tecnico/estoque', '/tecnico/ocorrencias', '/tecnico/ocorrencias/novo',
      '/tecnico/turnos/escala', '/tecnico/turnos/tarefas'],
  },
  {
    nome: 'manutencao',
    email: process.env.E2E_MANUTENCAO_EMAIL ?? 'manutencao@solentis.local',
    senha: process.env.E2E_MANUTENCAO_SENHA ?? 'Manutencao@123',
    rotas: ['/manutencao/dashboard', '/manutencao/corretivas', '/manutencao/preventivas', '/manutencao/escala'],
  },
  {
    nome: 'gestor',
    email: process.env.E2E_GESTOR_EMAIL ?? 'admin@solentis.local',
    senha: process.env.E2E_GESTOR_SENHA ?? 'Admin@123',
    rotas: ['/gestor/dashboard', '/gestor/analises', '/gestor/auditoria', '/gestor/categorias', '/gestor/cronograma',
      '/gestor/equipamentos', '/gestor/laudos', '/gestor/leituras', '/gestor/mais', '/gestor/manutencao/corretivas',
      '/gestor/manutencao/preventivas', '/gestor/ocorrencias', '/gestor/ocorrencias/novo', '/gestor/parametros',
      '/gestor/pontos-de-coleta', '/gestor/prazos-ocorrencia', '/gestor/produtos-quimicos', '/gestor/relatorios',
      '/gestor/turnos', '/gestor/turnos/escala', '/gestor/turnos/tarefas', '/gestor/usuarios', '/gestor/usuarios/novo'],
  },
];

async function login(page: Page, p: Perfil) {
  await page.goto('/login');
  await page.fill('input[name="email"]', p.email);
  await page.fill('input[name="password"]', p.senha);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
}

for (const perfil of PERFIS) {
  test(`smoke: ${perfil.nome} abre todas as telas`, async ({ page }) => {
    await login(page, perfil);
    test.skip(page.url().includes('/trocar-senha'), `${perfil.nome} precisa trocar a senha antes (seed)`);
    const falhas: string[] = [];
    for (const rota of perfil.rotas) {
      const resp = await page.goto(rota);
      const status = resp?.status() ?? 0;
      const erro = await page.getByText(/algo deu errado|erro fatal|application error/i).count();
      if (status !== 200 || erro > 0 || !page.url().includes(rota)) falhas.push(`${rota} → ${status}${erro ? ' (tela de erro)' : ''} ${page.url()}`);
    }
    expect(falhas).toEqual([]);
  });
}
