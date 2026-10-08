# Testes

| Camada | Comando | Banco | O que cobre |
|---|---|---|---|
| Unitário + guardiões estáticos | `npm run test:run` | não usa | funções puras, schemas, leitura estática do código (isolamento por planta, matriz de permissões) |
| Integração (T-28) | `npm run test:integration` | Postgres local de teste | actions, guardas de sessão e cron de verdade contra o banco; só a sessão (`auth()`) e o `redirect` são simulados |
| E2E (Playwright) | `npx playwright test` | app rodando | fluxos de tela |

## Integração: como rodar

1. Crie um banco **local** só para testes. O nome precisa terminar em `_int`, `_test` ou `_ci`:
   `createdb solentis_int`
2. Aplique as migrations do zero: `DATABASE_URL=postgresql://.../solentis_int DIRECT_URL=$DATABASE_URL npx prisma migrate deploy`
3. Rode: `INTEGRATION_DATABASE_URL=postgresql://.../solentis_int npm run test:integration`

**Atenção:** a cada teste, TODAS as tabelas do banco são esvaziadas (`TRUNCATE`). Por isso `src/test/db.ts` recusa qualquer banco que não seja local e de teste, e lê só `INTEGRATION_DATABASE_URL` (nunca `DATABASE_URL`).

## Peças

- `vitest.integration.config.ts`: só `*.int.test.ts`, um arquivo por vez.
- `src/test/setup-integration.ts`: valida o banco, simula `auth()`/`redirect`/caches e limpa o banco antes de cada teste.
- `src/test/factories.ts`: planta, usuário, ponto, categoria, produto, entrada de estoque e um cenário pronto (`criarCenario`).
- `src/test/auth-mock.ts`: `actAs(usuario)`, `form({...})`, `redirecionou(fn)`.

## Testes P0 de integração (`src/server/__tests__/p0-*.int.test.ts`)

- **Isolamento:** ID de outra planta em saída/contagem de estoque e em leitura → erro e nada gravado; controles mostram que o banco sozinho aceitaria.
- **Estoque concorrente:** 10 saídas simultâneas, saldo 10, 3 kg cada → 3 passam, saldo nunca negativo; controle negativo prova que sem a trava dá negativo.
- **Sessão:** usuário desativado/apagado, papel trocado, `session_version`, planta desativada, "Sair" (só aquela sessão), guarda das actions (papel vem do banco), troca de senha (atual errada não muda nada; certa derruba outras sessões).
- **Idempotência:** mesmo `client_id` 3x e 5x em paralelo = 1 leitura; cron de turnos 2x e 2x em paralelo = 1 instância; cron sem segredo = 401.
