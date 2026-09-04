# Handoff de implementação — Nova visão do operador

Data: 05/08/2026
Par: `docs/plano-visao-operador.md` (o porquê) + `docs/prototipo-visao-operador.html` (o como fica, aprovado).
Este arquivo: os prompts prontos para o Claude Code, fase a fase.

## Como usar

1. Commite os três documentos no repo antes de começar:
```bash
git add docs/plano-visao-operador.md docs/prototipo-visao-operador.html docs/handoff-visao-operador.md
git commit -m "docs: plano, protótipo e handoff da nova visão do operador"
```
2. Uma fase por sessão do Claude Code. Cola o prompt inteiro, deixa ele trabalhar, revisa o diff, commita, e você mesmo testa no celular com o checklist "Você testa" antes de ir para a próxima.
3. A Fase 0 é sua, manual, sem Claude Code. Faça ela hoje: ela destrava o piloto mesmo antes de qualquer código.

Regras que valem para todas as fases (os prompts repetem, mas fica o registro): commits pequenos com Conventional Commits em português; nenhuma query sem filtro de tenant; validação de papel por página continua; nada de cor em hex solto, sempre token do `globals.css`; textos de UI exatamente como no protótipo e na tabela de copy do plano.

---

## Fase 0 — Manual, hoje (sem Claude Code)

**0.1 Blob em produção.** Painel da Vercel → Storage → Blob: confirme que existe um store conectado ao projeto. Em Settings → Environment Variables, confirme `BLOB_READ_WRITE_TOKEN` em Production e Preview. Se criou/mudou algo, redeploy. Teste: registrar uma leitura com foto pelo celular; o erro ENOENT some.

**0.2 Índice de turno único por período.** No SQL Editor do Supabase:
```sql
select indexname from pg_indexes where tablename = 'shift_instances';
```
Se `uniq_shift_instance_ativa` não aparecer, rode o conteúdo de `prisma/sql/add_unique_open_shift.sql`.

**0.3 Turno "Tarde" duplicado.** Ainda no SQL Editor:
```sql
select id, name, start_time, end_time, is_active, tenant_id
from shifts order by tenant_id, name;
```
Se o tenant do piloto tiver dois "Tarde", desative o duplicado (pela tela do gestor, de preferência).

**0.4 Fechar os turnos zumbis do teste.** Primeiro veja o que existe:
```sql
select id, shift_id, opened_by, opened_at, status
from shift_instances
where status in ('OPEN','HANDOVER_PENDING')
order by opened_at;
```
Feche pelo app (passando/encerrando) ou, se preferir SQL, feche só os ids listados acima:
```sql
update shift_instances set status = 'CLOSED', closed_at = now()
where id in ('<id1>', '<id2>');
```

---

## Fase 1 — Regras de turno e storage no servidor (sem UI)

**Prompt para o Claude Code:**

