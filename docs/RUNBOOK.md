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

### 2.2 Fazer backup (script automatizado)
```bash
npx tsx scripts/backup.ts
```
Cria `backups/solentis-AAAA-MM-DD.db` (pasta ignorada pelo Git).
O script verifica a existência do banco de origem e imprime o tamanho do arquivo gerado.

**Recomendação de agendamento (produção):** configure um cron diário:
```
# Exemplo crontab (Linux/macOS) — 02:00 todo dia
0 2 * * * cd /caminho/do/projeto && npx tsx scripts/backup.ts >> logs/backup.log 2>&1
```
No Windows, use o **Agendador de Tarefas** ou o Windows Task Scheduler.

**Recomendação de infraestrutura:** use um **no-break (UPS)** no servidor que hospeda o banco.
Quedas de energia durante uma escrita SQLite podem corromper o arquivo `dev.db`.
O backup diário protege apenas contra corrupção silenciosa descoberta depois — não substitui UPS.

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

### 2.4 Checklist de teste de restore
Execute este procedimento ao validar um backup antes de colocá-lo em uso:
- [ ] Servidor parado (`Ctrl+C`)
- [ ] `Copy-Item backups\solentis-AAAA-MM-DD.db prisma\dev.db` executado
- [ ] `npx prisma migrate status` — mostra "All migrations have been applied"
- [ ] `npx prisma studio` — tabelas `users`, `readings`, `shift_handovers` visíveis com dados
- [ ] `npm run dev` — servidor sobe sem erro na porta 3000
- [ ] Login com `tecnico@solentis.local` funciona
- [ ] Página `/tecnico/equipamentos` lista pelo menos um equipamento

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

---

## 6. Testes manuais dos cenários críticos (Briefing seção 5)

Os cenários abaixo não são cobertos por Vitest porque dependem de comportamento de browser
ou de infraestrutura externa. Execute-os manualmente antes de cada deploy.

---

### Cenário 1 — localStorage: rascunho de formulário sobrevive ao fechar a aba

**Pré-condição:** servidor rodando (`npm run dev`), usuário `operador@solentis.local` logado.

1. Acesse `/operador/leituras/nova`
2. Selecione um ponto de coleta e preencha o campo de data/hora
3. Feche a aba do navegador **sem submeter**
4. Reabra `http://localhost:3000/operador/leituras/nova`

**Critério de aceite:** os campos preenchidos no passo 2 aparecem automaticamente.

Repita para:
- `/operador/ocorrencias/nova` (campo Descrição)
- `/tecnico/analises/nova` (campo Valor medido)

---

### Cenário 2 — Reconexão automática: sessão persiste após queda de rede

**Pré-condição:** servidor rodando, usuário logado no Chrome.

1. Abra qualquer página autenticada (ex.: `/operador/dashboard`)
2. Desconecte o cabo de rede ou desative o Wi-Fi por 30 segundos
3. Reconecte a rede
4. Recarregue a página (`F5`)

**Critério de aceite:** a página carrega normalmente sem redirecionar para `/login`.
O token JWT está no cookie — sessões já estabelecidas sobrevivem a interrupções de rede.

> **Nota:** se o servidor Next.js reiniciar durante a queda, o usuário precisará logar novamente
> (comportamento esperado — sem modo offline no MVP).

---

### Cenário 4 — Recomendação de no-break (infraestrutura)

Este cenário é de infraestrutura, não de software. Documente-o como procedimento operacional:

**Risco:** queda de energia durante escrita no SQLite pode corromper `prisma/dev.db`.

**Mitigações implementadas:**
- Script `scripts/backup.ts` para backup diário do banco
- Checklist de restore documentado na seção 2.4

**Ação recomendada para produção:**
- Instalar no-break (UPS) no servidor que hospeda o banco
- Configurar script de backup no cron (ver seção 2.2)
- Testar restore completo mensalmente (ver checklist 2.4)
- Manter pelo menos 7 backups rotacionados antes de deletar os mais antigos

---

## 7. Limitações conhecidas de sessão (JWT)

### 7.1 Não usar 2 perfis na mesma janela do navegador

**Causa:** o Solentis usa JWT armazenado em cookie HTTP. O browser compartilha o mesmo cookie entre TODAS as abas da mesma origem (localhost:3000 ou o domínio em produção). Isso significa:

- Tab 1 logada como Gestor → cookie contém JWT do Gestor
- Tab 2 navega para `/login` → o middleware detecta a sessão do Gestor e redireciona para `/gestor/dashboard`
- Tab 2 NÃO consegue logar como Operador sem que o Gestor faça logout primeiro

**Comportamento esperado (não é bug):** ao acessar um perfil diferente, o sistema mostrará os dados do perfil logado, não do perfil desejado.

**Procedimento correto para testar múltiplos perfis:**
1. Use **abas anônimas/privadas** separadas (cada aba anônima tem cookies isolados)
2. OU use **perfis diferentes do Chrome/Firefox** (cada perfil tem cookies separados)
3. OU faça logout completo (`Sair`) antes de logar com outro perfil na mesma janela

**Por que o MANAGER aparece em páginas do Operador/Técnico:** o MANAGER tem permissão para acessar rotas `/operador/*` e `/tecnico/*` (para monitoramento). Ao navegar para essas rotas, o MANAGER vê o seu próprio nome (ex.: "Administrador") no layout, o que é comportamento correto.

### 7.2 Expiração de sessão por perfil

| Perfil | Duração da sessão |
|--------|-------------------|
| Operador | 30 minutos |
| Técnico / Gestor | 60 minutos |

Após a expiração, o usuário é redirecionado para `/login` na próxima navegação protegida.
