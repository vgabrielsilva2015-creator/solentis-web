import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

const PASSWORD_POLICY = {
  minLength: 8,
  hasUppercase: /[A-Z]/,
  hasLowercase: /[a-z]/,
  hasNumber: /[0-9]/,
}

export function validatePassword(password: string): string | null {
  if (typeof password !== 'string') return 'Senha inválida.'
  if (password.length < PASSWORD_POLICY.minLength) {
    return `A senha precisa ter pelo menos ${PASSWORD_POLICY.minLength} caracteres.`
  }
  if (!PASSWORD_POLICY.hasUppercase.test(password)) {
    return 'A senha precisa conter pelo menos uma letra maiúscula.'
  }
  if (!PASSWORD_POLICY.hasLowercase.test(password)) {
    return 'A senha precisa conter pelo menos uma letra minúscula.'
  }
  if (!PASSWORD_POLICY.hasNumber.test(password)) {
    return 'A senha precisa conter pelo menos um número.'
  }
  return null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
