# Modelo de Dados — Solentis MVP

**Status:** APROVADO em 2026-05-12
**Tabelas:** 21 | **Enums:** 9 | **Multi-tenant:** sim (`tenant_id` em todas as tabelas operacionais)

---

## Visão geral dos domínios

| Domínio | Tabelas |
|---|---|
| a) Identidade & Autenticação | tenants, users, sessions, login_attempts |
| b) Configuração | quality_parameters, analysis_methods, equipment_categories, collection_points, shifts, occurrence_severity_defaults |
| c) Operação | readings, analyses, equipment, preventive_maintenances, corrective_maintenances, occurrences, occurrence_photos |
| d) Fluxo de Turno | shift_instances, shift_handovers |
| e) Rastreabilidade | audit_logs, parameter_history |

---

## a) Identidade & Autenticação

### `tenants`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| name | String | Sim | — | Ex: "Solentis" |
| slug | String | Sim | UNIQUE | URL-safe; ex: "solentis" |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |

Seed: `{ id: "default", name: "Solentis", slug: "solentis", is_active: true }`

---

### `users`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| email | String | Sim | UNIQUE* | *único por tenant: índice composto (tenant_id, email) |
| password_hash | String | Sim | — | bcrypt/argon2; nunca texto puro |
| name | String | Sim | — | Nome de exibição na UI |
| role | Role | Sim | Sim | OPERATOR / TECHNICIAN / MANAGER |
| must_change_password | Boolean | Sim | — | `true` na criação pelo Gestor |
| is_active | Boolean | Sim | — | Soft-delete; nunca hard delete se tiver dados operacionais |
| last_login_at | DateTime | Não | — | Registro de último acesso |
| created_at | DateTime | Sim | Sim | |
| updated_at | DateTime | Sim | — | |
| created_by | String (FK) | Não | — | → users.id; null apenas para o seed inicial |

---

### `sessions` *(NextAuth — sessões em banco para suportar timeout por inatividade)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| session_token | String | Sim | UNIQUE | |
| user_id | String (FK) | Sim | Sim | → users.id; CASCADE DELETE ao desativar o usuário |
| expires | DateTime | Sim | — | 30min (OPERATOR) / 60min (TECHNICIAN, MANAGER) |

---

### `login_attempts` *(rate limiting persistente — sobrevive a reinicializações)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| email | String | Sim | Sim | Email tentado |
| ip_address | String | Não | — | Para análise de segurança futura |
| success | Boolean | Sim | — | `true` = login bem-sucedido |
| attempted_at | DateTime | Sim | Sim | Consultado via (tenant_id, email, attempted_at) na janela de 15min |

```
Relações:
tenants ──< users            (1 tenant : N usuários)
tenants ──< sessions
tenants ──< login_attempts
users   ──< sessions         CASCADE DELETE ao desativar
users   ──< users            (created_by: auto-referência)
```

---

## b) Configuração

> Todas as tabelas deste domínio têm `tenant_id`, exceto `occurrence_severity_defaults` (global).

### `quality_parameters`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | — | Ex: "pH", "DBO" |
| unit | String | Sim | — | Ex: "mg/L", "–" para adimensional |
| min_limit | Float | Não | — | Null = sem limite mínimo |
| max_limit | Float | Não | — | Null = sem limite máximo |
| legal_reference | String | Não | — | Ex: "CONAMA 430/2011 Art. 16" |
| effective_date | DateTime | Sim | — | Início da vigência dos limites atuais |
| is_active | Boolean | Sim | — | Desativados somem de novos formulários |
| created_at | DateTime | Sim | Sim | |
| updated_at | DateTime | Sim | — | |
| created_by | String (FK) | Sim | — | → users.id |

---

### `analysis_methods`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | UNIQUE* | *único por tenant: (tenant_id, name) |
| description | String | Não | — | |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |

---

### `equipment_categories`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | UNIQUE* | *único por tenant: (tenant_id, name) |
| description | String | Não | — | Ex: "Equipamentos de recalque e circulação de fluidos" |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |

---

### `collection_points`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | — | Ex: "Entrada ETE", "Saída Final" |
| location | String | Não | — | Descrição física do local |
| description | String | Não | — | |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |

---

