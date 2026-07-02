import { Button } from '@/components/ui/button'
import { handleSignOut } from './sign-out-action'

export function SignOutButton() {
  return (
    <form action={handleSignOut}>
      <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
        Sair
      </Button>
    </form>
  )
}
