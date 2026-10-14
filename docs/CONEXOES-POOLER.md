# Conexões, pooler e limites (M-15)

Como o Solentis fala com o Postgres (Supabase) em serverless (Vercel), por que isso
importa para escala, e o que o dono precisa conferir no painel. Resumo honesto: o
**código já é disciplinado** (leituras em `Promise.all`, dashboards com SQL agregado);
o gargalo real de escala é o **plano do Supabase**, não o código.

## 1. Duas URLs, dois propósitos

| Variável | Porta | Para quê | Quem usa |
|---|---|---|---|
| `DATABASE_URL` | **6543** (pooler / pgbouncer) | todas as queries do app em runtime | o app na Vercel |
| `DIRECT_URL` | **5432** (conexão direta) | migrations e `CREATE INDEX CONCURRENTLY` | `prisma migrate` (dono) |

Por que separado: em serverless cada invocação é um processo curto. Centenas de
invocações simultâneas abririam centenas de conexões diretas e estourariam o banco.
O **pooler (6543)** fica na frente e reaproveita um punhado de conexões reais. Já
`migrate deploy` e `CONCURRENTLY` **não funcionam atrás do pgbouncer** (precisam de
sessão real) — por isso migrations usam a `DIRECT_URL` (5432). O `schema.prisma` já
reflete isso: `url = env("DATABASE_URL")` + `directUrl = env("DIRECT_URL")`.

## 2. Parâmetros da `DATABASE_URL` (pooler)

Modelo em `.env.example`:

```
postgresql://USER:PASSWORD@HOST:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
```

- `pgbouncer=true` — avisa o Prisma que há um pooler na frente (desliga prepared
  statements que o pgbouncer em modo transaction não suporta).
- `connection_limit=1` — **cada função serverless atende 1 query por vez.** Como a
  Vercel sobe muitas funções em paralelo, o paralelismo vem do nº de funções, não de
  um pool gordo por função. Um pool grande por função multiplicaria conexões e
  derrubaria o banco mais rápido.
- `pool_timeout=20` — a função espera até 20 s por uma conexão livre antes de falhar
  com erro claro, em vez de pendurar.

## 3. Teto do plano Supabase (o limite que importa)

O número de **conexões reais** que o pooler pode abrir é limitado pelo **plano**:

- **Free:** pooler com teto baixo (ordem de ~60 conexões no modo transaction). Suporta
  demonstração e piloto pequeno; **não** suporta milhares de usuários simultâneos.
- Escalar para muitos usuários = **upgrade de plano** (mais conexões no pooler),
  não mudança de código. Ver a memória de projeto `solentis-supabase-free-teto`.

> Em outras palavras: `connection_limit=1` protege o banco; o teto de simultaneidade
> é do plano. Mexer no código não levanta esse teto.

## 4. Disciplina no código (o que já está feito)

- **Leituras independentes em paralelo** com `Promise.all` — ex.: `loginCounts`
  (`src/lib/rate-limit.ts`), dashboards (`src/server/dashboard/queries.ts`), e o
  `getMappingContext` da importação de laudos (M-15).
- **Dashboards agregam no banco** (SQL/`groupBy`), não trazem linhas para contar em
  memória (T-23).
- **Transações curtas:** o `$transaction` da importação de laudo faz 1 análise por
  vez e devolve o hook de notificação para rodar **depois do commit** (M-06/M-08) —
  nada de push/WhatsApp segurando a transação aberta.
- **Nada de `findMany` sem `take`** em caminho perigoso (varredura de escala já feita;
  as queries sem `take` são limitadas por status/FK/data).

Regra ao escrever query nova: se duas (ou mais) leituras **não dependem uma da outra**
e estão **fora de uma transação**, use `Promise.all`. Se uma depende do resultado da
outra (ex.: busca o ponto e depois os limites da matriz dele), mantenha em série.

## 5. NÃO VERIFICADO em produção — passo para o dono

Não tenho acesso ao painel da Vercel/Supabase. Confira você:

1. **Vercel → Project → Settings → Environment Variables → `DATABASE_URL`**: deve ser
   a URL do **pooler (6543)** e conter `?pgbouncer=true&connection_limit=1&pool_timeout=20`.
   Se não tiver os parâmetros, edite e **redeploy**.
2. **`DIRECT_URL`**: conexão **direta (5432)**, usada só por você ao rodar migrations.
3. **Supabase → Database → Connection pooling**: confirme que o modo é *Transaction* e
   anote o teto de conexões do plano atual (baseline para decidir upgrade).
4. Sob carga real, se aparecer erro de `pool_timeout`/"too many connections", o sinal é
   teto do plano — avaliar upgrade, não reescrever código.
