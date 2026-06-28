import { z } from 'zod'

export const UsuarioSchema = z.object({
  name:  z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido').transform(v => v.trim().toLowerCase()),
  role:  z.enum(['OPERATOR', 'TECHNICIAN', 'MANAGER', 'MAINTENANCE']),
})

export type UsuarioFormState = {
  error?:        string
  fieldErrors?:  Record<string, string[]>
  tempPassword?: string
  inviteSent?:   boolean
  inviteError?:  string
}
