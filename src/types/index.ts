// Enums do domínio — definidos em TypeScript porque Prisma v5 + SQLite não suporta enums nativos.
// O banco armazena como String; a aplicação garante os valores válidos via estes tipos.

export type Role = 'OPERATOR' | 'TECHNICIAN' | 'MANAGER'

export const ROLES = {
  OPERATOR:   'OPERATOR',
  TECHNICIAN: 'TECHNICIAN',
  MANAGER:    'MANAGER',
} as const satisfies Record<Role, Role>
