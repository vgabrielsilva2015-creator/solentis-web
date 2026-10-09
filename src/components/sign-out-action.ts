'use server'

import { cookies } from 'next/headers'
import { auth, signOut } from '@/lib/auth'
import { revokeSession } from '@/lib/session-version'
import { getLogger } from '@/lib/logger'
import { appendToMarker, LOGOUT_MARKER_COOKIE, LOGOUT_MARKER_MAX_AGE_S } from '@/lib/logout-marker'

export async function handleSignOut() {
  const session = await auth()
  const sid = session?.sid
  if (sid && session?.user?.id) {
    // 1) marca neste navegador: uma resposta atrasada não ressuscita a sessão
    const jar = await cookies()
    jar.set(LOGOUT_MARKER_COOKIE, appendToMarker(jar.get(LOGOUT_MARKER_COOKIE)?.value, sid), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: LOGOUT_MARKER_MAX_AGE_S,
    })
    // 2) registra no servidor: cópias do cookie em outros aparelhos caem em até 60 s
    try {
      await revokeSession(sid, session.user.id)
    } catch (err) {
      const log = await getLogger({ userId: session.user.id, action: 'signOut' })
      log.warn({ err }, 'Falha ao registrar sessão encerrada (o logout segue)')
    }
  }
  await signOut({ redirectTo: '/login' })
}
