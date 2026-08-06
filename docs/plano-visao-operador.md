# Refatoração da visão do operador — Solentis

Data: 05/08/2026
Base: prints do piloto (celular do operador) + leitura do código em `vgabrielsilva2015-creator/solentis-web@main`.
Uso: salvar em `docs/plano-visao-operador.md` no repo e executar fase a fase no Claude Code, na ordem. Cada fase é pequena e tem critério de aceite.

---

## 1. Diagnóstico (o que os prints e o código mostram)

### 1.1 Turnos: o teste dos 3 turnos abertos

O que aconteceu no teste: você abriu Tarde e Noite às 15:38 (os dois ficaram "Aberto"), com um terceiro Tarde já aberto pelo Adenilson às 14:45. E o dashboard mostrou "Turno ativo: Noite · Em andamento" às 15:40 da tarde.

Causas, no código:

1. **Não existe regra "1 turno aberto por operador".** O `abrirTurno` em `src/app/operador/turnos/actions.ts` só bloqueia duplicado do MESMO período (`tenant + shift_id + date`). Períodos diferentes passam, então Tarde + Noite pelo mesmo operador é aceito.
2. **Não existe validação de janela de horário.** Nada impede abrir o turno da Noite (22:00–06:00) às 15:38.
3. **Dois "Tarde" abertos ao mesmo tempo** só é possível se: (a) o índice `prisma/sql/add_unique_open_shift.sql` nunca foi aplicado no banco de produção (ele precisa ser rodado manualmente, o próprio comentário do arquivo diz isso), ou (b) existem dois cadastros de turno chamados "Tarde" no tenant do piloto. Precisa verificar os dois (Fase 0).
4. **"Turno ativo" no dashboard = último aberto.** O `page.tsx` do dashboard pega a instância com `orderBy: { opened_at: 'desc' }`. Como Noite foi o último clique, ele vira o "ativo", mesmo às 15:40.

Na UI, o sintoma: a tela Turnos vira 3 cards quase idênticos, cada um com um botão "Iniciar passagem de turno" ou "Iniciar passagem deste turno". O operador não tem como saber qual é o dele, qual é para receber e o que cada botão faz. A própria seção se chama "Meu turno ativo" (singular) e lista dois.

### 1.2 Foto da leitura: ENOENT '/var/task/uploads'

Causa exata em `src/lib/storage.ts`: o `saveUpload` usa Vercel Blob quando `BLOB_READ_WRITE_TOKEN` existe; sem o token, cai para disco local (`process.cwd()/uploads`). Na Vercel o filesystem da função é somente leitura (`/var/task`), daí o `ENOENT: mkdir`. Conclusão: **o token do Blob não está definido (ou não está exposto) no ambiente de Production**. O código do Blob já existe e funciona, é configuração de deploy, não bug de lógica.

Dois problemas de produto por cima:

- O erro cru do Node vazou para a tela do operador. Erro de infra nunca pode aparecer assim.
- A foto é opcional, mas a falha dela derruba o registro da leitura inteira. Operador perde o valor que digitou.

### 1.3 Layout e entendimento

- **Dashboard**: o alerta vermelho de estoque abaixo do mínimo é a primeira coisa da tela, mas é problema do gestor, não a prioridade do operador chegando no turno. Card grande de "Nenhuma tarefa atribuída" (vazio ocupando o espaço nobre). Dois cards zerados ("0 Leituras hoje", "0 Ocorrências em aberto") que não dizem nada. Seção "Atalhos" que repete a bottom nav item por item.
- **Leituras**: "Limite: 5 – 12 adimensional" em fonte mono parece log de debug; "adimensional" é jargão de laboratório; "Leitura Avulsa (fora do cronograma)" é frase de sistema. O botão "Registrar" é um link pequeno dentro de um card grande.
- **Ocorrências**: formulário longo com 3 selects nativos obrigatórios. Difícil com luva, sol e pressa.
- **Geral**: texto secundário cinza sobre fundo quase preto reprova contraste (ruim sob sol), alvos de toque pequenos, "Olá, vitor" com nome minúsculo.

