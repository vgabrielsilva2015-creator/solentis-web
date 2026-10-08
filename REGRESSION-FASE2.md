# Regressão — Fase 2 (T-15 a T-18): fluxo completo do operador

Rodada em 07/10/2026 sobre `fix/t18-flow-bugs` (`6d936ea`), com T-01 a T-18 empilhadas.

**Ambiente:** o mesmo da Fase 1. Banco `rls_stage`, criado só pelas migrations, com RLS e dono não superusuário. Build de produção do Next 16.4.0. Celular emulado: Pixel 7. **Produção: NÃO VERIFICADO** (não tenho acesso).

| Verificação | Resultado |
|---|---|
| `vitest` | 377/377 (antes da Fase 2: 277) |
| `tsc --noEmit` | 0 erros |
| `eslint` | 194 erros / 100 avisos (Fase 1: 196/100) |
| Build | ok |
| **E2E, 20 cenários** | **20/20**, numa única rodada |
| Runtime T-05 (cross-tenant) | 0 vazamentos (veja a observação 1) |
| Runtime T-06 (sessão) | igual à Fase 1 |
| Runtime T-10 (tentativas) | igual à Fase 1 |
| Runtime T-13 (estoque concorrente) | 3 rodadas, saldo nunca negativo |
| Runtime T-16 (números) | 6/6 |
| Runtime T-17 (busca) | igual à entrega |
| Runtime T-18 (fluxo) | igual à entrega |

## Teste novo: fluxo completo do operador (`tests/fase2-fluxo-operador.spec.ts`)
O teste usa dois navegadores separados, como dois aparelhos:

1. O operador 1 abre o turno sugerido para o horário.
2. Registra uma leitura de pH digitando **7,4**.
3. Inicia a passagem, com pendência e observação. Ele **não** vê o botão para confirmar a própria passagem.
4. Clica em "Sair".
5. O operador 2 vê o aviso no dashboard. Na lista de turnos aparece **"1 leitura(s) no turno"**, ou seja, a leitura entrou no turno certo (P-16).
6. O operador 2 confirma sem abrir turno.
7. A passagem sai da lista, e o histórico mostra a leitura.

Conferido no banco: turno `CLOSED`, passagem `CONFIRMED` dentro do prazo, valor gravado 7.4, vinculado ao turno do operador 1. Passou.

Os outros E2E da rodada:
- smoke dos 4 perfis;
- troca de senha (T-11, 2);
- cache do PWA e limpeza no logout (T-12);
- fila offline (T-15, 6);
- números (T-16, 3);
- B-05 e B-12 (T-18);
- corrida do logout.

## Achados novos nesta rodada (não corrigidos aqui)
1. **O formulário de passagem apaga o que o operador digitou quando a validação falha.** Reproduzido: preenchi as pendências, marquei a declaração e deixei a observação vazia. Ao enviar, aparece o erro "pelo menos 5 caracteres", e **as pendências e a declaração voltam vazias**. O motivo é que o React 19 limpa os campos não controlados de `<form action>` depois de cada envio. O formulário de leitura não tem esse problema, porque os campos são controlados. Isso deve afetar outros formulários com `useActionState` e campos não controlados. Fica para a **T-31 (UX do operador)**, com levantamento de todos os formulários.
2. **Iniciar e confirmar passagem não gravam auditoria.** No banco não há linha em `audit_logs` para a passagem do teste. A auditoria de passagem existe só na edição feita pelo gestor. O briefing exige rastreabilidade de passagem. Fica para a **T-25 (camada de domínio)**, junto com o restante da P2 de auditoria.
3. Depois de confirmar, o entrante cai em **Turnos**, e não no dashboard: a página de confirmação redireciona antes do `router.push`. O comportamento é o mesmo de antes da T-18 e não causa dano. Fica registrado para a T-31.

## Observações
1. **T-05:** a tentativa de criar cronograma com ponto e parâmetro de outra planta agora responde **200 com a mensagem** "Ponto de coleta ou parâmetro não encontrado.", em vez de erro 500, por causa da T-18. Nenhuma linha foi criada (0 linhas cruzadas).
2. **Harness:** criei `operador2@solentis.local` (mesma planta, mesma senha do operador do seed), só no banco local, para os testes de passagem. Por isso a T-06 agora conta 8 usuários restaurados, e não 7.
3. O Postgres local tinha parado (o container reiniciou). Religuei e rodei de novo. Nenhum resultado desta rodada veio do período com o banco fora.
4. **B-05** era falso positivo da captura da Passada 1 (screenshot de página inteira). Detalhes em `IMPLEMENTATION-T18.md`.

## Ordem de aplicação em produção (o que a Fase 2 acrescenta)
Além dos passos da Fase 1:
- `migrate deploy` aplica também `reading_client_id`, `reading_client_id_unique` (CONCURRENTLY), `revoked_sessions` e `search_unaccent_trgm`.
- Antes de publicar a T-18, rode só leitura: `SELECT count(*) FROM shift_handovers WHERE status='TIMED_OUT'`. Esse é o número de turnos hoje presos que vão aparecer para confirmação.
