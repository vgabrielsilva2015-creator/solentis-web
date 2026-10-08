# IMPLEMENTATION-T01 — Desligar o offline atual de leituras

**Tarefa:** T-01 (Fase 0 do `AUDIT-PASS-2.md`)
**Data:** 07/10/2026
**Branch:** `fix/t01-disable-offline-sync` (criada a partir de `origin/main` = `f7962c1`)
**Commit:** `54c0ca8` — `fix(operator): disable unsafe offline reading sync`
**Estado no seu computador:** branch criada no repositório `meu-projeto`. A branch em que você estava (`feat/super-admin-e-hardening`) e o WIP não commitado não foram tocados. Nada foi enviado ao GitHub.

---

## Objetivo

Parar imediatamente a perda silenciosa de leituras registradas sem conexão. Enquanto a nova arquitetura offline (T-15) não existir, o sistema não pode fingir que salva leituras offline.

## Problema Original

Reproduzido no código da `main` antes da alteração (celular, 412×915, Chromium):

```
navigator.onLine = false
1. alert mostrado: ["Você está offline. Leitura salva localmente e será sincronizada assim que a internet voltar."]
2. fila local logo após o envio: [{"collection_point_id":"seed-cp-entrada","parameter_id":"seed-param-ph","value":"7.1",...}]
4. fila depois de abrir página com internet: null
5. leitura no histórico? false          (banco: 0 linhas)
```

O operador recebia a confirmação de que a leitura estava salva. Na primeira página aberta com internet, a fila sumia e nenhuma leitura chegava ao banco.

## Causa

1. **`reading-form.tsx` (linhas 193–212):** sem conexão, o formulário gravava a leitura em `localStorage['solentis_offline_leituras']`, apagava o rascunho, mostrava um `alert` de sucesso e navegava para a lista.
2. **`sync-manager.tsx`:** montado no `layout.tsx` raiz, rodava em toda página carregada com internet e no evento `online`. Reenviava cada item com `point_id` (campo inexistente, lido de `item.point_id`, que não existe na fila) e sem `collection_point_id` nem `recorded_at`. `registrarLeitura` recusava todos. Depois do laço, `localStorage.removeItem(...)` apagava a fila inteira, independentemente do resultado.
3. **`offline-indicator.tsx`:** a faixa vermelha dizia "O modo de leitura local está ativado", reforçando a falsa promessa.

**Outros caminhos de gravação offline:** procurei todos os usos de `solentis_offline_leituras`, `SyncManager`, `localStorage`, `navigator.onLine`, filas e sincronização. Não existe outro. Os formulários de ocorrência (3 papéis) e de saída de estoque já bloqueiam o envio sem conexão. O service worker não tem background sync, e `worker/index.js` só trata push. Os demais usos de `localStorage` são rascunhos (leitura, ocorrência, análise) e o tema.

## Alterações

- **Formulário de leitura:** sem conexão, o envio é bloqueado (`preventDefault`) e aparece o aviso: *"Sem conexão com a internet. A leitura não foi enviada. Os dados continuam preenchidos: envie de novo quando a conexão voltar."* Os campos continuam como estão. O rascunho em `localStorage` (`reading_draft`, que já existia) **não é mais apagado** nesse caminho. Não há `alert`, não há navegação e não há fila. Quando a conexão volta, o mesmo botão envia normalmente e o aviso some.
- **`SyncManager`:** removido do layout raiz e arquivo apagado (não sobra código morto).
- **Faixa de offline:** texto trocado para *"Sem conexão. Leituras e registros só podem ser enviados quando a internet voltar."*
- **Fila antiga já existente em aparelhos:** não é lida, reenviada nem apagada. Os itens gravados pelo formulário antigo têm o formato correto (`collection_point_id`, `parameter_id`, `value`, `unit`, `notes`, `recorded_at`), então a T-15 pode recuperá-los.
- **`CLAUDE.md`:** a linha "Modo offline e PWA: IMPLEMENTADO..." passou a dizer que o offline de leituras está temporariamente desabilitado até a T-15; a menção a `sync-manager` nas regras do logger foi removida (o arquivo não existe mais).

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| `src/app/operador/leituras/novo/reading-form.tsx` | ramo offline substituído por bloqueio + aviso (+7 / −16 linhas de lógica, +6 de JSX) |
| `src/app/layout.tsx` | removidos o import e o `<SyncManager />` (−2) |
| `src/components/sync-manager.tsx` | apagado (−66) |
| `src/components/offline-indicator.tsx` | texto da faixa (1 linha) |
| `CLAUDE.md` | 2 linhas |
| `src/lib/__tests__/offline-leituras-desabilitado.test.ts` | **novo** — guarda de regressão (roda no CI) |
| `tests/t01-offline-leitura.spec.ts` | **novo** — E2E Playwright do fluxo |

