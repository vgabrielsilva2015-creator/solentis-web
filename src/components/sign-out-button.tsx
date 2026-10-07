'use client'

import { Button } from '@/components/ui/button'
import { clearLocalUserData } from '@/lib/client-cleanup'
import { handleSignOut } from './sign-out-action'

// T-12: antes de encerrar a sessão no servidor, limpa caches e rascunhos do
// aparelho (tablets de ETE são compartilhados entre operadores).
export function SignOutButton() {
  return (
    <form
      action={async () => {
        await clearLocalUserData()
        await handleSignOut()
      }}
    >
      <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
        Sair
      </Button>
    </form>
  )
}
