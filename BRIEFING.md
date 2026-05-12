═══════════════════════════════════════════════════════════════
PROJETO: Sistema de Gestão de ETE (Estação de Tratamento de Efluentes)
DOCUMENTO: Briefing inicial + Contrato de colaboração
AUTOR: Vitor · Iniciante em programação · Windows
═══════════════════════════════════════════════════════════════

Quero construir um sistema web de gestão de ETE começando do zero nesta 
pasta vazia. Entendo lógica básica mas nunca usei Next.js. Leia este 
briefing inteiro antes de responder.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) CONTEXTO DO NEGÓCIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A ETE processa efluentes e hoje toda operação está em planilhas e 
cadernos físicos. Isso causa: perda de dados, falta de rastreabilidade, 
dificuldade em gerar relatórios pros órgãos ambientais, e demora em 
identificar não-conformidades. O sistema precisa atender a Resolução 
CONAMA 430/2011 e os requisitos do órgão ambiental estadual.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) PERSONAS (quem usa e como)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- OPERADOR: trabalha em turnos, faz leituras de campo (geralmente no 
  celular, às vezes com luvas, ambiente úmido). Precisa de telas grandes, 
  botões grandes, poucos cliques. Registra leituras, ocorrências, 
  passagem de turno.
- TÉCNICO: faz análises laboratoriais, aprova dados, gerencia 
  manutenções. Usa no desktop, precisa de tabelas e formulários ricos.
- GESTOR: acompanha indicadores, aprova relatórios, gerencia equipe e 
  usuários. Quer dashboards e exportações.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) GLOSSÁRIO (use sempre estes termos)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Análise: medição laboratorial (pH, DBO, DQO etc.) com método e laudo
- Leitura: medição de campo, simples (vazão, nível, observação visual)
- Ocorrência: evento anormal (vazamento, parada, odor, etc.)
- Não-conformidade: análise/leitura fora do limite legal
- Manutenção preventiva: agendada, periódica
- Manutenção corretiva: reativa, após falha
- Ponto de coleta: local físico onde se coleta amostra
- Turno: período de trabalho do operador (manhã/tarde/noite)
Mantenha esses nomes em tudo: rotas, tabelas, telas, textos.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4) FUNCIONALIDADES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
A. Análises de água com histórico, gráficos e alerta automático
B. Leituras de campo rápidas (mobile-first)
C. Equipamentos: cadastro, manutenção preventiva (auto-agenda a próxima) 
   e corretiva
D. Ocorrências com foto, severidade, prazo de resolução e responsável
   · Severidades: Baixa / Média / Alta / Crítica
   · Prazo sugerido automaticamente por severidade (defaults configuráveis
     pelo gestor): Crítica = 24h, Alta = 72h, Média = 7 dias, Baixa = 30 dias
   · Quem registra define o prazo; Técnico e Gestor podem ajustar após
   · Fotos salvas em /uploads (fora de /public) e servidas via rota
     autenticada — nunca acessíveis por URL direta
   · Limite: 5 MB por arquivo; formatos aceitos: jpg, png, webp
   · Migração para armazenamento em nuvem (S3 ou similar) fica pra v2.0

D.1 Origem dos dados (rastreabilidade obrigatória desde o MVP)
   Cada Leitura e cada Análise deve ter:
   · Campo 'origem' (enum: MANUAL | SENSOR | IMPORTACAO)
   · Campo opcional 'metadata_origem' (JSON com info de quem ou qual
     dispositivo gerou o dado)
   No MVP, origem é sempre MANUAL — schema já prevê os outros valores
   para evitar migração futura quando sensores forem integrados.

E. Turnos: abertura, passagem (2 etapas), fechamento, observações
   Configuração:
   · Gestor cadastra turnos: nome, hora início, hora fim, flag "cruza
     meia-noite". Seed inicial: Manhã 06h–14h / Tarde 14h–22h /
     Noite 22h–06h (editáveis/desativáveis pelo gestor)
   · Timeout de confirmação de passagem: 2h por padrão, configurável
     pelo gestor por turno
   Fluxo de passagem:
   · Etapa 1 — Turno SAINTE: registra entrega com checklist (leituras
     feitas, pendências, ocorrências em aberto, observações livres)
   · Etapa 2 — Turno ENTRANTE: confirma recebimento marcando o checklist
     e adicionando observações próprias (opcional)
   · Turno anterior só é oficialmente fechado após confirmação do entrante
   · Se confirmação não ocorrer dentro do timeout, gera alerta pro gestor
   Regra de imutabilidade:
   · Turno fechado é imutável por padrão para Operador e Técnico
   · Apenas GESTOR pode editar turno fechado, preenchendo obrigatoriamente
     o campo "justificativa" — registrado na trilha de auditoria

