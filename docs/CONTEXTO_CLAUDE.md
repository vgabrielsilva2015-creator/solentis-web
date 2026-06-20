# Contexto do Projeto para o Claude (Prompt)

Se você vai enviar o código para o Claude para continuar o desenvolvimento ou criar a tela de "Cadastro de Pontos do Mapa de Calor", copie o texto abaixo (junto com o conteúdo de `docs/EXPORT_COMPLETO.md`) e mande para ele:

---

**Prompt para o Claude:**

"Olá, Claude! Estou enviando o export completo do meu projeto Next.js (App Router) + Prisma + Tailwind chamado 'Solentis'.

**O que já foi feito até aqui:**
1. Integramos o Dashboard do Gestor (`/gestor/dashboard`) para puxar os dados reais do Prisma (Server Components) através de props como `dbFeed`, `dbSla`, `dbMaintenance`, e `dbHeatmapPoints`. Removemos todos os mocks!
2. O sistema de Auth de reset de senha foi implementado com `Server Actions` no arquivo `src/app/(auth)/actions.ts` usando tokens simulados e bcryptjs para testes sem SMTP.
3. Criamos as páginas base em `/manutencao/preventivas` e `/manutencao/corretivas` para não dar 404 nos links do menu.
4. Tivemos um erro de build causado pelo `@ducanh2912/next-pwa` (Unexpected token 'i', "import type"... is not valid JSON) que foi contornado desabilitando o `withPWA` do `next.config.mjs` temporariamente. O build está rodando liso agora.

**A Minha Próxima Tarefa:**
Eu preciso que você (Claude) me ajude a criar o **CRUD de Cadastro de Pontos (HeatmapPoints)**.
Atualmente, no dashboard, o mapa exibe os pontos puxando do banco (`HeatmapPoint`), mas eu ainda não tenho a tela ou interface para cadastrar e editar esses pontos. Olhe no `schema.prisma` a estrutura de `HeatmapPoint` e construa para mim:
1. Uma Server Action para Criar/Atualizar/Deletar Pontos do Mapa (associados a uma Planta).
2. A página/interface onde eu (como Gestor/Admin) acesso para cadastrar esses pontos (ex: `/gestor/pontos-mapa`)."
