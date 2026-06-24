import { z } from 'zod'

export const UsuarioSchema = z.object({
  name:  z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().trim().toLowerCase().email('E-mail inválido'),
  role:  z.enum(['OPERATOR', 'TECHNICIAN', 'MANAGER', 'MAINTENANCE']),
})

export type UsuarioFormState = {
  error?:        string
  fieldErrors?:  Record<string, string[]>
  tempPassword?: string
}
