# IMPLEMENTATION-T08 — Segredos: rotação e bloqueio no Git

**Branch:** `fix/t08-secrets` (sobre `fix/t07-infra-docs`)
**Commit:** `843c858` — `chore(security): document secret rotation and block secrets from git`

## Objetivo
Ter um roteiro para rotacionar os segredos, impedir que `docs/recovery-codes.txt` (e similares) seja commitado e ter uma barreira automática contra segredo versionado.

## Problema original
- `docs/recovery-codes.txt` existe na pasta do projeto, fora do Git, mas **não estava no `.gitignore`**. Um `git add .` o versionaria.
- O token do GitHub já tinha aparecido no `git remote`.
- Não havia inventário dos segredos nem procedimento de rotação.

## Causa raiz
RC-7: a operação é de protótipo e não tinha política de segredos.

## Alterações realizadas
- **`docs/SECRETS.md` (novo):**
  - inventário dos 10 segredos, tirado do código (`process.env.*`);
  - para cada um: onde é usado, o efeito de rotacionar (por exemplo, `AUTH_SECRET` desloga todos e VAPID quebra as inscrições de push) e o passo a passo;
  - ordem recomendada para a rotação pós-auditoria.
- **`docs/recovery-codes.txt`:**
  - o conteúdo **não foi lido**;
  - o arquivo **não foi apagado**, porque é a saída de emergência de uma conta com 2FA;
  - o documento orienta copiar para um gerenciador de senhas, conferir a cópia e só depois apagar.
- **`.gitignore`:** `docs/recovery-codes.txt`, `*recovery-codes*`, `*.pem`, `*.key`. O `*.dump` entrou na T-07.
- **`secrets-hygiene.test.ts` (novo, roda no CI):** varre os arquivos rastreados (`git ls-files`).
  - Falha se houver `.env` real, dump, chave privada ou códigos de recuperação.
  - Falha se aparecer formato de credencial real: Resend, Google, GitHub, Vercel Blob, Stripe, PEM ou URL de Postgres com senha.
  - Imprime só arquivo, linha e tipo, **nunca o valor**. Placeholders como `USER:PASSWORD` passam.

## Arquivos modificados
`docs/SECRETS.md` (novo), `src/lib/__tests__/secrets-hygiene.test.ts` (novo), `.gitignore`.

## Testes executados
| Verificação | Resultado |
|---|---|
| `vitest` | 244/244 (18 arquivos) |
| `tsc --noEmit` | 0 erros |
| Contraprova: arquivo com token falso + arquivo `*recovery-codes*` adicionados ao índice | os 2 testes falham e apontam `tmp-leak.ts:1 (GitHub token)` e `tmp-recovery-codes.md`; os arquivos foram removidos em seguida |
| `git check-ignore docs/recovery-codes.txt` | ignorado |
| Varredura do **histórico completo** do Git com os mesmos padrões | 0 ocorrências |

## Resultado
O arquivo de códigos e as chaves não entram mais no Git por acidente, e um segredo commitado quebra o CI. A rotação em si **não foi feita**, porque depende de acesso aos painéis.

## Riscos
- A detecção é por padrões conhecidos. Um segredo em formato livre (uma senha qualquer dentro de um `.ts`) não é pego.
- Rotacionar o `AUTH_SECRET` desloga todos. Rotacionar o VAPID quebra as notificações até cada usuário reativar.

## Rollback
`git revert 843c858`.

## Pendências (dependem de você)
1. Rotacionar na ordem da seção 3 do `docs/SECRETS.md`, começando pela revogação do token antigo do GitHub.
2. Mover os códigos de recuperação para um gerenciador de senhas e, depois de conferir a cópia, apagar o arquivo da pasta.