---

## 2. Regras de negócio do turno (decidir antes de codar)

Estas são as regras que o servidor passa a garantir. A UI nova (seção 4) só funciona se elas existirem.

1. **Um operador tem no máximo 1 turno ativo.** Garantido no banco com índice único parcial (Fase 1), não só na aplicação.
2. **Só se abre turno na janela dele.** Tolerância de X minutos antes do início (sugestão: 60, configurável depois). Fora disso, recusa com mensagem clara. Atenção ao `crosses_midnight` da Noite.
3. **Uma instância ativa por período por dia.** Já existe o índice `uniq_shift_instance_ativa` em `prisma/sql/`, mas precisa estar aplicado em produção (Fase 0 confirma).
4. **O caminho normal de abrir turno é receber a passagem.** "+ Abrir turno" livre deixa de ser o fluxo do dia a dia; fica só para o primeiro turno do dia (sem antecessor). O resto vira "Receber turno", em cima do `ShiftHandover` que já existe (com timeout e aceite modelados, isso está bom).
5. **Estados continuam os de hoje** (SCHEDULED → OPEN → HANDOVER_PENDING → CLOSED), mas o operador nunca vê esses nomes: vê "seu turno", "aguardando você receber", "encerrado".
6. **Dois operadores no mesmo período**: fora do escopo agora. Se um dia precisar, o modelo pede "participantes" na instância em vez de um `opened_by` único. Anotado na seção 7.

---

## 3. Fotos: correção definitiva

1. **Config (hoje, sem código)**: no painel da Vercel, Storage > Blob, confirmar que existe um store conectado ao projeto; em Settings > Environment Variables, confirmar `BLOB_READ_WRITE_TOKEN` presente em **Production** (e Preview). Redeploy e testar.
2. **Código**: em `storage.ts`, quando `process.env.VERCEL` existe e o token não, lançar erro de configuração explícito ("storage não configurado") em vez de tentar `mkdir`. O form nunca mostra erro cru: toda falha de upload vira mensagem amigável.
3. **Comportamento**: leitura salva mesmo se a foto falhar. Fluxo: grava a leitura, tenta a foto; se falhar, mantém a leitura, mostra "Não deu para enviar a foto. A leitura foi salva; você pode anexar depois no histórico" e oferece anexar na tela de detalhe da leitura.
4. Conferir se a compressão client-side (patch anterior de fotos) está aplicada e ativa nesse form de leitura. É problema separado do ENOENT (compressão é cliente, ENOENT é servidor), mas os dois precisam estar ok.

---

## 4. Nova visão do operador, tela a tela

Princípios (valem para tudo): uma pergunta por tela; ação primária única, grande, na zona do polegar; alvo de toque mínimo de 48 px; fonte base 16 px ou mais; linguagem de gente, sem jargão de sistema; estado vazio nunca ocupa o topo; erro sempre diz o que fazer em seguida.

### 4.1 Home do operador

Ordem por prioridade de quem chega no campo:

1. **Cartão do meu turno** (ou, se não tenho turno, o convite contextual: "Receber turno da Tarde de Adenilson" / "Assumir turno da Tarde"). Estado + uma ação. É a primeira coisa da tela.
2. **"Agora"**: lista curta e acionável. Coletas pendentes do dia (tap no item já abre o registro), tarefas do turno se houver. É a lista de trabalho, não um resumo.
3. **Alertas só se o operador puder agir.** Estoque abaixo do mínimo vira um item discreto com ação ("Registrar contagem") ou sai da home do operador e fica com o gestor.

Morre: seção "Atalhos" (duplica a bottom nav), os dois cards zerados, o card gigante de "Nenhuma tarefa atribuída". Ajuste pequeno: capitalizar o nome no "Olá, Vitor".

### 4.2 Turnos

A tela responde uma pergunta só: **qual é a minha situação agora?**