### `shifts` *(configuração dos turnos — não instâncias reais)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | — | Ex: "Manhã", "Tarde", "Noite" |
| start_time | String | Sim | — | "06:00" — String HH:mm; SQLite não tem tipo Time nativo |
| end_time | String | Sim | — | "14:00" |
| crosses_midnight | Boolean | Sim | — | `true` para Noite (22h–06h) |
| handover_timeout_minutes | Int | Sim | — | Default: 120 (2h); configurável por turno |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |

---

### `occurrence_severity_defaults` *(prazos configuráveis pelo Gestor — sem tenant_id, global)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| severity | OccurrenceSeverity | Sim | PK | Exatamente 4 linhas, uma por severidade |
| deadline_hours | Int | Sim | — | Crítica=24, Alta=72, Média=168, Baixa=720 |
| updated_at | DateTime | Sim | — | |
| updated_by | String (FK) | Sim | — | → users.id |

```
Relações:
quality_parameters ──< parameter_history  (histórico de alterações)
shifts             ──< shift_instances    (1 config : N instâncias)
collection_points  ──< readings
collection_points  ──< analyses
```

---

## c) Operação

### `readings` *(leituras de campo — mobile-first, Operador)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| collection_point_id | String (FK) | Sim | Sim | → collection_points.id |
| parameter_id | String (FK) | Não | Sim | → quality_parameters.id; null para obs. visual sem parâmetro formal (ex: "odor forte detectado") |
| shift_instance_id | String (FK) | Não | Sim | → shift_instances.id; associa leitura ao turno ativo |
| value | Float | Não | — | Null em leituras puramente observacionais |
| unit | String | Não | — | Copiado do parâmetro ao registrar |
| notes | String | Não | — | Texto livre (ex: "amostra coletada após chuva forte") |
| is_non_conformant | Boolean | Não | Sim | Null se sem parâmetro; calculado no save |
| origin | DataOrigin | Sim | — | MANUAL no MVP; SENSOR e IMPORT reservados para v2.0 |
| metadata_origin | Json | Não | — | Reservado: {device_id, topic, qos} para sensores futuros |
| recorded_by | String (FK) | Sim | Sim | → users.id |
| recorded_at | DateTime | Sim | Sim | Data/hora real da leitura de campo |
| created_at | DateTime | Sim | Sim | Data/hora do registro no sistema |

---

### `analyses` *(análises laboratoriais — Técnico)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| collection_point_id | String (FK) | Sim | Sim | → collection_points.id |
| parameter_id | String (FK) | Sim | Sim | → quality_parameters.id |
| method_id | String (FK) | Sim | — | → analysis_methods.id |
| value | Float | Sim | — | |
| unit | String | Sim | — | Snapshot da unidade do parâmetro no momento do registro |
| min_limit_applied | Float | Não | — | **Snapshot imutável do limite mínimo vigente em collected_at** — rastreabilidade legal |
| max_limit_applied | Float | Não | — | **Snapshot imutável do limite máximo vigente em collected_at** |
| report_text | String | Não | — | Laudo em texto livre |
| is_non_conformant | Boolean | Sim | Sim | Calculado no save; desnormalizado para performance em dashboards |
| approved_by | String (FK) | Não | — | → users.id; null = pendente de aprovação |
| approved_at | DateTime | Não | — | |
| origin | DataOrigin | Sim | — | MANUAL no MVP |
| metadata_origin | Json | Não | — | Reservado para sensores (v2.0) |
| collected_at | DateTime | Sim | Sim | Data/hora da coleta da amostra (pode diferir de created_at) |
| recorded_by | String (FK) | Sim | Sim | → users.id |
| created_at | DateTime | Sim | Sim | |

---

### `equipment`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| name | String | Sim | — | |
| category_id | String (FK) | Sim | Sim | → equipment_categories.id |
| serial_number | String | Não | — | |
| location | String | Não | — | Localização física na ETE |
| installation_date | DateTime | Não | — | |
| preventive_frequency_days | Int | Sim | — | Usado para agendar próxima preventiva automaticamente |
| is_active | Boolean | Sim | — | |
| created_at | DateTime | Sim | — | |
| created_by | String (FK) | Sim | — | → users.id |

---

### `preventive_maintenances`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| equipment_id | String (FK) | Sim | Sim | → equipment.id |
| scheduled_date | DateTime | Sim | Sim | Data prevista |
| completed_date | DateTime | Não | — | Preenchida ao concluir |
| completed_by | String (FK) | Não | — | → users.id |
| notes | String | Não | — | Anotações livres |
| status | MaintenanceStatus | Sim | Sim | SCHEDULED / COMPLETED / OVERDUE |
| created_at | DateTime | Sim | — | |
| updated_at | DateTime | Sim | — | |

