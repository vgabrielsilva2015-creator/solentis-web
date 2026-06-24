'use server'

import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/password'

function encodeToken(email: string) {
  return Buffer.from(email).toString('base64')
}

function decodeToken(token: string) {
  return Buffer.from(token, 'base64').toString('ascii')
}

export async function sendPasswordResetLink(email: string) {

  // @tenant-safe: fluxo de auth busca usuario pelo email globalmente
  const user = await prisma.user.findFirst({
    where: { email, is_active: true }
  })

  if (!user) {
    // Por segurança, não revelamos se o usuário existe, apenas retornamos sucesso
    return { success: true, token: null }
  }

  // Gera o link mágico baseado no e-mail
  const token = encodeToken(user.email)
  
  return { success: true, token }
}

export async function resetPassword(token: string, newPassword: string) {

  if (!token || !newPassword || newPassword.length < 8) {
    return { error: 'Dados inválidos ou senha muito curta.' }
  }

  try {
    const email = decodeToken(token)
    
    // @tenant-safe: fluxo de auth busca usuario pelo email globalmente
    const user = await prisma.user.findFirst({
      where: { email, is_active: true }
    })

    if (!user) {
      return { error: 'Link inválido ou expirado.' }
    }

    const hashed = await hashPassword(newPassword)

    await prisma.user.update({
      where: { id: user.id },
      data: { password_hash: hashed, must_change_password: false }
    })

    return { success: true }
  } catch (err) {
    return { error: 'Ocorreu um erro ao processar a requisição.' }
  }
}
