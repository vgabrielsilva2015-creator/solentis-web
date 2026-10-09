/**
 * Preparação comum dos testes de integração (T-28). Roda antes de cada arquivo.
 *  1. valida o banco (src/test/db.ts) e só então o expõe como DATABASE_URL para o Prisma do app;
 *  2. troca só o que depende do Next/da sessão: `auth()` (sessão simulada), `redirect`, caches.
 *     Banco, guardas, schemas Zod e actions rodam de verdade.
 */
import { vi, beforeEach, afterAll } from 'vitest'
import { assertSafeDatabase, resetDb } from './db'

assertSafeDatabase(process.env.INTEGRATION_DATABASE_URL)
process.env.DATABASE_URL = process.env.INTEGRATION_DATABASE_URL
process.env.DIRECT_URL = process.env.INTEGRATION_DATABASE_URL
process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent'

vi.mock('@/lib/auth', () => ({ auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }))

// next-auth importa 'next/server' (não resolve fora do Next); as actions só usam a classe de erro
vi.mock('next-auth', () => ({ AuthError: class AuthError extends Error {} }))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => { throw new Error(`NEXT_REDIRECT:${url}`) },
  notFound: () => { throw new Error('NEXT_NOT_FOUND') },
  unstable_rethrow: (e: unknown) => { if (e instanceof Error && e.message.startsWith('NEXT_')) throw e },
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: <T extends (...a: never[]) => unknown>(fn: T) => fn,
}))

beforeEach(async () => { await resetDb() })

afterAll(async () => {
  const { prisma } = await import('@/lib/prisma')
  await prisma.$disconnect()
})
