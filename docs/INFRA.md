# INFRA — Solentis em produção

Documento da T-07. Diz **o que a produção precisa ter** e **como provar que tem**. O estado real de cada item fica no `PRODUCTION-CHECKLIST.md` (T-04). Este documento não afirma que nada esteja configurado.

Fatos de planos e limites conferidos na documentação pública da Vercel e do Supabase em 07/10/2026. Preço e limite mudam com o tempo: confira no painel antes de decidir.

---

## 1. Planos

### 1.1 Vercel → **Pro**
- O Hobby é restrito a **uso pessoal e não comercial** pelas regras de uso justo da Vercel. O Solentis atende empresas (plantas), então precisa estar no Pro.
- O Pro também traz o que a operação precisa: 1 dia de logs de runtime (o Hobby guarda 1 hora), Drains para exportar logs, controle de gastos e suporte por e-mail.
- **Região das funções:** `gru1` (São Paulo), definida no `vercel.json`. Precisa ficar na mesma região do banco (`sa-east-1`).

### 1.2 Supabase → **Pro**, com PITR
| Necessidade | Free | Pro |
|---|---|---|
| Projeto não pode pausar | **pausa após 1 semana sem uso** | não pausa |
| Backup diário automático | não tem (só export manual) | 7 dias |
| PITR (voltar a qualquer segundo) | não tem | add-on (exige compute Small ou maior) |
| Conexões (compute Micro / Small) | — | direta 60 / 90 · pooler 200 / 400 |

**Recomendação mínima para produção:** Supabase Pro + compute **Small** + **PITR de 7 dias**.

- O PITR fecha a lacuna do backup diário. Um erro às 15h, num backup diário, pode perder até 24 h de leituras. Com PITR, perde segundos.
- Para dados de conformidade CONAMA, perder um dia de leituras de campo não é aceitável.

---

## 2. Conexões com o banco

```
DATABASE_URL = ...pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&pool_timeout=20
DIRECT_URL   = ...supabase.com:5432/postgres        (só migrations / pg_dump / scripts)
```

| Parâmetro | Valor | Por quê |
|---|---|---|
| porta `6543` + `pgbouncer=true` | obrigatório no app | O pooler em modo transação aguenta muitas funções serverless. O `pgbouncer=true` desliga os prepared statements, que não funcionam nesse modo. |
| `connection_limit=1` | obrigatório no app | Cada instância de função da Vercel atende uma requisição por vez. Mais de 1 conexão por instância só esgota o pooler mais cedo. |
| `pool_timeout=20` | obrigatório no app | Sob pico, a requisição espera até 20 s por uma conexão e falha com erro claro, em vez de ficar pendurada. |
| `DIRECT_URL` | nunca no app em runtime | A conexão direta tem teto baixo (60 no Micro). É usada só por ferramenta de manutenção. |

**Teto teórico:** com `connection_limit=1`, o número de requisições simultâneas ao banco é limitado pelo pooler: 200 no Micro e 400 no Small. Acima disso as requisições esperam (`pool_timeout`). Se o pooler bater no teto com frequência, suba o compute. Não aumente o `connection_limit`.

> Em 07/10/2026, o `.env` local auditado **não** tinha `connection_limit` nem `pool_timeout`. Conferir a variável da Vercel (item 3 do `PRODUCTION-CHECKLIST.md`).

---

## 3. Backups — três camadas

| Camada | O que cobre | Quem faz | Frequência |
|---|---|---|---|
| 1. PITR (Supabase) | qualquer instante dos últimos 7 dias | automático | contínuo |
| 2. Backup diário (Supabase) | foto diária, 7 dias | automático | diário |
| 3. **Dump lógico fora do Supabase** | perda da conta ou do projeto, erro descoberto depois de 7 dias | você | semanal, e antes de toda migração |

A camada 3 existe porque as camadas 1 e 2 ficam **dentro do mesmo projeto**. Se o projeto for apagado, se a conta for comprometida ou se o erro for descoberto tarde demais, elas não ajudam.