---

### `corrective_maintenances`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| equipment_id | String (FK) | Sim | Sim | → equipment.id |
| description | String | Sim | — | Descrição do problema / serviço executado |
| responsible_id | String (FK) | Sim | — | → users.id |
| priority | Priority | Não | Sim | LOW / MEDIUM / HIGH / CRITICAL; default MEDIUM |
| start_date | DateTime | Sim | — | |
| end_date | DateTime | Não | — | |
| status | MaintenanceStatus | Sim | Sim | IN_PROGRESS / COMPLETED / CANCELLED |
| estimated_cost | Decimal | Não | — | Custo estimado antes da execução |
| actual_cost | Decimal | Não | — | Custo real após conclusão; Decimal (nunca Float — ver decisão 12) |
| notes | String | Não | — | Anotações livres adicionais |
| created_at | DateTime | Sim | — | |
| updated_at | DateTime | Sim | — | |

---

### `occurrences`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| description | String | Sim | — | Descrição estruturada do evento |
| severity | OccurrenceSeverity | Sim | Sim | LOW / MEDIUM / HIGH / CRITICAL |
| status | OccurrenceStatus | Sim | Sim | OPEN / IN_PROGRESS / RESOLVED |
| deadline | DateTime | Sim | — | Sugerido via occurrence_severity_defaults; editável por Técnico/Gestor |
| resolved_at | DateTime | Não | — | |
| resolved_by | String (FK) | Não | — | → users.id |
| responsible_id | String (FK) | Não | — | → users.id; SET NULL se responsável for desativado |
| reported_by | String (FK) | Sim | Sim | → users.id |
| created_at | DateTime | Sim | Sim | |
| updated_at | DateTime | Sim | — | |

---

### `occurrence_photos`

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| occurrence_id | String (FK) | Sim | Sim | → occurrences.id; CASCADE DELETE |
| filename | String | Sim | — | UUID gerado no servidor; nunca o nome original (segurança) |
| original_name | String | Sim | — | Nome original para exibição; não usado em path de disco |
| mime_type | String | Sim | — | image/jpeg / image/png / image/webp |
| size_bytes | Int | Sim | — | Máx: 5.242.880 (5 MB) — validado no upload |
| uploaded_by | String (FK) | Sim | — | → users.id |
| uploaded_at | DateTime | Sim | — | |

```
Relações:
users                ──< readings               (recorded_by)
users                ──< analyses               (recorded_by, approved_by)
users                ──< equipment              (created_by)
users                ──< occurrences            (reported_by, responsible_id, resolved_by)
collection_points    ──< readings
collection_points    ──< analyses
quality_parameters   ──< readings               (opcional — null para obs. visual)
quality_parameters   ──< analyses
analysis_methods     ──< analyses
equipment_categories ──< equipment
equipment            ──< preventive_maintenances
equipment            ──< corrective_maintenances
occurrences          ──< occurrence_photos       CASCADE DELETE
shift_instances      ──< readings               (leitura pertence ao turno ativo)
```

---

## d) Fluxo de Turno

### `shift_instances` *(ocorrências reais — distinto da configuração em `shifts`)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| shift_id | String (FK) | Sim | Sim | → shifts.id (configuração) |
| date | DateTime | Sim | Sim | Data de início; para Noite (cruza meia-noite), é o dia que começa às 22h |
| opened_by | String (FK) | Sim | Sim | → users.id |
| opened_at | DateTime | Sim | — | |
| closed_at | DateTime | Não | — | |
| status | ShiftInstanceStatus | Sim | Sim | OPEN / HANDOVER_PENDING / CLOSED |
| created_at | DateTime | Sim | — | |

> **Regra de turno duplicado:** verificada em transação Prisma no MVP. Impede dois registros com mesmo `(tenant_id, shift_id, date)` e `status IN (OPEN, HANDOVER_PENDING)`. Será migrada para `PARTIAL UNIQUE INDEX ... WHERE status IN (...)` no PostgreSQL (v2.0). Ver decisão de design nº 7.

---

