# Permissões (T-20)

Fonte única: `src/server/auth/permissions.ts`. Esta tabela é gerada a partir dele. Para mudar uma permissão, altere o arquivo e atualize `MUDANCAS` em `src/lib/__tests__/permissions.test.ts`.

Decisões do dono do produto (08/10/2026): gestor registra leitura e mexe no estoque; operador resolve ocorrência, sempre com responsável, data/hora e ação registrados; Manutenção registra ocorrências; técnico registra leitura de campo.

| Permissão | O que é | Operador | Técnico | Gestor | Manutenção | Super admin |
|---|---|---|---|---|---|---|
| `reading.create` | Registrar leitura de campo. | ✔ | ✔ | ✔ |  |  |
| `stock.move` | Saída e contagem física de produto químico. | ✔ | ✔ | ✔ |  |  |
| `stock.receive` | Entrada de produto químico (recebimento). |  | ✔ | ✔ |  |  |
| `occurrence.create` | Registrar e comentar. | ✔ | ✔ | ✔ | ✔ |  |
| `occurrence.move` | Mudar a coluna do kanban (aberta, em andamento, aguardando). | ✔ | ✔ | ✔ |  |  |
| `occurrence.resolve` | Resolver, ou reabrir uma resolvida. Sempre com a ação descrita (src/server/occurrences/resolve.ts). | ✔ | ✔ | ✔ |  |  |
| `shift.operate` | Abrir turno, passagem, confirmar, assumir posto, concluir/pular/repetir tarefa. | ✔ |  |  |  |  |
| `shift.assign` | Atribuir/remover tarefa de um turno e tarefas-padrão do turno. |  | ✔ | ✔ |  |  |
| `shift.manage` | Cadastro de turnos, escala, pré-agendamento e correção de passagem. |  |  | ✔ |  |  |
| `analysis.create` | Registrar análise de laboratório. |  | ✔ |  |  |  |
| `analysis.approve` | Aprovar análise. |  | ✔ | ✔ |  |  |
| `lab.import` | Importar laudo externo (IA) e salvar os resultados. |  |  | ✔ |  |  |
| `equipment.maintain` | Cadastrar/editar equipamento, concluir preventiva, abrir/atualizar corretiva. |  | ✔ | ✔ | ✔ |  |
| `maintenance.validate` | Validar OS concluída (status VALIDATED). |  |  | ✔ |  |  |
| `maintenance.plan` | Agendar preventiva e abrir corretiva pelo painel do gestor. |  |  | ✔ |  |  |
| `config.manage` | Parâmetros, pontos, categorias, produtos, prazos de ocorrência, cronograma. |  |  | ✔ |  |  |
| `users.manage` | Criar, editar, desativar e redefinir senha de usuário. |  |  | ✔ |  |  |
| `dashboard.view` | Relatórios e detalhes do painel do gestor. |  |  | ✔ |  |  |
| `data.export` | Exportar CSV (/api/export). |  |  | ✔ |  |  |
| `platform.admin` | Plantas e usuários de todas as plantas. |  |  |  |  | ✔ |

**Telas por área** (`AREA_ACCESS`): `/gestor` gestor; `/tecnico` técnico e gestor; `/operador` operador, técnico e gestor; `/manutencao` manutenção e gestor; `/admin` super admin.

**Como uma action usa:** `const ctx = await requirePermission('config.manage')` (sem permissão vai para /acesso-negado) ou `getActor()` + `permissionError(ctx, 'shift.operate')` quando a tela mostra a mensagem. `ctx.userId`, `ctx.tenantId` e `ctx.role` vêm do banco a cada chamada.

## Super Admin (Fase 1 — base)

- `SUPER_ADMIN` **não é mais curinga** em `src/lib/auth-utils.ts`: só alcança `/admin/*` (e as rotas comuns a todos os perfis). Telas de gestor/técnico/operador não abrem para ele.
- Super admins moram na planta oculta `solentis-plataforma` (slug reservado; não pode ser criado, editado nem desativado pelo painel). Clientes não a enxergam em `/admin/plantas`.
- O gestor de uma planta **não enxerga nem altera** usuários `SUPER_ADMIN` (listas e todas as actions de `gestor/usuarios` filtram `role: { not: 'SUPER_ADMIN' }`).
- Nunca se desativa o último super admin ativo nem a si mesmo (`FOR UPDATE` em `src/server/admin/plataforma.ts`).
- Scripts: `scripts/ops/create-super-admin.ts` (cria na planta da plataforma) e `scripts/ops/move-super-admin.ts` (simulação por padrão; `--apply --confirm-host=<host>` grava; derruba a sessão do movido).
- `audit_logs.ip_address` passa a ser preenchido por `logAudit` (cabeçalho da requisição, ou IP informado).
