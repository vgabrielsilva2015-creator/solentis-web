# IMPLEMENTATION-T11 — Troca de senha segura

**Branch:** `fix/t11-password-change` (sobre `fix/t10-rate-limiting`)
**Commit:** `c1bf1f4` — `fix(auth): require current password to change password`

## Objetivo
Só quem sabe a senha atual consegue trocar a senha.

## Problema original
- Na Passada 1 (cenário 15), `/trocar-senha` aceitou a troca **sem a senha atual**. Quem tivesse a sessão aberta tomava a conta: aparelho compartilhado no turno, cookie roubado, alguém que esqueceu de sair.
- A action tinha uma regra de senha própria (8 caracteres + maiúscula + minúscula), diferente da que a tela mostra (10 caracteres, letra e número). O usuário via "requisitos ok" e mesmo assim tomava erro.
- O usuário era buscado por e-mail.

## Causa raiz
O fluxo foi feito só para a troca obrigatória do primeiro acesso, sem pensar em quem já está com a sessão aberta.

## Alterações realizadas
- O campo **senha atual** passou a ser obrigatório e é conferido com bcrypt no servidor. Quem recebeu senha provisória digita ela.
- 5 erros de senha atual por usuário em 15 min bloqueiam novas tentativas, usando o limitador da T-10.
- O usuário é buscado por **id + planta da sessão**, e precisa estar ativo.
- Uma única política de senha (`passwordSchema`), a mesma da tela. A nova senha também precisa ser diferente da atual.
- O `session_version` é incrementado, então as outras sessões caem e esta é reemitida (mantido da T-06).
- Erro inesperado mostra mensagem genérica e o detalhe vai para o log.
- Na tela, o campo "Senha atual" tem a dica "Se você recebeu uma senha provisória, digite ela aqui."

## Arquivos modificados
`src/app/(auth)/trocar-senha/actions.ts`, `src/app/(auth)/trocar-senha/page.tsx`, `src/lib/rate-limit.ts`, `src/lib/__tests__/password-change.test.ts` (novo), `tests/t11-troca-senha.spec.ts` (novo).

## Testes
- **Unitários (8):**
  - sem a senha atual, ou com ela errada: não troca, e o erro conta para o limite;
  - com a senha certa: troca, incrementa a versão e reautentica;
  - busca por id e planta;
  - nova igual à atual é recusada;
  - política única;
  - bloqueio após 5 erros;
  - erro de banco sem detalhe na tela.
- **E2E (2, navegador de verdade):**
  - com a senha atual errada aparece "Senha atual incorreta" e a senha original continua valendo;
  - com a certa a senha troca, a antiga passa a dar "E-mail ou senha incorretos", a nova entra, e o teste devolve a senha original no fim.

| Verificação | Resultado |
|---|---|
| `vitest` | 266/266 (21 arquivos) |
| `tsc --noEmit` | 0 erros |
| `eslint` | 196 / 101, sem mudança |
| Smoke E2E + T-11 E2E | 6/6 |

## Resultado
Ter a sessão aberta não basta mais para tomar a conta. A regra de senha ficou coerente entre a tela e o servidor.

## Riscos
- Mudança de comportamento: senhas como `minusculas2026` passam a ser aceitas (eram recusadas pela regra escondida). Isso é o que a tela sempre prometeu.
- Quem esqueceu a senha provisória precisa de um novo reset pelo gestor, o que já era o caminho normal.

## Rollback
`git revert c1bf1f4`.

## Pendências
Nenhuma específica desta tarefa.
