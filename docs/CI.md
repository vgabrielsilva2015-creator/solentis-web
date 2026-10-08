# CI (GitHub Actions)

Arquivo: `.github/workflows/ci.yml`. Roda em push e em PR para a `main`.

| Job | O que faz | Bloqueia o merge? |
|---|---|---|
| `isolamento-e-qualidade` | `npm audit` (produção, nível alto), Prisma generate, testes unitários (inclui o guardião de isolamento por planta), `tsc`, **lint (0 erros)**, **build** | sim |
| `integracao` | Postgres 16 de serviço, `prisma migrate deploy` do zero, `npm run test:integration` | sim |
| `seguranca` | Gitleaks (segredos no código e no histórico); revisão de dependências novas (só em PR) | sim |
| `e2e` | sobe o app construído no próprio job e roda o smoke do Playwright | **não** (`continue-on-error`) até a primeira execução verde |

## O que só o dono faz no GitHub

1. **Proteger a `main`:** Settings → Branches → Add rule para `main` → marcar "Require status checks to pass before merging" e escolher os jobs da tabela marcados "sim" (os nomes aparecem depois da primeira execução); marcar "Require a pull request before merging". Sem isso, o CI avisa mas não impede.
2. Depois da primeira execução verde do `e2e`, apagar a linha `continue-on-error: true` do job.
3. Dependabot: já existe `.github/dependabot.yml`. Revisar os PRs antigos abertos (a auditoria contou 12 parados).

## Rodar local o mesmo que o CI

```
npm ci
npm audit --omit=dev --audit-level=high
npx vitest run --no-cache
npx tsc --noEmit
npm run lint
npm run build
INTEGRATION_DATABASE_URL=postgresql://.../solentis_int npm run test:integration   # ver docs/TESTES.md
```

## Lint

`npm run lint` precisa terminar com **0 erros**. Os avisos continuam listados. Três regras novas do React Compiler (`react-hooks/set-state-in-effect`, `purity`, `static-components`) estão como aviso, não erro: apontam padrões que funcionam hoje (ler `localStorage` depois de montar, `Math.random` na animação do canvas, tooltip declarado dentro do componente) e o conserto é caso a caso. Ver `eslint.config.mjs`.
