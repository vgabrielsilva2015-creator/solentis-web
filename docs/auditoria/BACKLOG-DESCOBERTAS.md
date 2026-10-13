# Backlog de descobertas — auditoria e rastreabilidade

Registro vivo das lacunas achadas durante o PROMPT-01 (melhoria contínua). O
teste de contrato `src/lib/__tests__/m03-auditoria-cobertura.test.ts` é a fonte
da verdade executável: toda action de escrita audita ou está em `EXCECOES`.

Última atualização: 2026-10-13.

## M-03 — cobertura de `logAudit` nas server actions de escrita

Levantamento inicial: **48** actions de escrita sem auditoria.

### Fechadas (24)
- **M-03a** (10) — `categorias`, `pontos-de-coleta`, `prazos-ocorrencia`, `cronograma` (+`cronograma/novo`).
- **M-03b** (5) — `admin/plantas#criarPlanta` (tenant + 1º gestor) e `produtos-quimicos` (criar/editar/ativar/excluir).
- **M-03c** (9) — `manutencao` (agendarPreventiva/criarCorretiva), `turnos` (criar/editar/toggleAtivo/toggleDaySchedule), `tarefas-padrao` (criar/atualizar/desativar).

### Pendentes (15)
- **M-03d** — importação IA: `gestor/importacao#createParameterFromImport`, `#saveMappedReadings`; escala: `turnos/escala#addShiftTask/deleteShiftTask/saveShiftScale/toggleMaintenanceDay`; tarefas de turno: `turnos/tarefas/[id]/task-actions#atribuirTarefa/removerTarefa`, `turnos/tarefas#preAgendarTurno`.
- **M-03e** — `operador/turnos`: `abrirTurno`, `assumirPosto`, `iniciarPassagem`, `confirmarPassagem`, `concluirTarefa`, `pularTarefa`, `repetirTarefa`.
- **M-03f** — `tecnico/analises#registrarAnalise`; `tecnico/equipamentos`: `criarEquipamento`, `editarEquipamento`, `toggleAtivoEquipamento`, `concluirPreventiva`, `registrarCorretiva`.

### Exceções permanentes (infra/segurança, não auditam de propósito)
- `lib/push-actions#subscribeUser/unsubscribeUser` — assinatura de push do próprio aparelho.
- `(auth)#resetPassword`, `(auth)/trocar-senha#trocarSenhaAction` — mudança da própria senha (coberta por token de uso único / `BUMP_SESSION_VERSION`).
- `mfa/cadastro#confirmarCadastroMfa` — cadastro do próprio 2º fator.

## Achados relevantes
- **`admin/criarPlanta` sem auditoria** (RESOLVIDO no M-03b) — criava planta + 1º
  gestor sem rastro, enquanto o resto do módulo admin já auditava. Era o gap mais
  sensível por ser ação de super admin.

## Observações de robustez aplicadas junto (não mudam comportamento esperado)
- `editar*`/`toggle*` passaram a devolver "não encontrado" quando o `updateMany`
  não afeta linha (`count === 0`), em vez de fingir sucesso.
- `cronograma` e `excluirProduto` usam `deleteMany`/`updateMany` (não lançam em id
  de outra planta).