Total: 7 arquivos, +184 / −88.

## Testes Executados

### Ambiente
- `typecheck`, `lint`, unitários e `build`: no código da branch, sem nenhuma modificação.
- E2E: no mesmo ambiente da auditoria (PostgreSQL local descartável, seed do projeto, `next start` de produção). Para rodar fora da sua máquina, essa cópia usa o engine WASM do Prisma com o adapter `pg`. Isso não faz parte do commit.

### Resultados

| Verificação | Antes (main) | Depois (branch) |
|---|---|---|
| Guarda unitária nova (3 testes) | **3 falham** | **3 passam** |
| E2E T-01 (5 cenários) | **4 falham**, 1 passa² | **5 passam** |
| `vitest run --no-cache` | 185/185 | **188/188** (14 arquivos) |
| `tsc --noEmit` | 0 erros | **0 erros** (29 s) |
| `eslint` nos arquivos alterados | — | 3 erros, todos **pré-existentes** em linhas não tocadas (`react-hooks/set-state-in-effect` nas linhas 91 e 147 do formulário e na linha 11 da faixa) |
| `eslint` no projeto inteiro | 197 erros / 101 avisos | **196 erros / 101 avisos** (o arquivo removido tinha 1 erro; nenhum erro novo)¹ |
| `next build` | ok | **ok** (108 s; mock offline de Google Fonts só porque o sandbox bloqueia `fonts.googleapis.com`) |
| E2E existentes (a2, a4, a5, rbac) | 2 passam / 6 falham | **2 passam / 6 falham — idênticos** |

¹ Com um `public/sw.js` gerado pelo build no disco, o eslint passa a contar +85 avisos e +1 erro desse arquivo. Isso é anterior a esta tarefa: o `eslint.config.mjs` não ignora `public/sw.js`. Os números da tabela excluem esse artefato.

² Rodado no build da `main` com uma versão intermediária do spec (mesmos cenários; só o seletor do primeiro ponto de coleta mudou depois). As falhas foram pelos motivos esperados: nenhuma mensagem de "sem conexão" e a fila antiga apagada pelo `SyncManager`. O passo a passo exato do problema está na reprodução da seção "Problema Original".

**Cenários E2E pedidos na tarefa:**

| # | Cenário | Teste | Resultado |
|---|---|---|---|
| 1 | Sem conexão → leitura não é considerada salva | E2E 1 (aviso visível, sem `alert`, URL continua no formulário, não aparece no histórico) | ✅ |
| 2 | Sem conexão → não existe sincronização falsa | E2E 1 (nada no histórico após reconectar) + E2E 3 (nenhum POST com `point_id`) + guarda unitária | ✅ |
| 3 | Rascunho permanece no formulário | E2E 1 (valor e observação preservados) | ✅ |
| 4 | Nenhuma fila é apagada silenciosamente | E2E 3 (fila antiga continua idêntica após navegar por 3 telas) + guarda unitária | ✅ |
| 5 | Conexão normal → leitura funciona | E2E 2 (tenta offline, volta online, envia o mesmo formulário, aparece no histórico) | ✅ |
| 6 | Login normal funciona | E2E 2–5 (login em cada teste) | ✅ |
| 7 | Demais fluxos do operador funcionam | E2E 5 (7 telas do operador com 200 e sem tela de erro) | ✅ |

