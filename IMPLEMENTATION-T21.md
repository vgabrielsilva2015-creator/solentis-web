# IMPLEMENTATION-T21 — Higiene de segurança

**Branch:** `fix/t21-security-hygiene` (sobre `fix/t20-permissions`)
**Commits:**

| Commit | Mensagem |
|---|---|
| `093ee3d` | `fix(security): push senders are no longer public server actions (T-21, V-11)` |
| `b971e54` | `fix(security): escape user text in invite e-mail, templates in one module (T-21, V-12)` |
| `8f6d474` | `fix(validation): max length on every text input and valid status on corrective updates (T-21, B-09)` |
| `47acf4c` | `fix(logs): redact e-mail and phone, stop logging recipient and body of simulated mail (T-21)` |
| `9cdbcaa` | `fix(security): replace create-super.ts (fixed password) with a script without defaults (T-21)` |
| `f39716e` | `feat(email): Solentis-branded invite and password-reset e-mails (T-21)` |

## Objetivo
Fechar os achados de baixo risco da auditoria que ainda estavam abertos: V-11, V-12, B-09, e-mail em log, validação do status da corretiva e a senha fixa do script do super admin.

## Problema original
| Achado | O que acontecia |
|---|---|
| V-11 | `sendPushToRole` e `sendPushToUsers` estavam num arquivo `'use server'`: eram endpoints públicos, sem login, que mandam push para qualquer perfil de qualquer planta. (Risco baixo: o id da action muda a cada build e não aparece no JS público. É higiene.) |
| V-12 | O e-mail de convite colocava o nome do usuário direto no HTML. Um gestor podia criar um usuário com nome `<a href=...>` e o e-mail saía do remetente oficial com link ou markup injetado. |
| B-09 | Descrição de ocorrência aceitou 200 KB. 87 campos de texto sem tamanho máximo. |
| PII em log | O envio de e-mail simulado (desenvolvimento) gravava o destinatário e o começo do corpo do e-mail, onde fica o link com token. O logger não mascarava e-mail nem telefone. |
| Status da corretiva | `atualizarStatusCorretiva` confiava no tipo do TypeScript, que não existe em execução. Qualquer texto chegava ao update. (O banco já barra valor inválido desde a T-19.) |
| Senha fixa | `create-super.ts`, na raiz do repositório, criava `super@solentis.local` com a senha `Super@123`, sem confirmar em qual banco estava rodando. |

## Causa raiz
Defaults inseguros que nunca foram revisitados: o que é "interno" ficou num arquivo de actions, o HTML foi montado por concatenação, tamanho de texto era por convenção, e um script de conveniência de desenvolvimento ficou no repositório com credencial.

## Alterações realizadas
- **V-11:** `src/lib/push-service.ts` (sem `'use server'`) recebeu os dois envios; `push-actions.ts` ficou só com `subscribeUser` e `unsubscribeUser`. Nenhuma tela chamava os envios.
- **V-12:** `src/lib/email-templates.ts` guarda os modelos de e-mail. Todo texto de usuário passa por `escapeHtml`; as URLs passam por `safeUrl` (só http/https). As 3 actions de e-mail (convite do gestor, convite do super admin, redefinição de senha) usam o módulo.
- **B-09:** `.max()` em todos os `z.string()`: ids 64, datas 40, nomes/títulos 200, textos longos 2000, texto de laudo 20000, senha 128, e-mail 254, slug 60. Limites também nas entradas que não passam por Zod: comentário de ocorrência, título/descrição de tarefa do cronograma, descrição de dia de manutenção, notas da corretiva.
- **Status da corretiva:** lista de status válidos conferida antes de qualquer consulta ao banco.
- **Logs:** `REDACT_PATHS` agora inclui `email`, `to`, `phone`, `telefone` (e `*.`), e o envio simulado registra só o domínio do destinatário.
- **Super admin:** `create-super.ts` removido. `scripts/ops/create-super-admin.ts` não tem padrão nenhum: e-mail, nome, slug da planta e o host do banco a confirmar vêm de argumentos; a senha vem de `SUPER_ADMIN_PASSWORD` (mínimo 14 caracteres, não pode ser senha padrão conhecida nem conter o e-mail). Só cria (nunca sobrescreve) e nunca imprime a senha. `--confirm-host` precisa ser igual ao host do `DATABASE_URL`, para não criar conta no banco errado.
- **Visual dos e-mails:** convite e redefinição de senha no estilo Solentis (cores da marca, logo, botão, validade real do link, "Não foi você?" na redefinição). Logo em `public/email/solentis-logo.png`, servido por URL absoluta a partir de `NEXTAUTH_URL`.

