import { z } from 'zod'

export const UsuarioSchema = z.object({
  name:  z.string().max(200, 'Texto muito longo (máximo 200 caracteres).').min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().max(254, 'Texto muito longo (máximo 254 caracteres).').email('E-mail inválido').transform(v => v.trim().toLowerCase()),
  role:  z.enum(['OPERATOR', 'TECHNICIAN', 'MANAGER', 'MAINTENANCE']),
})

export type UsuarioFormState = {
  error?:        string
  fieldErrors?:  Record<string, string[]>
  tempPassword?: string
  inviteSent?:   boolean
  inviteError?:  string
}
