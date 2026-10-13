# Backlog de descobertas — auditoria e rastreabilidade

Registro vivo das lacunas achadas durante o PROMPT-01 (melhoria contínua). O
teste de contrato `src/lib/__tests__/m03-auditoria-cobertura.test.ts` é a fonte
da verdade executável: toda action de escrita audita ou está em `EXCECOES`.

Última atualização: 2026-10-13.

## M-03 — cobertura de `logAudit` nas server actions de escrita

Levantamento inicial: **48** actions de escrita sem auditoria. **Status: CONCLUÍDO (48/48).**

### Fechadas (48 — todas)
- **M-03a** (10) — `categorias`, `pontos-de-coleta`, `prazos-ocorrencia`, `cronograma` (+`cronograma/novo`).
- **M-03b** (5) — `admin/plantas#criarPlanta` (tenant + 1º gestor) e `produtos-quimicos` (criar/editar/ativar/excluir).
- **M-03c** (9) — `manutencao` (agendarPreventiva/criarCorretiva), `turnos` (criar/editar/toggleAtivo/toggleDaySchedule), `tarefas-padrao` (criar/atualizar/desativar).
- **M-03d** (9) — `importacao` (createParameterFromImport/saveMappedReadings — resumo por import), `turnos/escala` (addShiftTask/deleteShiftTask/saveShiftScale/toggleMaintenanceDay), tarefas de turno (atribuirTarefa/removerTarefa/preAgendarTurno).
- **M-03e** (7) — `operador/turnos`: abrirTurno, iniciarPassagem, confirmarPassagem, concluirTarefa, pularTarefa, assumirPosto, repetirTarefa.
- **M-03f** (6) — `tecnico/analises#registrarAnalise`; `tecnico/equipamentos`: criarEquipamento, editarEquipamento, toggleAtivoEquipamento, concluirPreventiva, registrarCorretiva.

### Pendentes
Nenhuma. `EXCECOES_PENDENTE` do teste de contrato está vazio.

### Exceções permanentes (infra/segurança, não auditam de propósito)
- `lib/push-actions#subscribeUser/unsubscribeUser` — assinatura de push do próprio aparelho.
- `(auth)#resetPassword`, `(auth)/trocar-senha#trocarSenhaAction` — mudança da própria senha (coberta por token de uso único / `BUMP_SESSION_VERSION`).
- `mfa/cadastro#confirmarCadastroMfa` — cadastro do próprio 2º fator.

## Achados relevantes
- **`admin/criarPlanta` sem auditoria** (RESOLVIDO no M-03b) — criava planta + 1º
  gestor sem rastro, enquanto o resto do módulo admin já auditava. Era o gap mais
  sensível por ser ação de super admin.
- **Escritas de estoque no `service.ts` fora do contrato de auditoria** (ABERTO) —
  o teste de contrato `m03-auditoria-cobertura.test.ts` só varre arquivos
  `'use server'`. As gravações de estoque vivem em `src/server/estoque/service.ts`
  (que **não** é `'use server'`), então `registrarEntradaDeEstoque`,
  `registrarSaidaDeEstoque` e `registrarContagemDeEstoque` **escaparam** da varredura.
  - **Contagem:** passou a auditar no M-04 (`logAudit` dentro do serviço).
  - **Entrada e saída:** ainda **não auditam**. Proposta: adicionar `logAudit` nas
    duas no serviço (CREATE em `chemical_stock_entries` / `chemical_stock_exits`) e
    **estender o contrato** para varrer também `src/server/**`, não só `'use server'`,
    de modo a pegar escritas delegadas a serviços. Risco baixo, sem migration.

## Observações de robustez aplicadas junto (não mudam comportamento esperado)
- `editar*`/`toggle*` passaram a devolver "não encontrado" quando o `updateMany`
  não afeta linha (`count === 0`), em vez de fingir sucesso.
- `cronograma` e `excluirProduto` usam `deleteMany`/`updateMany` (não lançam em id
  de outra planta).
