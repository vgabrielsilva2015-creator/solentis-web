# RUNBOOK — Solentis

Comandos e procedimentos operacionais do projeto. Mantenha este arquivo atualizado a cada fase.

---

## 1. Comandos do dia a dia

### 1.1 Rodar servidor de desenvolvimento
```bash
npm run dev
```
Servidor disponível em: **http://localhost:3000**
Para encerrar: `Ctrl + C` no terminal.

### 1.2 Abrir Prisma Studio (visualizador do banco)
```bash
npx prisma studio
```
Interface disponível em: **http://localhost:5555** (ou porta aleatória disponível — veja o output do terminal).
Para encerrar: `Ctrl + C` no terminal.

### 1.3 Aplicar migrations (após alterar o schema.prisma)
```bash
npx prisma migrate dev --name <nome-descritivo>
```
Exemplo: `npx prisma migrate dev --name add-users-table`
Cria a migration SQL em `prisma/migrations/` e atualiza o banco.

### 1.4 Regenerar cliente Prisma (após alterar o schema.prisma)
```bash
npx prisma generate
```
Regenera os tipos TypeScript em `src/generated/prisma/`.
**Sempre rodar após clonar o repositório** (o cliente gerado não está no Git).

---

## 2. Banco de dados

### 2.1 Resetar banco (apagar tudo e recriar do zero)
```bash
npx prisma migrate reset
```
⚠️ **DESTRUTIVO** — apaga todos os dados e recria o banco do zero com seed.
Use apenas em desenvolvimento. Nunca em produção.

### 2.2 Fazer backup manual
```bash
# Windows (PowerShell)
$data = Get-Date -Format "yyyy-MM-dd"
Copy-Item "prisma\dev.db" "backups\solentis-$data.db"
```
Backups ficam em `/backups/` (pasta ignorada pelo Git).
**Crie a pasta antes:** `mkdir backups` (se ainda não existir).

### 2.3 Restaurar backup (com teste de integridade)
```bash
# 1. Pare o servidor de desenvolvimento antes de restaurar
# 2. Substitua o banco atual pelo backup desejado (Windows PowerShell):
Copy-Item "backups\solentis-AAAA-MM-DD.db" "prisma\dev.db"

# 3. Verifique a integridade do banco restaurado:
npx prisma migrate status

# 4. Abra o Prisma Studio e confirme que os dados estão lá:
npx prisma studio

# 5. Suba o servidor e teste manualmente um fluxo crítico:
npm run dev
```
**Princípio:** backup não testado não é backup. Sempre confirme o restore antes de confiar.

---

## 3. Operações administrativas

### 3.1 Credencial seed e primeiro login

| Campo | Valor |
|-------|-------|
| E-mail | `admin@solentis.local` |
| Senha  | `Admin@123` |
| Perfil | Gestor |

⚠️ **O sistema obriga troca de senha no primeiro login.**
Esta credencial é apenas para o acesso inicial — nunca use em produção sem trocar.

Para recriar a credencial seed (se perdida):
```bash
npx prisma migrate reset
# (apaga tudo e roda o seed novamente)
```

### 3.2 Anonimizar usuário (LGPD — direito ao esquecimento)
Nunca delete o registro — ele pode ter dados operacionais vinculados (leituras, análises, ocorrências).
Em vez disso, substitua os campos pessoais:

| Campo  | Valor após anonimização |
|--------|------------------------|
| `name`  | `Usuário removido` |
| `email` | `{cuid}@deleted.solentis.local` |
| `password_hash` | hash de string aleatória (bloqueia acesso) |
| `is_active` | `false` |

Script de anonimização: será criado na Fase 11 (Auditoria + hardening).

---

## 4. Diagnóstico

### 4.1 Onde estão os logs
- **Servidor Next.js:** output do terminal onde `npm run dev` está rodando
- **Erros de runtime:** console do navegador (F12 → Console)
- **Queries do banco:** Prisma Studio → aba Console (SQL)
- **Logs de auditoria:** tabela `audit_logs` no banco (visível no Prisma Studio)

### 4.2 Resolução de problemas comuns

**Porta 3000 já em uso:**
```bash
# Windows — descubra o processo:
netstat -ano | findstr :3000
# Encerre pelo PID encontrado:
taskkill /PID <numero-pid> /F
```

**"Cannot find module '@/generated/prisma'":**
```bash
npx prisma generate
# O cliente gerado não está no Git — precisa ser gerado localmente.
```

**Banco corrompido ou em estado inconsistente:**
```bash
npx prisma migrate status   # veja o estado das migrations
npx prisma migrate reset    # ⚠️ reseta tudo (só em dev)
```

**Erro "Environment variable not found: DATABASE_URL":**
- Verifique se o arquivo `.env` existe na raiz do projeto
- Verifique se contém: `DATABASE_URL="file:./dev.db"`
- O `.env` não está no Git — recrie manualmente se necessário (veja `.env.example`)

---

## 5. Manutenção

### 5.1 Atualizar dependências (com cautela)
```bash
# Ver o que está desatualizado:
npm outdated

# Atualizar uma dependência específica (mais seguro):
npm install <pacote>@latest

# Após atualizar, sempre:
npm run build   # confirmar que não quebrou nada
npm run lint    # confirmar que não há erros de lint
```
⚠️ Nunca rode `npm update` ou `npm audit fix --force` sem testar depois — pode quebrar a build.

### 5.2 Limpar caches (se o servidor estiver se comportando de forma estranha)
```bash
# Limpar cache do Next.js:
Remove-Item -Recurse -Force .next

# Limpar node_modules e reinstalar (caso extremo):
Remove-Item -Recurse -Force node_modules
npm install
npx prisma generate   # necessário após reinstalar
```
