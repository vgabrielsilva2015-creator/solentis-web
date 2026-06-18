import { Button } from '@/components/ui/button'
import { handleSignOut } from './sign-out-action'

export function SignOutButton() {
  return (
    <form action={handleSignOut}>
      <Button type="submit" variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
        Sair
      </Button>
    </form>
  )
}