## Arquivos modificados
- Novos: `src/lib/push-service.ts`, `src/lib/email-templates.ts`, `src/lib/super-admin-cli.ts`, `scripts/ops/create-super-admin.ts`, `public/email/solentis-logo.png`.
- Removido: `create-super.ts`.
- Alterados: `src/lib/push-actions.ts`, `src/lib/logger.ts`, `src/lib/email.ts`, `src/lib/auth.ts`, `src/lib/monitoring-schedule.ts`, `PRODUCTION-CHECKLIST.md`, as actions de e-mail (`(auth)`, `admin/plantas`, `gestor/(sistema)/usuarios`), `tecnico/equipamentos`, `operador/ocorrencias`, `gestor/turnos/escala` e 15 arquivos de actions e schemas com os limites de texto.

## Testes criados
- `t21-higiene.test.ts`: `push-actions` só exporta subscribe/unsubscribe; arquivo `'use server'` não exporta nada além de funções async; **todo `z.string()` do projeto tem `.max()` ou `.length()`** (um campo novo sem limite derruba o teste).
- `email-templates.test.ts`: escape de HTML no nome e no e-mail, URL de esquema perigoso vira `#`, nenhum `<script>`, `<link>` ou recurso externo além do logo, validade real do link, existência do logo.
- `t21-entradas.test.ts`: status inválido da corretiva é recusado sem gravar, nota gigante é recusada, comentário de 200 KB é recusado, entradas válidas continuam gravando.
- `log-pii.test.ts`: e-mail, destinatário, telefone, senha e token são mascarados pelo logger real; o envio simulado não loga destinatário nem corpo.
- `super-admin-cli.test.ts`: o script antigo não existe; recusa sem e-mail, nome, planta ou host confirmado; recusa host diferente do `DATABASE_URL`; regras de senha.
- `permissions.test.ts`: lista estrita (sem a exceção `INTERNAS_T21`); as duas funções de push constam como removidas de propósito.

**Contraprova (teste vermelho com o código antigo):**
| Item | Antes da correção |
|---|---|
| V-11 | 4 testes falharam (`sendPushToRole`/`sendPushToUsers` sem guard em arquivo `'use server'`) |
| B-09 | 87 campos de texto sem limite listados pelo teste; 6 testes de comportamento falharam (status inválido x4, nota gigante, comentário de 200 KB) |
| V-12 | 3 testes falharam (as actions montavam o HTML na mão) |
| PII em log | 7 testes falharam (sem a lista de máscara; o envio simulado gravava o destinatário) |

## Testes executados
| Verificação | Resultado |
|---|---|
| `vitest` | 564/564 (antes 520) |
| `tsc --noEmit` | 0 erros |
| `eslint` | 193 erros / 97 avisos (igual à T-20) |
| `next build` | ok |
| Runtime T-05, T-06, T-13, T-16, T-17, T-18 | idêntico à T-20 |
| Runtime T-10 | idêntico (só varia o tempo em décimos de segundo) |
| E2E (smoke, T-11, T-12, T-15, T-16, T-18, logout, fluxo do operador, T-20) | 21/21 |
| Visual dos e-mails | renderizado e conferido em imagem (desktop) |

## Resultado
Nenhuma função interna é endpoint público. Nome de usuário não altera mais o HTML dos e-mails. Nenhum texto é aceito sem tamanho máximo, e o teste impede que volte. O log não carrega e-mail nem telefone. Não existe mais script com senha embutida.

## Riscos
- **Limites de tamanho podem recusar texto que antes passava.** 2000 caracteres para textos longos e 200 para nomes cobrem o uso normal. Texto colado de laudo tem limite de 20000. Se algum operador reclamar, o limite está num só ponto por campo.
- **Senha máxima 128.** É só um teto de proteção; o bcrypt já usa apenas os 72 primeiros bytes.
- **Os e-mails do app saem pelo código (Resend), não pelo Supabase.** Os modelos HTML que eu fiz antes para colar no Supabase só valem se o app passar a usar o e-mail de autenticação do Supabase, o que hoje não acontece. O visual novo agora está no código.
- **Logo no e-mail depende de `NEXTAUTH_URL` correto e do deploy do arquivo.** Se a URL estiver errada, o e-mail mostra só o quadrado azul da marca.
- **Visual dos e-mails testado só em navegador.** Não foi testado em Gmail, Outlook e celular.
- **A parte do `create-super-admin.ts` que fala com o banco não foi executada** (este ambiente não tem o motor nativo do Prisma). As regras ao redor estão testadas e o arquivo é verificado pelo `tsc`.
- **NÃO VERIFICADO em produção:** se a conta `super@solentis.local` já existe lá com a senha `Super@123`. O `PRODUCTION-CHECKLIST.md` (item 1.2/1.3) já pede essa conferência.

## Rollback
`git revert f39716e 9cdbcaa 47acf4c 8f6d474 b971e54 093ee3d`. Sem migration.

## Pendências
- Conferir em produção o item 1.2/1.3 do checklist e trocar a senha do super admin se for a padrão.
- Testar o visual dos e-mails em Gmail, Outlook e celular quando houver o envio real pelo Resend.
- A validação de perfil por página (`session.user.role` nos `page.tsx`) continua para a T-27.
