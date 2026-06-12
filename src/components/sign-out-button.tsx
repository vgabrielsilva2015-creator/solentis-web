import { signOut } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'

export function SignOutButton() {
  async function action() {
    'use server'
    await signOut({ redirect: false })
    redirect('/login')
  }

  return (
    <form action={action}>
      <Button type="submit" variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
        Sair
      </Button>
    </form>
  )
}
