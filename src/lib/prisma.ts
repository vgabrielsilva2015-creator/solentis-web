import { PrismaClient } from '@prisma/client'

// Evita múltiplas instâncias do PrismaClient em desenvolvimento (hot reload do Next.js)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