F. Parâmetros de qualidade (gerenciado pelo GESTOR)
   · CRUD completo: nome, unidade, limite mínimo, limite máximo,
     referência legal (texto), data de vigência
   · Versionamento dos limites: histórico de alterações para rastreabilidade
   · Seed inicial: pH, DBO, DQO, Sólidos Suspensos, Nitrogênio Amoniacal,
     Fósforo Total, Temperatura, Coliformes Termotolerantes
     (valores limite da Resolução CONAMA 430/2011)
   · Métodos de análise: lista fechada gerenciada pelo gestor; seed:
     APHA, SMEWW, NBR (gestor pode adicionar/editar via CRUD)
   · Categorias de equipamento: lista fechada gerenciada pelo gestor;
     seed: Bomba, Soprador, Medidor, Válvula, Decantador, Reator
   · Frequência de manutenção preventiva definida em DIAS

G. Permissões por perfil (Operador/Técnico/Gestor)
H. Dashboards por persona (cada um vê o que importa pra ele)
I. Relatórios exportáveis (PDF/Excel) — futuro
J. Auditoria: TODA alteração de dado guarda quem mudou, quando, valor 
   antes/depois (inclui edições de turno fechado com justificativa)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5) CASOS CRÍTICOS (cenários que TÊM que funcionar)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Queda de energia/rede → formulários em aberto são salvos como rascunho
  no localStorage do navegador e recuperados ao retornar
- Reconexão automática quando servidor volta (sem perda de sessão)
- Banco com integridade transacional (nenhuma gravação parcial)
- RUNBOOK inclui recomendação de no-break no servidor
- Análise fora do limite → alerta visível (badge + destaque vermelho) no
  dashboard do gestor e na lista de análises (sem e-mail/push no MVP)
- Tentativa de editar turno fechado sem ser GESTOR → bloqueio + log
- GESTOR edita turno fechado sem preencher justificativa → bloqueio
- GESTOR edita turno fechado com justificativa → permitido + auditoria
- Dois operadores tentando abrir o mesmo turno → impedir
- Equipamento com manutenção atrasada → destaque vermelho no dashboard
- Primeiro login com credencial provisória → sistema obriga troca de senha
- Login com perfil errado → mensagem clara, sem expor detalhes técnicos
- Importação de dado inválido → não corrompe banco, mostra erro

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6) STACK PROPOSTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Next.js 14+ (App Router) + TypeScript
- Tailwind CSS + shadcn/ui (componentes acessíveis)
- SQLite + Prisma (banco local no MVP; migrar pra PostgreSQL depois)
- NextAuth para login com perfis
- Zod para validação
- Recharts para gráficos
- date-fns para datas (em pt-BR)
Se discordar de algo, me diga ANTES de começar e justifique.

PRINCÍPIOS DE EXTENSIBILIDADE
- O sistema é desenhado para receber sensores no futuro
- Endpoints de criação de leitura/análise devem aceitar requisições
  autenticadas tanto de usuários humanos (sessão) quanto de máquinas
  (API key/token de sensor), com identificação clara da origem em ambos
- No MVP apenas autenticação por sessão é implementada; API key fica
  para v2.0, mas a arquitetura dos endpoints não muda entre versões

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7) PRINCÍPIOS DE QUALIDADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Idioma (convenção definida):
  · Nomes TÉCNICOS em inglês: tabelas, colunas, rotas de API, arquivos,
    classes, funções utilitárias (ex: users, analyses, shifts, readings)
  · Tudo voltado ao USUÁRIO em português-BR: textos de tela, mensagens
    de erro, validações, comentários, documentação, commits
