import { signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  async function action() {
    'use server'
    await signOut({ redirectTo: '/login' })
  }

  return (
    <form action={action}>
      <Button type="submit" variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
        Sair
      </Button>
    </form>
  )
}
