# IMPLEMENTATION-T15 — Fila offline de leituras (reescrita)

**Branch:** `fix/t15-offline-queue` (sobre `fix/t14-rls`)
**Commits:**
- `e87602d` — `feat(operator): reliable offline reading queue with idempotent sync`
- `fea3d5c` — `fix(auth): logout cannot be undone by late session refresh`. É um bug encontrado pelos testes desta tarefa, e o commit é separado.

## Objetivo
Permitir registrar leitura sem internet sem perder nem duplicar dado:
- IndexedDB, `client_id` e idempotência;
- fila persistente com nova tentativa automática e tratamento de erro;
- item só sai da fila depois da confirmação do servidor;
- a fila antiga é recuperada;
- o usuário vê o que está pendente.

## Problema original
A fila antiga (`localStorage` + `SyncManager`) dizia "leitura salva", reenviava com campos errados (`point_id` em vez de `collection_point_id`) e apagava a fila inteira mesmo quando o servidor recusava. A T-01 tinha desligado o modo offline até esta tarefa.

## Causa raiz
RC-4: o offline era otimista. Não havia identificador da leitura, nem confirmação do servidor, nem dono do item.

## Alterações realizadas
**Servidor**
- `readings.client_id`. Migration `20261007030000` cria a coluna, e a `030100` cria o índice único `(tenant_id, client_id)` com `CONCURRENTLY`, para não travar a tabela em produção.
- `registrarLeitura` aceita `client_id`. Se o mesmo id chegar de novo, devolve `success` com `duplicate` e não grava. Dois envios simultâneos são barrados pelo índice, e o segundo também volta como sucesso.

**Aparelho**
- `src/lib/offline-queue/core.ts` concentra as regras (puras e testadas):
  - cada item tem **dono** (o usuário que registrou);
  - o item só sai com `success` do servidor;
  - falha de rede: nova tentativa automática, esperando 15 s, 30 s, 1 min… até 15 min;
  - recusa do servidor (ponto apagado, valor inválido): o item **fica** marcado como "Recusada", com o motivo;
  - os itens são enviados na ordem em que foram registrados.
- `idb-store.ts`: grava em IndexedDB, inclusive a **foto**. O "Sair" não apaga a fila.
- `OfflineSync` no cabeçalho do operador: sincroniza ao abrir, ao voltar a internet, ao voltar para a aba e a cada minuto. Mostra um aviso com a contagem (âmbar = aguardando, vermelho = precisa de atenção).
- Página **`/operador/leituras/pendentes`**: lista, "Enviar agora", "Tentar de novo", "Descartar" (pede confirmação) e "Fui eu, enviar" para as leituras antigas.
- **Formulário:** sem conexão, ou se a rede cair no meio do envio, a leitura vai para a fila com o **mesmo** `client_id` e o formulário fica pronto para a próxima. Se o servidor tiver chegado a gravar, o reenvio não duplica. Em aparelho sem IndexedDB, continua o bloqueio seguro da T-01.
- **Fila antiga:** é copiada para a fila nova, e a chave antiga só é apagada depois de confirmar que tudo foi copiado. Como a versão antiga não registrava quem fez a leitura, esses itens ficam "sem autor" e **só são enviados se quem está logado confirmar** que foram dele.

**Correção extra (commit separado): "Sair" que não saía**
O E2E de tablet compartilhado falhou de forma intermitente (cerca de 2 em 16 execuções). A causa era real e anterior a esta tarefa:
- a sessão é renovada em toda resposta;
- uma requisição de fundo que estava em andamento no momento do "Sair" devolvia o cookie renovado **depois** do logout;
- resultado: o usuário voltava logado.

A correção:
- o token ganhou um `sid`;
- o "Sair" grava esse `sid` num cookie marcador e na tabela `revoked_sessions` (migration `20261007040000`, com RLS);
- o proxy ignora e apaga o cookie de sessão encerrada;
- a revalidação da T-06 derruba, em até 60 s, cópias desse cookie em outros aparelhos.

