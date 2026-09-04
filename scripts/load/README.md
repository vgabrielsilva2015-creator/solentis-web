# Teste de carga do Solentis (k6)

Mede **quantos usuários simultâneos** o app aguenta antes de degradar — com número, não chute.

## Por que staging separado?

Jogar 500 usuários virtuais contra o banco **de produção** cria dados de teste,
consome as conexões dos usuários reais e pode derrubar o app no ar. Por isso o
teste roda contra um **ambiente de staging isolado** (deploy de preview + banco
Supabase separado). O plano Free do Supabase permite **2 projetos**, então dá pra
ter um só pra teste sem custo.

## Passo a passo do staging (você faz uma vez)

1. **Banco de teste:** no Supabase, crie um 2º projeto (ex.: `solentis-staging`).
   Copie a *Connection string* do pooler (porta 6543) e a direta (5432).
2. **Deploy de preview na Vercel:** crie um branch (ex.: `staging`) e configure as
   env vars desse ambiente na Vercel apontando o `DATABASE_URL`/`DIRECT_URL` para o
   projeto de teste. Mantenha `&connection_limit=1&pool_timeout=20` na URL do pooler.
3. **Popule dados:** rode o seed contra o banco de teste
   (`DATABASE_URL=... npx tsx prisma/seed.ts` e, se quiser volume,
   `npx tsx prisma/seed-demo.ts`). Crie contas em 2–3 tenants diferentes.

## Rodando o teste

```bash
# Instale o k6: https://k6.io/docs/get-started/installation/

k6 run -e BASE_URL=https://solentis-staging.vercel.app \
       -e EMAIL=operador@planta-a.local \
       -e PASSWORD=SenhaDeTeste \
       scripts/load/k6-load.js
```

### Simular plantas diferentes ao mesmo tempo

Abra vários terminais, cada um com credenciais de um tenant diferente. A carga
total é a soma — assim você testa "várias plantas rodando juntas", que é o cenário
real de vários clientes.

## Lendo o resultado

No fim, o k6 imprime um resumo. Olhe:

- **`http_req_duration` p(95)** — se passou de 2s, o app está lento sob aquela carga.
- **`http_req_failed`** — % de erro. Acima de ~2% = está afogando.
- **`login_duration` vs `browse_duration`** — mostra o que sofre primeiro.
- **O degrau onde tudo piora** — cruze o horário do resumo com os `stages` do script
  (50 → 200 → 500 usuários). Esse é o seu **teto real**.

Quando o teto for por **conexão de banco** (erros do tipo pool timeout / too many
connections), o gargalo é o plano do Supabase — subir pro Pro é o próximo passo.
Quando for CPU/tempo mesmo com banco tranquilo, aí é otimização de código.