### 3.1 Dump lógico (camada 3)
```bash
# Somente leitura na produção. Use a conexão DIRETA (5432).
pg_dump "$DIRECT_URL" -Fc --no-owner --no-privileges -f solentis-$(date +%F).dump
```
- Guarde **fora** do Supabase e fora do repositório: um drive da empresa com acesso restrito. O arquivo contém dados pessoais (LGPD).
- Retenção sugerida: 4 semanais + 6 mensais.
- `backups/` já está no `.gitignore`. **Nunca** commitar dump.
- Os scripts `scripts/backup.ts` (SQLite) e `scripts/backup-pg.ts` (JSON via Prisma, sem restore escrito) **não** são backup de produção. O `pg_dump` acima é o caminho.

### 3.2 Arquivos (fotos, PDFs)
Os backups do Supabase **não** incluem os arquivos. Os uploads ficam no Vercel Blob, e o banco guarda só a referência. Apagar um arquivo no Blob é definitivo. Hoje não existe cópia dos arquivos: a T-26 (Blob privado) vai tratar disso. Até lá, isso é um risco aceito e registrado.

---

## 4. Restore — procedimento

**Regra:** nunca restaurar por cima da produção como primeiro passo. No Supabase, o restore de backup/PITR **substitui o projeto inteiro** e o deixa fora do ar durante o processo. Por isso o primeiro restore vai sempre para um banco separado.

### 4.1 Teste de restore (fazer agora e repetir a cada 3 meses)
1. Criar um projeto Supabase **separado** (staging). Nunca usar o de produção.
2. Gerar o dump (3.1) e restaurar no staging:
   ```bash
   pg_restore --no-owner --no-privileges -d "$STAGING_DIRECT_URL" solentis-AAAA-MM-DD.dump
   ```
3. Comparar as contagens de linhas com a origem (somente leitura nos dois):
   ```bash
   scripts/ops/compare-row-counts.sh "$DIRECT_URL" "$STAGING_DIRECT_URL"
   ```
   Pode haver diferença só nas tabelas que receberam escrita depois do dump (`audit_logs`, `login_attempts`, leituras do dia).
4. Subir um deploy de preview da Vercel apontando para o staging. Entrar com um usuário de teste e abrir dashboard, leituras e estoque.
5. Registrar na tabela 4.3: data, tamanho, tempo de dump e restore, resultado.

### 4.2 Restore real (incidente)
1. **Parar as escritas:** colocar o app em manutenção. Se não houver modo de manutenção, desativar as plantas pelo super admin, o que derruba as sessões em até 60 s (T-06).
2. Fazer um dump do estado atual, mesmo quebrado. É a prova do incidente e permite voltar atrás.
3. Escolher o ponto: PITR, para o segundo anterior ao erro, ou backup diário.
4. Se der tempo: restaurar primeiro num projeto separado e validar (4.1, passos 3 e 4).
5. Restaurar a produção pelo painel do Supabase (Database → Backups) e validar de novo.
6. Reabrir o acesso e registrar o incidente.

**Metas:** RPO (perda máxima) de segundos com PITR, ou até 24 h sem PITR. RTO (tempo fora do ar) de até 2 h, a confirmar no primeiro teste.

### 4.3 Registro de testes de restore
| Data | Origem | Tamanho do dump | Dump | Restore | Contagens | App no staging | Quem |
|---|---|---|---|---|---|---|---|
| 07/10/2026 | banco **local** do harness de auditoria (não é produção) | 133 KB | 0,2 s | 0,4 s | idênticas (e diferença detectada quando forçada) | — | auditoria |
| _pendente_ | **produção** | | | | | | |

O teste de 07/10/2026 só valida o **procedimento e o script**. Ele não diz nada sobre os backups de produção, que ninguém testou ainda.

---

## 5. Migrações em produção (resumo; detalhes na T-09)
- **Nunca** rodar `prisma migrate reset`, `prisma db push` ou `migrate dev` contra produção.
- Antes de qualquer SQL de schema: fazer o dump (3.1).
- SQL aditivo pendente de aplicar **antes** do próximo deploy: `prisma/sql/add_user_session_version.sql` (T-06).

## 6. Responsabilidades
| Item | Responsável | Onde conferir |
|---|---|---|
| Planos Vercel/Supabase, PITR | dono da conta | `PRODUCTION-CHECKLIST.md` 1.11, 1.13, 2.1 |
| `DATABASE_URL` com `connection_limit`/`pool_timeout` | dono da conta | `PRODUCTION-CHECKLIST.md` seção 3 |
| Dump semanal (camada 3) | dono da conta | pasta de backups da empresa |
| Teste de restore trimestral | dono da conta | tabela 4.3 |