### `shift_handovers` *(passagem em 2 etapas)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| tenant_id | String (FK) | Sim | Sim | → tenants.id |
| shift_instance_id | String (FK) | Sim | Sim | → shift_instances.id; CASCADE DELETE |
| outgoing_user_id | String (FK) | Sim | — | → users.id (turno sainte — Etapa 1) |
| incoming_user_id | String (FK) | Não | — | → users.id (turno entrante — null até Etapa 2) |
| checklist_data | Json | Sim | — | Etapa 1: leituras feitas, ocorrências em aberto, pendências |
| outgoing_observations | String | Não | — | Observações livres do sainte (Etapa 1) |
| handover_at | DateTime | Sim | — | Momento do registro da Etapa 1 |
| timeout_at | DateTime | Sim | — | `handover_at + shifts.handover_timeout_minutes` — calculado no save |
| incoming_observations | String | Não | — | Observações livres do entrante (Etapa 2) |
| confirmed_at | DateTime | Não | — | Momento da confirmação (Etapa 2) |
| status | HandoverStatus | Sim | Sim | PENDING / CONFIRMED / TIMED_OUT |
| created_at | DateTime | Sim | — | |

```
Relações:
shifts          ──< shift_instances    (1 config : N instâncias)
shift_instances ──1 shift_handovers    (1 instância : no máximo 1 handover; CASCADE DELETE)
users           ──< shift_instances    (opened_by)
users           ──< shift_handovers    (outgoing_user_id, incoming_user_id)
shift_instances ──< readings           (leituras associadas ao turno)
```

---

## e) Rastreabilidade

### `audit_logs` *(sem tenant_id — contexto recuperado via record_id)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| user_id | String (FK) | Não | Sim | → users.id; null para ações do sistema (ex: timeout de passagem) |
| table_name | String | Sim | Sim | Nome da tabela afetada |
| record_id | String | Sim | Sim | ID do registro afetado |
| action | AuditAction | Sim | — | CREATE / UPDATE / DELETE |
| before | Json | Não | — | Estado anterior (null em CREATE) |
| after | Json | Não | — | Estado posterior (null em DELETE) |
| ip_address | String | Não | — | |
| justification | String | Não | — | **Obrigatório** quando Gestor edita turno fechado |
| timestamp | DateTime | Sim | Sim | |

---

### `parameter_history` *(versionamento estruturado — sem tenant_id, herdado via parameter_id)*

| Campo | Tipo | Obrigatório | Índice | Observação |
|---|---|---|---|---|
| id | String (cuid) | Sim | PK | |
| parameter_id | String (FK) | Sim | Sim | → quality_parameters.id |
| min_limit_before | Float | Não | — | |
| max_limit_before | Float | Não | — | |
| min_limit_after | Float | Não | — | |
| max_limit_after | Float | Não | — | |
| effective_date_before | DateTime | Não | — | |
| effective_date_after | DateTime | Sim | — | Nova vigência após a alteração |
| changed_by | String (FK) | Sim | — | → users.id |
| changed_at | DateTime | Sim | Sim | |
| reason | String | Não | — | Justificativa da alteração de limite |

```
Relações:
users              ──< audit_logs         (user_id)
quality_parameters ──< parameter_history  (parameter_id)
```

---

## Enums

| Enum | Valores | Usado em |
|---|---|---|
| `Role` | OPERATOR / TECHNICIAN / MANAGER | users.role |
| `DataOrigin` | MANUAL / SENSOR / IMPORT | readings.origin, analyses.origin |
| `OccurrenceSeverity` | LOW / MEDIUM / HIGH / CRITICAL | occurrences.severity, occurrence_severity_defaults.severity |
| `OccurrenceStatus` | OPEN / IN_PROGRESS / RESOLVED | occurrences.status |
| `MaintenanceStatus` | SCHEDULED / IN_PROGRESS / COMPLETED / OVERDUE / CANCELLED | preventive_maintenances.status, corrective_maintenances.status |
| `Priority` | LOW / MEDIUM / HIGH / CRITICAL | corrective_maintenances.priority |
| `ShiftInstanceStatus` | OPEN / HANDOVER_PENDING / CLOSED | shift_instances.status |
| `HandoverStatus` | PENDING / CONFIRMED / TIMED_OUT | shift_handovers.status |
| `AuditAction` | CREATE / UPDATE / DELETE | audit_logs.action |

