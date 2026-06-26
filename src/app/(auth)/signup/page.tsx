import { redirect } from 'next/navigation'

// Cadastro é apenas por convite (modelo B2B). Não há auto-cadastro público:
// o acesso é criado por um gestor, que envia convite por e-mail.
export default function SignupPage() {
  redirect('/login')
}