```text
Leia antes de tudo: docs/plano-visao-operador.md (seções 2 e 3) e docs/handoff-visao-operador.md (Fase 1). Nesta fase não mexa em nenhuma tela; só servidor, schema SQL e testes.

1. Crie prisma/sql/add_unique_turno_por_operador.sql no mesmo padrão do add_unique_open_shift.sql (comentário explicando, IF NOT EXISTS, instrução de aplicar manualmente):
   CREATE UNIQUE INDEX IF NOT EXISTS uniq_turno_ativo_por_operador
     ON shift_instances (opened_by)
     WHERE status IN ('OPEN', 'HANDOVER_PENDING');
   SCHEDULED fica de fora de propósito (o cron pré-cria instâncias).

2. Em src/app/operador/turnos/actions.ts, nas três ações que criam/promovem instância ativa (abrirTurno, confirmarPassagem, assumirPosto): antes de criar, verifique se o usuário já tem instância com status OPEN ou HANDOVER_PENDING e, além disso, trate a violação de unique do Postgres (Prisma P2002) vinda do índice novo. Nos dois casos a resposta é o erro de formulário: "Você já tem um turno aberto. Passe o turno atual antes de abrir outro." Em confirmarPassagem, a mensagem é: "Você já tem um turno aberto. Passe o seu turno antes de receber este."

3. Validação de janela de horário em abrirTurno: extraia uma função pura (ex.: src/lib/shift-window.ts) que recebe start_time, end_time (strings "HH:mm"), crosses_midnight e a data/hora atual, e responde se o turno pode ser aberto agora, com tolerância de 60 minutos antes do início. Fora da janela, abrirTurno retorna: "O turno da {nome} começa às {start_time}. Você pode abrir a partir das {start_time - 60min}." Escreva testes vitest da função pura cobrindo: dentro da janela, tolerância, fora, e o turno que cruza a meia-noite (22:00–06:00) testado às 23:30 e às 05:30.

4. Em src/lib/storage.ts: quando process.env.VERCEL existir e BLOB_READ_WRITE_TOKEN não, lance um erro de configuração explícito ("Storage de arquivos não configurado (BLOB_READ_WRITE_TOKEN ausente)") em vez de cair para disco local. O fallback de disco continua valendo só em desenvolvimento local.

5. Em src/app/operador/leituras/actions.ts: a leitura é salva mesmo se a foto falhar. Ordem: valida e grava a Reading; depois tenta saveImageUpload; se o upload lançar, NÃO desfaça a leitura; retorne sucesso parcial com aviso "Não deu para enviar a foto. A leitura foi salva; você pode anexar depois pelo histórico." Nenhum erro cru (ENOENT, stack) pode chegar ao formulário: toda exceção de upload vira essa mensagem.

Restrições: não altere schema.prisma nesta fase (o índice é SQL manual, padrão do repo); mantenha filtro de tenant em toda query; rode npm run test:run ao final. Commits pequenos, Conventional Commits em português (ex.: "fix(turnos): impede segundo turno aberto pelo mesmo operador").
```

**Você testa:** aplicar o SQL novo em produção (mesmo comando do 0.2); tentar abrir Tarde e depois Noite → segunda recusada com a mensagem; tentar abrir Noite às 15h → recusada citando 21:00; derrubar o token do Blob em preview e registrar leitura com foto → leitura salva, aviso amigável, sem stack.

---

## Fase 2 — Home + Turnos (UI)

**Prompt para o Claude Code:**

```text
Leia antes: docs/prototipo-visao-operador.html (abas Home e Turnos, incluindo os textos "O que mudou"), docs/plano-visao-operador.md (seções 4.1, 4.2, 4.6 e 4.7). O protótipo é a referência visual e de copy: reproduza layout, hierarquia e textos.

1. src/app/operador/dashboard/page.tsx (Home): reordene para (a) card do turno com um único estado e chips de resumo (coletas, ocorrências, tarefas), (b) seção "Agora" com as coletas pendentes e tarefas pendentes como cards inteiramente clicáveis que levam direto ao registro, (c) linha discreta de estoque abaixo do mínimo com ação "Registrar contagem" no fim. Remova: a seção Atalhos, os dois cards de contagem zerada e o card grande de "Nenhuma tarefa atribuída" (vira uma linha "Sem tarefas neste turno." quando vazio). "Olá, {nome}" com o nome capitalizado.

2. O "turno ativo" do dashboard passa a ser a instância ativa DO USUÁRIO (opened_by = usuário logado, status OPEN ou HANDOVER_PENDING), não mais a última aberta do tenant. Sem turno do usuário: o card vira o convite contextual (assumir ou receber), igual à aba Turnos.

3. src/app/operador/turnos/page.tsx: substitua a lista de cards pelo card único contextual com três estados, como no protótipo: sem turno (com "São {hora} · período da {nome}" e CTA "Assumir turno da {nome}", mais a linha "O turno da {próximo} abre a partir das {hh:mm}"), meu turno (chips + CTA "Passar turno"), e passagem aguardando o usuário (CTA "Receber turno" + "Ver resumo da passagem", com "expira em {tempo}"). "Ver escala" e "Histórico" viram links secundários. O estado é decidido no servidor com as regras da Fase 1.

4. Componha um componente compartilhado de card de turno (os três estados) usado pela Home e pela tela Turnos.

Padrões visuais (valem também para as próximas fases): só tokens do globals.css (crie tokens novos lá se o protótipo usar cor que não existe, ex. fundos translúcidos de sucesso/alerta); botões de ação com min-height 54px; alvos de toque >= 48px; texto secundário com contraste >= 4.5:1 sobre o fundo escuro (suba o tom do cinza atual); copy exatamente como no protótipo. Não mexa em telas de gestor. Commits pequenos em português.
```

