import { redirect } from 'next/navigation'

// O convite reaproveita o fluxo seguro de definição de senha (/reset),
// que valida token (hash + expiração + uso único).
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  redirect(`/reset?token=${encodeURIComponent(token)}`)
}