- Mobile-first (operador usa no celular)
- Acessibilidade (WCAG AA: contraste, teclado, leitores de tela)
- Validação dupla: cliente (UX) + servidor (segurança)
- Tratamento de erro amigável, NUNCA mostrar stack trace
- Logs estruturados (não console.log solto)
- Cada regra crítica de negócio tem TESTE automatizado
- Performance: paginação em listas, lazy loading, cache onde fizer sentido
- LGPD: dados pessoais minimizados, com consentimento e direito de exclusão

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8) NÃO FAÇA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Não use bibliotecas obscuras, abandonadas, ou com <500 estrelas no GitHub
- Não me peça pra contratar serviços pagos no MVP
- Não invente funcionalidades fora do escopo — pergunte antes
- Não escreva código que você não saiba explicar pra um iniciante
- Não pule pra próxima fase sem eu testar a atual
- Não exponha segredos (chaves, senhas) em código — use .env
- Não faça commits gigantes — um commit por mudança lógica

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9) AUDITORIA, BACKUP E SEGURANÇA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Toda mutação de dado gera registro de auditoria (quem, quando, o quê)
- Senhas com hash (bcrypt ou argon2), NUNCA texto puro
- Backup diário automático do SQLite (script local)
- Sessão expira após inatividade configurável
- Rate limiting nas rotas de login

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10) PERFORMANCE E LIMITES (estimativas iniciais)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- ~100 leituras/dia, ~20 análises/dia, ~5 ocorrências/semana
- Até 20 usuários simultâneos
- Histórico mantido por no mínimo 5 anos (exigência ambiental)
- Telas devem carregar em <2 segundos

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11) CONVENÇÕES DE CÓDIGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Estrutura de pastas clara: /app /components /lib /prisma /tests
- Nomes de arquivo em kebab-case, componentes em PascalCase
- Tabelas e colunas do banco em inglês (snake_case no Prisma)
- Rotas de API em inglês: /api/analyses, /api/shifts, /api/readings
- Variáveis e funções em camelCase em inglês; textos exibidos em pt-BR
- Comentários só onde o "porquê" não é óbvio
- Imports ordenados: libs externas → internos → relativos
- Sem código morto / sem TODOs sem dono

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12) GIT E VERSIONAMENTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Inicialize Git desde o começo
- Commits em português, padrão Conventional Commits:
  feat: nova funcionalidade
  fix: correção
  docs: documentação
  refactor: refatoração
  test: testes
- Commits pequenos e frequentes — um por unidade lógica
- Sempre rodar testes antes de commitar

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
13) DEFINITION OF DONE (uma fase só fecha quando)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Funcionalidade implementada e funcionando local
✓ Testes automatizados passando
✓ Eu testei manualmente os fluxos principais e aprovei
✓ Sem erros no console
✓ Acessível pelo teclado
✓ Funciona no mobile (Chrome DevTools modo celular)
✓ CLAUDE.md atualizado com o estado
✓ Commit feito

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
14) COMO QUERO TRABALHAR COM VOCÊ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Incrementos pequenos: explica → faz → me mostra → espera meu OK
- Quando tiver dúvida sobre produto ou regra, PERGUNTE
- Sempre que criar rota/tela, me ensine como testar (passo a passo)
- Se der erro, me explique o que era e como corrigiu (pra eu aprender)
- Ao fim de cada fase: rode os testes, atualize CLAUDE.md, faça commit
- Mantenha um arquivo /docs/RUNBOOK.md com comandos úteis (rodar, 
  testar, resetar banco, ver logs)
