# Changelog do Projeto Solentis

Este arquivo mantém um registro de todas as melhorias significativas, correções e novas funcionalidades adicionadas ao projeto. Ele serve como um backup histórico das decisões e implementações feitas.

## [Ciclo 3] - Junho de 2026

**Resumo do que foi entregue:**
Implementação de funcionalidades de usabilidade, padronização visual e recursos de exportação essenciais para as operações diárias de Gestores e Operadores.

### ✨ Novas Funcionalidades
- **Centro de Notificações:** Implementado o componente Sino + Dropdown (`NotificationBell`) nos headers do Gestor e Operador, buscando Ocorrências Abertas e Manutenções Preventivas atrasadas ou próximas do vencimento.
- **Exportação de Dados para CSV:** Atualizada a API de exportação (`/api/export`) para suportar Manutenções Preventivas. Botões "Exportar CSV" adicionados nas páginas de Listagem de Ocorrências e Listagem de Preventivas do Gestor.
- **Filtros nas Listas do Operador:**
  - Ocorrências (`/operador/ocorrencias`): Tabs arredondadas acima da lista para filtrar entre *Todas, Abertas, Alta Prioridade e Resolvidas*.
  - Leituras (`/operador/leituras`): Tabs para filtrar por *Todas, Conforme e Não Conforme*.
- **Ponto de Coleta e Categoria na Ocorrência:** O formulário de Nova Ocorrência (tanto para Operador quanto para Gestor) agora inclui o campo obrigatório **Categoria** e o campo opcional **Ponto de Coleta**. O detalhe da ocorrência do Operador exibe a informação do ponto de coleta.

### 💄 UI / UX e Padronização
- **Tradução de Enums e Padronização de Cores:** Criado o `src/lib/labels.ts` mapeando status do banco (em inglês) para termos em português com cores consistentes para Badges. Listas de Ocorrências e Manutenções atualizadas para exibir as novas labels.
- **Unificação do Design System:**
  - `PageHeader` padronizado para consumir variáveis CSS de cor (`text-foreground` e `text-muted-foreground`), integrando com os temas Light/Dark.
  - Inputs e Formulários refatorados para utilizar utilidades do Design System (`bg-background`, `border-input`, `focus:ring-ring`), removendo as classes "hardcoded" de cores (`bg-slate-800`).
  - `BottomNav` do Operador atualizado para utilizar o efeito *Glassmorphism* (fundo translúcido com `backdrop-blur`).

---
*(Novos ciclos serão registrados acima desta linha no futuro)*