- **Sem turno**: um card único, escolhido pelo horário atual ("São 15:40 · período da Tarde") com a ação certa: "Assumir turno da Tarde", ou "Receber turno de Adenilson" se há passagem pendente para mim.
- **Com turno**: card do meu turno com tempo decorrido, mini resumo (leituras 1/2, ocorrências 0) e a ação "Passar turno".
- "Ver escala" e histórico viram links secundários embaixo. Nunca mais 3 cards iguais competindo.

### 4.3 Passagem de turno (wizard de 3 passos)

1. **Resumo automático**: o app monta (leituras feitas e pendentes, ocorrências abertas, saídas de estoque, tarefas). O operador só confere. O `checklist_data` do `ShiftHandover` já foi pensado para isso; conferir o que já é preenchido hoje e completar.
2. **Observações e destinatário**: campo de texto (o teclado do celular já dá voz), e para quem passa (lista dos operadores do próximo período; a escala pré-seleciona).
3. **Confirmar.** Do outro lado, quem recebe vê "Receber turno" com o mesmo resumo + observações, aceita, e o turno dele abre no ato. O timeout que já existe (`handover_timeout_minutes`) continua, com contagem visível para quem recebe.

### 4.4 Leituras

- O card pendente inteiro é o botão (não um link "Registrar" pequeno). Tap → campo numérico grande, teclado numérico, faixa esperada em texto normal ("Esperado: entre 5 e 12"), feedback verde/vermelho instantâneo (o "Dentro do limite" de hoje está certo, mantém).
- Caso feliz em 2 toques: valor → Salvar. Foto e observação ficam como opcionais visualmente secundários.
- Foto pode ser anexada depois (seção 3.3).
- Somem da UI do operador: fonte mono, "adimensional" (unidade só aparece quando existe: mg/L, °C).

### 4.5 Ocorrências

- Selects nativos viram botões grandes: Tipo como cards com ícone, Severidade como 4 botões coloridos com uma linha de descrição cada, Ponto de coleta como chips.
- Dividir em 2 passos para não assustar: primeiro "o que aconteceu" (descrição + tipo + severidade), depois detalhes (ponto, ação imediata, fotos).

### 4.6 Copy: antes → depois

| Hoje | Proposto |
|---|---|
| Iniciar passagem de turno | Passar turno |
| Iniciar passagem deste turno | Receber este turno |
| + Abrir turno | Assumir turno (contextual) |
| Leitura Avulsa (fora do cronograma) | Registrar outra leitura |
| Nenhuma tarefa atribuída a este turno. | Sem tarefas neste turno. Suas coletas do dia estão em Leituras. |
| ENOENT: no such file... | Não deu para enviar a foto. A leitura foi salva; anexe de novo pelo histórico. |
| Limite: 5 – 12 adimensional | Esperado: entre 5 e 12 |

### 4.7 Acessibilidade e uso em campo

- Subir o contraste dos textos cinza secundários para no mínimo 4.5:1 (hoje reprovam sobre o fundo escuro; sob sol fica ilegível).
- Alvos ≥ 48 px e espaçamento entre ações para dedo com luva.
- Números grandes nos campos de valor (o input do print já está no caminho certo).
- Opcional (Fase 6): tema claro automático em turno diurno, escuro à noite. Combina com a rotina da ETE.

---

## 5. Plano de execução (fases pequenas, na ordem)

Cada fase cabe numa sessão de Claude Code. Não pular a Fase 0 nem a 1: a UI nova sem as regras no servidor só esconde o problema.

### Fase 0 — Estancar (hoje, quase sem código)

- 0.1 Configurar o Blob em Production (seção 3.1) e redeploy. **Aceite**: registrar leitura com foto pelo celular sem erro; o registro guarda uma URL `https://`.
- 0.2 Confirmar que `uniq_shift_instance_ativa` existe no banco de produção: `select indexname from pg_indexes where tablename = 'shift_instances';` no SQL Editor do Supabase. Se não existir, rodar `prisma/sql/add_unique_open_shift.sql`. **Aceite**: segunda tentativa de abrir o mesmo período falha com a mensagem que já existe.
- 0.3 Verificar se o tenant do piloto tem dois turnos cadastrados como "Tarde" (explicaria os dois "Tarde" abertos). Se sim, desativar o duplicado.
- 0.4 Encerrar os turnos zumbis abertos no teste de hoje.