> `Priority` e `OccurrenceSeverity` têm os mesmos valores mas são tipos distintos — semântica diferente e evolução independente futura.

---

## Índices recomendados

| Tabela | Campo(s) | Tipo | Motivo |
|---|---|---|---|
| `users` | (tenant_id, email) | UNIQUE | Login por tenant |
| `users` | (tenant_id, role, is_active) | Composto | Listar equipe ativa por perfil |
| `sessions` | session_token | UNIQUE | NextAuth lookup |
| `sessions` | user_id | Simples | Invalidar sessões do usuário |
| `login_attempts` | (tenant_id, email, attempted_at) | Composto | Janela de bloqueio de 15min |
| `quality_parameters` | (tenant_id, is_active) | Composto | Listar parâmetros ativos |
| `analysis_methods` | (tenant_id, name) | UNIQUE | Unicidade por tenant |
| `equipment_categories` | (tenant_id, name) | UNIQUE | Unicidade por tenant |
| `readings` | (tenant_id, recorded_at) | Composto | Séries temporais por tenant |
| `readings` | collection_point_id | Simples | Filtro por ponto |
| `readings` | parameter_id | Simples | Filtro por parâmetro |
| `readings` | (tenant_id, is_non_conformant, created_at) | Composto | Dashboard não-conformidades |
| `analyses` | (tenant_id, parameter_id, collected_at) | Composto | Gráfico histórico por parâmetro |
| `analyses` | (tenant_id, is_non_conformant, approved_by) | Composto | Análises pendentes + alertas |
| `analyses` | collection_point_id | Simples | Filtro por ponto |
| `occurrences` | (tenant_id, severity, status) | Composto | Dashboard e filtros |
| `occurrences` | deadline | Simples | Detecção de prazos vencidos |
| `occurrences` | reported_by | Simples | Ocorrências por operador |
| `preventive_maintenances` | (equipment_id, scheduled_date, status) | Composto | Detecção de manutenção atrasada |
| `corrective_maintenances` | (equipment_id, status) | Composto | Manutenções em aberto por equipamento |
| `corrective_maintenances` | (tenant_id, priority, status) | Composto | Dashboard de prioridades |
| `shift_instances` | (tenant_id, shift_id, date) | Composto | Prevenção de turno duplicado (app-level) |
| `shift_instances` | opened_by | Simples | Turnos do operador |
| `shift_handovers` | (status, timeout_at) | Composto | Detecção de timeout de passagem |
| `audit_logs` | (table_name, record_id) | Composto | Histórico de um registro específico |
| `audit_logs` | (user_id, timestamp) | Composto | Filtro por usuário + período |
| `audit_logs` | timestamp | Simples | Filtro por período |
| `parameter_history` | (parameter_id, changed_at) | Composto | Limite vigente em data X |

---

## Regras de integridade referencial

**Princípio geral:** nada com histórico operacional é hard-deletado — apenas desativado (soft-delete via `is_active = false`) ou anonimizado (LGPD).

| Entidade | Ação | Impacto nas referências | Regra |
|---|---|---|---|
| `users` | Desativação | sessions → CASCADE DELETE; todos os dados operacionais → mantêm FK | Soft-delete (`is_active = false`); RESTRICT hard delete se existir dado operacional |
| `users` | LGPD — direito ao esquecimento | `name → "Usuário removido"`, `email → {uuid}@deleted.solentis.local` | Anonymização via script de manutenção (ver RUNBOOK); nunca DELETE do registro |
| `quality_parameters` | Desativação | readings.parameter_id (opcional) → SET NULL; analyses → mantêm FK | Soft-delete; RESTRICT hard delete se houver análises vinculadas |
| `equipment` | Desativação | preventive e corrective maintenances → mantêm FK | Soft-delete; RESTRICT hard delete |
| `collection_points` | Desativação | readings, analyses → mantêm FK | Soft-delete; RESTRICT hard delete |
| `occurrences` | Encerramento | occurrence_photos → CASCADE DELETE se a ocorrência for deletada | Ocorrências só são encerradas (status → RESOLVED), nunca deletadas |
| `shift_instances` | Fechamento | shift_handovers → CASCADE DELETE se a instância for deletada | Instâncias nunca deletadas; apenas fechadas (status → CLOSED) |
| `analysis_methods` | Desativação | analyses → mantêm FK | Soft-delete; RESTRICT hard delete |
| `equipment_categories` | Desativação | equipment → mantêm FK | Soft-delete; RESTRICT hard delete |
| `occurrence_severity_defaults` | Edição | Sem referências estruturais | Sempre 4 linhas fixas (uma por severidade); UPDATE apenas, nunca INSERT/DELETE |