## Arquivos modificados
- **Fila:** `src/lib/offline-queue/core.ts`, `src/lib/offline-queue/idb-store.ts`, `src/components/operador/offline-sync.tsx`, `src/app/operador/leituras/pendentes/*`, `src/app/operador/leituras/novo/{reading-form.tsx,page.tsx}`, `src/app/operador/leituras/actions.ts`, `src/app/operador/layout.tsx`, `prisma/schema.prisma`, 2 migrations, `CLAUDE.md`.
- **Testes:** `src/lib/__tests__/offline-leituras.test.ts` (substitui o guarda da T-01) e `tests/t15-offline-fila.spec.ts` (substitui o E2E da T-01).
- **Logout:** `src/lib/logout-marker.ts`, `src/components/sign-out-action.ts`, `src/proxy.ts`, `src/lib/session-guard.ts`, `src/lib/session-version.ts`, `src/lib/auth*.ts`, migration `revoked_sessions`, `tests/logout-race.spec.ts`.

## Testes
- **Unitários: 20 casos da fila**, incluindo:
  - só remove com confirmação;
  - `duplicate` conta como confirmado;
  - rede caída mantém o item e para de tentar os próximos;
  - recusa fica guardada;
  - não envia item de outro usuário;
  - migração só apaga a fila antiga depois da cópia;
  - fila antiga ilegível é preservada;
  - item sem autor só sai depois de alguém assumir.
- **Unitários de logout:** 4 casos.
- **E2E da fila** (6 cenários; repeti em 9 rodadas seguidas, sem falha depois da correção do logout):
  1. Sem conexão: a leitura fica guardada, sem nenhum `alert`. Quando a internet volta ela é enviada sozinha e aparece **uma vez** no histórico.
  2. O servidor grava, mas a resposta se perde no caminho. A leitura fica na fila e, no reenvio, **continua uma só**.
  3. Recusa do servidor ("Ponto de coleta inválido"): a leitura fica guardada com o motivo e só sai quando o usuário descarta (com confirmação).
  4. Fila antiga: é migrada, o `localStorage` é limpo, nada é enviado sozinho e, depois do "Fui eu, enviar", entra **uma vez**.
  5. Tablet compartilhado: o técnico não envia a leitura do operador, o "Sair" não apaga a fila e, quando o operador volta, a leitura é enviada.
  6. As telas do operador continuam funcionando e o indicador offline aparece.
- **Duplicatas no banco:** das 53 leituras criadas pelos testes, há 53 `client_id` distintos e nenhuma duplicata.
- **E2E de logout:** a resposta é segurada de propósito até depois do "Sair". Antes da correção: **3/3 falhas**, com o usuário voltando logado para `/operador/turnos`. Depois: passa sempre.

| Verificação | Resultado |
|---|---|
| `vitest` | 297/297 |
| `tsc --noEmit` | 0 erros |
| `eslint` | 196 / 100 (sem piora; um erro novo da tela de pendentes foi corrigido) |
| Smoke + T-11 + T-12 E2E | 7/7 |
| T-06 (runtime) | ok, e o token novo com `sid` não quebra a revogação |

## Resultado
O operador pode registrar leituras sem sinal com garantia de que nada se perde, nada duplica e nada é enviado em nome de outra pessoa. O "Sair" ficou confiável.

## Riscos
- **Offline só funciona com a tela de leitura já aberta.** O PWA não guarda páginas (T-12), então não dá para *abrir* o app sem internet. É o caso real: o operador abre a tela, perde o sinal no campo e envia.
- A leitura sincronizada mais tarde entra no turno que estiver aberto **no momento do envio**. O horário registrado é o que ele digitou.
- Depois de um novo deploy, uma aba antiga pode falhar no envio até ser recarregada (o id da action muda). Nesse caso o item continua na fila, e nada se perde.

## Rollback
`git revert fea3d5c e87602d`. As colunas e tabelas novas podem ficar no banco sem efeito.

## Pendências
- Portar os cenários para a suíte de integração com CI (T-28/T-29).