**Você testa:** teste de corredor com o operador do piloto: ele explica em voz alta o que a Home e a tela Turnos fazem, sem ajuda; os três estados aparecem certos conforme a situação real do turno.

---

## Fase 3 — Passagem de turno (wizard)

**Prompt para o Claude Code:**

```text
Leia antes: docs/prototipo-visao-operador.html (aba "Passar turno" e o 3º estado da aba Turnos) e docs/plano-visao-operador.md (seção 4.3). Backend de passagem já existe (iniciarPassagem, confirmarPassagem, ShiftHandover com checklist_data e timeout): o trabalho é UX por cima, com o mínimo de mudança de servidor.

1. src/app/operador/turnos/[id]/passagem: transforme o formulário em assistente de 3 passos com barra de progresso, como no protótipo. Passo 1: resumo montado pelo servidor (leituras feitas/pendentes com o nome do que falta, ocorrências abertas, saídas de estoque do turno, tarefas com contagem e adiadas). Confira o que iniciarPassagem já grava em checklist_data e complete o que faltar para cobrir esses quatro itens. Passo 2: observações (textarea) e destinatário em chips, com o operador escalado para o próximo período pré-selecionado (use a escala/ShiftScale; se não houver, lista dos operadores do tenant). Passo 3: confirmação com recap + a linha "{nome} recebe uma notificação e tem até as {hh:mm} para aceitar. Se não aceitar, o turno volta para você." derivada do timeout_at.

2. Tela de receber (quem entra): mesmo resumo + observações de quem saiu, contagem regressiva do timeout, campo de observações de entrada opcional e CTA "Receber turno" chamando confirmarPassagem. Estados de erro da Fase 1 aparecem como mensagem no card, nunca como texto técnico.

3. Sucesso dos dois lados igual ao protótipo ("Turno passado", "Aguardando {nome} receber. Expira às {hh:mm}").

Sem mudanças de schema. Tokens, alvos e copy conforme padrões da Fase 2. Commits pequenos em português.
```

**Você testa:** passagem completa Tarde → Noite entre dois usuários de teste em menos de 2 minutos, incluindo o aceite do outro lado; o resumo do passo 1 bate com o que realmente aconteceu no turno.

---

## Fase 4 — Leituras

**Prompt para o Claude Code:**

```text
Leia antes: docs/prototipo-visao-operador.html (aba Leituras, os dois estados: lista e registro) e docs/plano-visao-operador.md (seções 4.4 e 4.6).

1. Lista (src/app/operador/leituras): cada coleta pendente vira um card inteiramente clicável (some o link "Registrar" pequeno), com "Esperado: entre {min} e {max}" em texto normal (nada de fonte mono nem "adimensional"; unidade só aparece quando existir, ex. mg/L). Barra de progresso do dia como já existe. "Leitura Avulsa (fora do cronograma)" vira o botão fantasma "+ Registrar outra leitura". Coleta feita permanece na lista com estado concluído (valor, dentro/fora, hora).

2. Registro: campo de valor grande (fonte display, inputmode="decimal", aceita vírgula, conforme o preprocess já existente), feedback instantâneo "Dentro do limite" / "Fora do limite (min a max)" enquanto digita, foto e observação como linhas opcionais visivelmente secundárias, CTA "Salvar leitura". Sob o bloco de foto, a linha: "Se a foto falhar, a leitura é salva mesmo assim; você pode anexar depois pelo histórico." Tela de sucesso com atalho "Próxima coleta: {nome}" quando houver pendente.

3. Anexar depois: no histórico/detalhe da leitura sem foto, ação "Anexar foto" usando o mesmo pipeline de upload (a regra de servidor da Fase 1 já garante que a leitura nunca se perde).

4. Valor fora do limite salvo: além do registro, ofereça na tela de sucesso o atalho "Abrir ocorrência com estes dados" pré-preenchendo ponto e descrição.

Padrões visuais e de copy das fases anteriores. Commits pequenos em português.
```

**Você testa:** registrar as 2 coletas do dia em menos de 30 segundos cada, no celular, com 7,2 e depois um valor fora do limite; conferir o atalho de ocorrência; simular falha de foto e anexar depois pelo histórico.

---

## Fase 5 — Tarefas do turno

**Prompt para o Claude Code:**

