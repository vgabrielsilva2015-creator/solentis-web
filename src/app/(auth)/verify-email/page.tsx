import { redirect } from 'next/navigation'

// Sem auto-cadastro público: a verificação de e-mail acontece via link de
// convite enviado pelo gestor. Esta rota antiga apenas redireciona ao login.
export default function VerifyEmailPage() {
  redirect('/login')
}