**Depois da alteração, no celular (mesmo roteiro da reprodução):**

```
1. alert mostrado: []
2. fila local logo após o envio: null
3. URL continua no formulário: true
4. campos preservados: 7.1 | true
5. mensagem: Sem conexão com a internet. A leitura não foi enviada. Os dados continuam preenchidos: envie de novo quando a conexão voltar.
6. após reconectar e reenviar, leitura no histórico: true
```

### Sobre os E2E antigos que falham
As 6 falhas de `a2`, `a4` e `rbac` acontecem **igualmente antes e depois** (rodei os dois builds). São specs desatualizados: esperam que o operador caia em `/operador/dashboard` após o login (hoje cai em `/operador/turnos`), esperam um texto de 404 específico, etc. Já `a1` e `a3` importam o `PrismaClient` nativo e não rodam sem o engine nativo do Prisma. Nada disso tem relação com a T-01.

## Resultado

- A perda silenciosa de leituras offline **acabou**: sem conexão, a leitura não é aceita, o operador é avisado e os dados continuam na tela.
- Nenhuma confirmação falsa, nenhuma fila nova, nenhuma fila apagada, nenhum reenvio automático.
- Com conexão, o fluxo é exatamente o mesmo de antes.
- Diff pequeno e restrito ao offline de leituras. Nenhum módulo não relacionado foi alterado.

## Riscos

- **Operação em área sem sinal:** o operador não consegue mais registrar leitura offline. Antes ele "registrava" e perdia, então na prática é a primeira vez que ele sabe que não salvou. Até a T-15, a orientação é anotar e lançar quando houver sinal.
- **Filas antigas em aparelhos:** um aparelho que gravou leitura offline e nunca mais abriu o app com internet ainda pode ter itens em `solentis_offline_leituras`. Eles ficam guardados e invisíveis. Não há como saber quantos existem sem acesso aos aparelhos. A T-15 deve importá-los (o formato está correto). Se quiser antecipar, dá para fazer um aviso no formulário com a contagem, como tarefa separada.
- **Rascunho no modo checklist:** no modo "locked" (ponto e parâmetro definidos pelo gestor), o formulário nunca salvou rascunho em `localStorage`. Os dados ficam preservados enquanto a página estiver aberta, como a tarefa pede, mas se perdem se a página for recarregada. Esse comportamento já existia antes.
- **O aviso aparece perto do botão de enviar**, que no celular continua parcialmente coberto pela barra inferior (B-05). Isso é uma tarefa separada (T-18).
- **Deploy:** service workers antigos podem servir JavaScript antigo até a atualização. O Serwist usa `skipWaiting` + `clientsClaim`, então a troca acontece no próximo carregamento.

## Pontos Ainda Pendentes

- **T-15 continua pendente** e será responsável pela nova arquitetura offline com **IndexedDB + idempotência** (`client_id`), incluindo a recuperação dos itens que possam ter ficado na fila antiga.
- Abrir o PR: `git push -u origin fix/t01-disable-offline-sync` e criar o PR para a `main`. **Atenção:** o gate `npm audit --omit=dev --audit-level=high` do CI vai falhar por causa do Next 16.2.12. Isso é a T-02 e não tem relação com esta mudança.
- Rodar o E2E novo no seu ambiente: `npx playwright test tests/t01-offline-leitura.spec.ts` (precisa do app em `localhost:3000` e do usuário seed `operador@solentis.local` / `Operador@123`).
- O CI atual não roda Playwright. O E2E fica no repositório para a T-29, e a guarda unitária já roda no CI.
- Arquivos deixados dentro de `.git` pela transferência da branch: `t01-disable-offline-sync.bundle` e `stale-maintenance-lock-claude-2`. Ficam fora do working tree e podem ser apagados quando você quiser.
