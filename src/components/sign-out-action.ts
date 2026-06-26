'use server'

import { signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'

export async function handleSignOut() {
  await signOut({ redirectTo: '/login' })
}
