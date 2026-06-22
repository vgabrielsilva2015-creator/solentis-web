# Mapa de Defeitos - Solentis App

> **Objetivo:** Registro detalhado de todos os *Not Found*, *Dead Links*, Crashes e divergências da plataforma levantados na FASE 0. Priorização por severidade para guiar a estabilização.

## 0.1 Inventário de Rotas e Papéis (Identificando Rotas Fantasmas)

Através de uma análise estática cruzando todos os `href`, `router.push()` e `<form action>` com as pastas reais em `src/app`, identificamos os seguintes problemas graves:

| Rota Chamada | Onde é chamada | Existe a página/API? | Status |
|---|---|---|---|
| `/gestor/metodos` | `src/app/tecnico/analises/page.tsx:64` | **NÃO**. Pasta não existe. | **P0 - Not Found ao clicar.** |
| `/api/ocorrencias/resolver` | `src/app/operador/ocorrencias/[id]/page.tsx:151` | **NÃO**. API route não existe. | **P0 - Erro ao enviar form.** |

## 0.2 Divergências de Navegação Principal (Dashboard Home)

Segundo os requisitos do "Plano de Ação", as rotas de aterrisagem por papel devem ser:

*   **Gestor:** Dashboard. No momento, o `getDashboardRoute` joga para `/gestor/dashboard`. *Status: OK (existe).*
*   **Técnico:** Tela de **Análises Internas** (rodada do técnico). No momento, joga para `/tecnico/dashboard`. O Técnico tem a página `/tecnico/analises`, então o redirect precisa ser corrigido. *Status: P1 - Funcional Quebrado.*
*   **Operador:** Tela inicial = rodada do turno. Atualmente joga para `/operador/dashboard`. *Status: P2 - Usabilidade/Mobile.*

## 0.3 Varredura Visual & Mobile (Status Pré-Correções)

Com as rotas principais em pé, foi possível observar que:

| Tela | Problema Encontrado | Severidade | Ação (A Ser Executada na Fase 2/3) |
|---|---|---|---|
| Múltiplas | BottomNav visível apenas para alguns papéis, ausente classe `lg:hidden` (fica duplicado no desktop em certas resoluções). | P2 | Adicionar controle de visibilidade em componentes shell. |
| Múltiplas | Falta de padding na parte inferior (`pb-20`) faz com que o conteúdo fique por trás da BottomNav em telas de celular (notch overlap). | P2 | Adicionar padding em layout wrapper. |
| Formulários | Alguns formulários (Leitura/Análise) não possuem persistência via Server Actions (ou não mostram erro ao falhar) | P1 | Auditar e refatorar envio de dados. |

---

**Resumo de Prioridades para Próxima Etapa:**
1. **[P0]** Criar ou arrumar o link para `/gestor/metodos` e a API `/api/ocorrencias/resolver` (isso garantirá 0 Not Founds no fluxo).
2. **[P1]** Alterar a rota inicial do Técnico para `/tecnico/analises` em `auth-utils.ts` e do Operador para a Rodada de Turno (`/operador/turnos`).
3. **[P2]** Aplicar otimizações visuais (Padding, BottomNav responsivo, tabelas em scroll horizontal).
