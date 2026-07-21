import bcrypt from 'bcryptjs'
import { z } from 'zod'

const SALT_ROUNDS = 12

// Política única de senha (fonte da verdade). UI e servidor concordam:
// mínimo 10 caracteres, com ao menos uma letra e um número.
export const passwordSchema = z
  .string()
  .min(10, 'A senha deve ter no mínimo 10 caracteres.')
  .regex(/[A-Za-z]/, 'A senha deve conter ao menos uma letra.')
  .regex(/[0-9]/, 'A senha deve conter ao menos um número.')

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