### Fase 1 — Regras de turno no servidor

- 1.1 Antes do índice novo: conferir em `confirmarPassagem`/`assumirPosto` como o responsável fica registrado (a instância troca de `opened_by` ou nasce instância nova para quem recebe). Depois, migração SQL:

```sql
CREATE UNIQUE INDEX IF NOT EXISTS uniq_turno_ativo_por_operador
  ON shift_instances (opened_by)
  WHERE status IN ('OPEN', 'HANDOVER_PENDING');
```

SCHEDULED fica de fora de propósito (o cron pré-cria instâncias). Tratar a violação do unique em `abrirTurno`, `assumirPosto` e `confirmarPassagem` com mensagem clara: "Você já tem um turno aberto. Passe o turno atual antes de abrir outro."
- 1.2 Validação de janela em `abrirTurno`: recusar fora do horário do período, com tolerância de 60 min antes do início; tratar `crosses_midnight`. Mensagem: "O turno da Noite começa às 22:00. Você pode abrir a partir das 21:00."
- 1.3 `storage.ts`: sem fallback de disco quando `process.env.VERCEL` existe; erro de configuração explícito; nenhum erro cru chega no form.
- 1.4 Leitura salva mesmo com falha de foto + anexar depois (seção 3.3).

**Aceite da fase**: impossível reproduzir o print dos 3 turnos; Noite às 15:38 é recusada com a mensagem certa; falha de foto nunca mostra stack e nunca perde a leitura.

### Fase 2 — Turnos + Home novas (UI)

- Tela Turnos contextual (seção 4.2), Home reordenada (4.1), remoção de Atalhos e cards vazios. Componente central: card de turno com três estados (sem turno / meu turno / receber turno).

**Aceite**: teste de corredor com um operador real: ele explica em voz alta o que cada tela faz, sem ajuda.

### Fase 3 — Passagem de turno (wizard)

- Os 3 passos da seção 4.3, resumo automático montado pelo servidor, tela de "Receber turno" com aceite e timeout visível. Aproveitar `ShiftHandover` existente.

**Aceite**: passagem completa Tarde → Noite entre dois usuários de teste em menos de 2 minutos.

### Fase 4 — Leituras

- Card-botão, teclado numérico, copy nova, faixa esperada legível, "Registrar outra leitura", anexar foto depois.

**Aceite**: registrar as 2 coletas do dia em menos de 30 segundos cada, no celular, de preferência com luva.

### Fase 5 — Ocorrências

- Botões no lugar dos selects, 2 passos, severidade visual.

**Aceite**: abrir uma ocorrência de teste em menos de 1 minuto usando só o polegar.

### Fase 6 — Polimento

- Contraste, alvos de toque, estados vazios restantes, revisão final de copy, "Olá, Vitor" capitalizado, tema claro/escuro por horário (opcional).

---

## 6. Validação no piloto (antes e depois)

Pedir para o operador do piloto executar 4 missões sem ajuda, cronometrando e anotando onde ele trava:

1. Assumir o turno.
2. Registrar uma coleta com foto.
3. Abrir uma ocorrência.
4. Passar o turno.

Rodar uma vez agora (linha de base com as telas atuais) e de novo após a Fase 4. Guardar os tempos: é o antes/depois que prova a refatoração e ainda rende material para demo comercial.

---

## 7. Fora do escopo agora (anotado para não perder)

- Dois operadores simultâneos no mesmo período (pede modelo de participantes na instância de turno).
- Offline completo das telas novas (o PWA já cobre parte; revisar depois da Fase 4).
- Tema claro automático (Fase 6, opcional).