- Crie dados de seed realistas pra eu poder testar sem cadastrar tudo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
15) METAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MVP (Mínimo Viável): cadastros básicos, login com 3 perfis, 1 dashboard 
por perfil, rodando local com dados de teste.
v1.0: relatórios PDF, gráficos históricos, modo offline pra operador (PWA — a avaliar).
v2.0: publicado online, multi-ETE, integrações com órgão ambiental.
v2.0+: integração com sensores em tempo real: leituras automáticas (a cada
N minutos ou por eventos) sem intervenção humana. Arquitetura prevista:
sensores → gateway local (MQTT/Modbus) → API autenticada do Solentis.
Cada sensor com credenciais próprias e validação de payload.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
17) CONFIGURAÇÕES DO SISTEMA (decisões fechadas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IDENTIDADE
- Nome exibido: Solentis
- Slug / pasta / pacote npm: solentis

TEMPO E DATA
- Fuso horário do servidor: America/Sao_Paulo
- Formato de data na interface: DD/MM/AAAA HH:mm
- Agrupamento de registros: data calendário (00h–23h59)
- Registros de turno noturno (cruza meia-noite): pertencem ao turno,
  não à data isolada

TURNOS
- Cadastro de turnos pelo GESTOR: nome, hora início, hora fim,
  flag "cruza meia-noite"
- Seed inicial: Manhã 06h–14h / Tarde 14h–22h / Noite 22h–06h
- Timeout de passagem: 2h por padrão, configurável por turno

SEGURANÇA E ACESSO
- Senha: mínimo 8 caracteres, ao menos 1 número e 1 letra
- Sessão por inatividade: 30 min (Operador) / 60 min (Técnico e Gestor)
- Rate limiting de login: 5 tentativas; bloqueio de 15 min após exceder
- Criação de usuários: exclusiva do GESTOR
- Credencial seed (somente primeiro acesso):
    e-mail:  admin@solentis.local
    senha:   Admin@123  ← sistema OBRIGA troca no primeiro login
  Documentar claramente no RUNBOOK

PERFIS — RESUMO DA MATRIZ APROVADA
- Operador: registra leituras, ocorrências e manutenções; abre/fecha
  turnos próprios; vê dashboard próprio
- Técnico: tudo do Operador + registra/aprova análises + fecha
  ocorrências + cadastra equipamentos; vê dashboard próprio
- Gestor: acesso total; edita turno fechado (com justificativa
  obrigatória); gerencia parâmetros, métodos, categorias e usuários;
  vê todos os dashboards

OCORRÊNCIAS
- Severidades: Baixa / Média / Alta / Crítica
- Prazos default (configuráveis pelo Gestor):
    Crítica = 24h | Alta = 72h | Média = 7 dias | Baixa = 30 dias

PARÂMETROS E LISTAS GERENCIADAS PELO GESTOR
- Parâmetros CONAMA (seed): pH, DBO, DQO, Sólidos Suspensos,
  Nitrogênio Amoniacal, Fósforo Total, Temperatura,
  Coliformes Termotolerantes
- Métodos de análise (seed): APHA, SMEWW, NBR
- Categorias de equipamento (seed): Bomba, Soprador, Medidor,
  Válvula, Decantador, Reator
- Frequência de manutenção preventiva: definida em DIAS

INTERFACE
- Idioma: português-BR (sem multi-idioma no MVP)
- Tema: claro por padrão, toggle para tema escuro
- Paleta: tons de azul-petróleo / verde-água (definição exata na fase
  de design)

PREPARO PARA SENSORES (sem implementação no MVP)
- Schema do banco com campo 'origem' (enum) e 'metadata_origem' (JSON)
  em todas as tabelas de Leituras e Análises
- Endpoints de criação aceitam dois tipos de autenticação (sessão e
  API key) — API key implementada apenas em v2.0
- Logs de auditoria registram a origem em todos os casos

INFRAESTRUTURA LOCAL
- Porta de desenvolvimento: 3000
- Backup diário do SQLite: script que copia o arquivo do banco para
  /backups com timestamp no nome — documentar no RUNBOOK

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
16) PRIMEIRA TAREFA — FAÇA NESTA ORDEM, SEM PULAR
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NÃO crie nenhum arquivo de código ainda. Faça assim:

(a) Verifique se Node.js está instalado (versão ≥ 20) e Git também.
    Se faltar, me oriente a instalar.

(b) Confirme que entendeu o briefing: me devolva em até 10 linhas 
    o resumo do projeto com SUAS palavras, pra eu validar que não 
    houve mal-entendido.

(c) Aponte CONTRADIÇÕES, AMBIGUIDADES ou RISCOS que você viu no 
    briefing acima — quero saber o que não está claro.

(d) Liste DECISÕES que precisam ser tomadas antes do código:
    - Nome do projeto/sistema
    - Fuso horário e formato de data
    - Política de senha (mínimo de caracteres, etc.)
    - Outras que você identificar

(e) Proponha o PLANO em fases pequenas (estimativa de 1-4 horas 
    cada), com objetivo, entregáveis e critérios de aceite por fase.

(f) Proponha o MODELO DE DADOS (tabelas, campos, relações) em formato 
    de diagrama textual ou tabela. Justifique escolhas relevantes.

(g) Crie (só depois de (a) a (f) aprovados) o arquivo BRIEFING.md 
    com este documento, e o CLAUDE.md inicial com o estado do projeto.

ESPERE MEU "OK, PODE SEGUIR" entre cada letra acima. Não emende.