```text
Leia antes: docs/prototipo-visao-operador.html (aba Tarefas e o item de tarefa na Home). O modelo já tem tudo: ShiftTask com requires_photo, occurrence_id, completion_notes, e repetirTarefa com repeat_reason.

1. src/app/operador/turnos/[id]/tarefas: lista conforme o protótipo, com progresso no topo ("{x} de {y} feitas", adiadas contadas à parte). Card da tarefa expande ao toque mostrando descrição, bloco de foto quando requires_photo (reaproveite o fluxo atual de concluirTarefa + shift-task-photos, que exige a foto para concluir) e duas ações: "Concluir tarefa" (primária) e "Deixar para o próximo turno".

2. "Deixar para o próximo turno" substitui o pular seco na UI: abre um campo de motivo obrigatório e chama repetirTarefa (a tarefa atual sai da lista como "Deixada para a {próximo turno} · motivo: {motivo}" e renasce PENDING na próxima instância, comportamento que repetirTarefa já tem; se hoje ele não recebe motivo, adicione o parâmetro gravando em repeat_reason). pularTarefa deixa de ser chamado pela UI do operador; não remova a action.

3. Tarefa vinda de ocorrência (occurrence_id preenchido) mostra "criada a partir de uma ocorrência" e linka para ela.

4. Home: tarefas PENDING do turno ativo entram na lista "Agora" junto com as coletas (a Fase 2 deixou o espaço); tocar leva à tarefa já expandida.

5. Resumo da passagem (Fase 3): a linha de tarefas passa a detalhar "{x} de {y} · {n} deixada(s) para a {turno}" e lista os motivos para quem recebe.

Padrões visuais e de copy das fases anteriores. Commits pequenos em português.
```

**Você testa:** concluir uma tarefa com foto obrigatória; deixar outra para o próximo turno com motivo; conferir que ela aparece PENDING no turno seguinte e que o motivo saiu no resumo da passagem.

---

## Fase 6 — Ocorrências

**Prompt para o Claude Code:**

```text
Leia antes: docs/prototipo-visao-operador.html (aba Ocorrências, passos 1 e 2) e docs/plano-visao-operador.md (seção 4.5).

1. src/app/operador/ocorrencias (novo registro): divida em 2 passos. Passo 1 (obrigatórios): descrição, Tipo como grade de cards com ícone e legenda de uma linha (use os tipos já cadastrados no sistema), Severidade como 4 botões coloridos com descrição de uma linha (Baixa: sem impacto imediato / Média: acompanhar durante o turno / Alta: afeta o tratamento / Crítica: parada ou risco de não conformidade), mapeados às severidades existentes de OccurrenceSeverityDefault. Passo 2 (opcionais): ponto de coleta em chips, ação imediata, fotos até 3 com o pipeline de upload padrão. Nada de select nativo.

2. Sucesso conforme o protótipo, incluindo "O gestor foi notificado." quando a notificação existir para o caso.

3. Aceite os query params de pré-preenchimento vindos do atalho da Fase 4 (ponto e descrição).

Padrões visuais e de copy das fases anteriores. Commits pequenos em português.
```

**Você testa:** abrir uma ocorrência de teste em menos de 1 minuto só com o polegar; abrir outra pelo atalho de leitura fora do limite e conferir o pré-preenchimento.

---

## Fase 7 — Polimento e fechamento

**Prompt para o Claude Code:**

```text
Passada final na visão do operador (não toque nas outras áreas):

1. Varredura de contraste: nenhum texto abaixo de 4.5:1 sobre os fundos escuros nas telas do operador; ajuste os tokens de cinza, não caso a caso.
2. Varredura de alvos: nenhum elemento interativo com menos de 48px de altura nas telas do operador.
3. Varredura de copy: compare cada tela com a tabela "antes → depois" do docs/plano-visao-operador.md (4.6) e com o protótipo; nenhum texto técnico ou jargão sobrando ("adimensional", status internos, mensagens cruas).
4. Estados vazios e de carregamento das telas novas: uma linha discreta com próxima ação, nunca card gigante.
5. Opcional se sobrar fôlego: tema claro automático quando o turno ativo for diurno (o app já tem os dois temas no globals.css); atrás de uma preferência simples do usuário.
```

**Você testa:** rodar de novo as 4 missões cronometradas do plano (seção 6) com o operador do piloto e comparar com a linha de base. Esse antes/depois fecha a refatoração e ainda vira material de demo.