---

## Decisões de design

**1. `shifts` (configuração) separado de `shift_instances` (ocorrência real)**
A configuração "Turno Manhã: 06h–14h" existe uma vez. "O Turno Manhã de 12/05/2026 aberto pelo Operador João" é uma instância. Misturar os dois tornaria impossível ter histórico, impedir duplicatas ou manter imutabilidade de turno fechado sem gambiarras.

**2. `min_limit_applied` / `max_limit_applied` imutáveis em `analyses`**
Quando um Gestor altera o limite do pH de 9 para 8,5 meses depois, uma análise antiga com pH 8,7 não pode retroativamente virar não-conforme. Capturar o limite vigente no momento de `collected_at` torna a determinação de não-conformidade imutável e auditável — requisito legal para rastreabilidade ambiental (CONAMA 430/2011).

**3. `parameter_history` separado de `audit_logs`**
`audit_logs` armazena `before`/`after` como JSON opaco — ótimo para rastreabilidade geral. Para a query "quais eram os limites do pH em 15/03/2026?", precisamos de campos estruturados e indexáveis. As duas tabelas são gravadas na mesma transação quando um parâmetro é editado.

**4. `is_non_conformant` desnormalizado em `readings` e `analyses`**
Poderia ser calculado na query. Mas o dashboard do Gestor precisa contar não-conformidades rapidamente em anos de histórico. O campo boolean indexado torna essa query trivial. É calculado no save e pode ser recalculado em batch se os limites mudarem.

**5. `occurrence_photos` como tabela separada**
Hoje o MVP tem 1 foto por ocorrência na prática, mas a regra de negócio não impõe esse limite. Tabela separada permite múltiplas fotos sem migração futura e mantém `occurrences` enxuta.

**6. `start_time` / `end_time` como String em `shifts`**
SQLite não tem tipo Time nativo — armazenar como DateTime introduziria uma data arbitrária espúria. String no formato "HH:mm" é simples, legível e suficiente para lógica de exibição e cálculo de intervalos.

**7. Turno duplicado via transação Prisma (não partial unique index)**
SQLite suporta partial indexes, mas Prisma não os expõe no schema DSL — exigiria edição manual de migration SQL. Com SQLite, escritas são serializadas, tornando a verificação em transação igualmente segura. Ao migrar para PostgreSQL (v2.0): `CREATE UNIQUE INDEX ON shift_instances(tenant_id, shift_id, date) WHERE status IN ('OPEN', 'HANDOVER_PENDING')`.

**8. Multi-tenant desde o MVP via `tenant_id`**
Adicionar `tenant_id` agora tem custo zero — um campo e um índice por tabela. Fazer após o MVP significa migrar centenas de milhares de linhas em produção, reescrever todas as queries e redefinir policies de autorização. O middleware Prisma injeta `tenant_id = "default"` automaticamente — nenhuma query do MVP precisa ser escrita de forma diferente.

**9. `occurrence_severity_defaults` sem tenant_id (global)**
Prazos por severidade são baseados em limites regulatórios, não em preferência operacional de cada ETE. Em v2.0 (multi-ETE), avaliar se cada tenant precisa de prazos próprios e adicionar `tenant_id` se necessário.

**10. `login_attempts` em banco (não em memória)**
Rate limiting em memória zera ao reiniciar o servidor — um atacante poderia reiniciar o processo para burlar o bloqueio de 15min. Banco persiste o histórico e é auditável.

**11. `metadata_origin` como Json (não colunas estruturadas)**
Diferentes tipos de sensores terão payloads completamente diferentes: MQTT tem tópico + QoS, Modbus tem endereço + registrador, importação tem nome de arquivo + linha. JSON único evita adicionar colunas a cada nova integração futura.

**12. Valores monetários como `Decimal`, não `Float`**
Float tem imprecisão de ponto flutuante: R$ 100,00 pode ser armazenado como R$ 99,99999…, corrompendo relatórios financeiros. Prisma armazena Decimal como string em SQLite, garantindo precisão exata. Regra: dinheiro nunca em Float.
