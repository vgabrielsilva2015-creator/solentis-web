import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session || session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Apenas SUPER_ADMIN' }, { status: 403 })
  }

  const to = new URL(req.url).searchParams.get('to')

  const env = {
    RESEND_API_KEY_present: Boolean(process.env.RESEND_API_KEY),
    RESEND_API_KEY_prefix: process.env.RESEND_API_KEY?.slice(0, 6) ?? null,
    EMAIL_FROM: process.env.EMAIL_FROM ?? null,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    NODE_ENV: process.env.NODE_ENV,
  }

  if (!to) {
    return NextResponse.json({ env, hint: 'Adicione ?to=seu-email para testar um envio real.' })
  }

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ env, error: 'RESEND_API_KEY ou EMAIL_FROM ausente no deploy atual.' }, { status: 400 })
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY)
    const result = await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject: 'Teste de envio — Solentis',
      html: '<p>Se você recebeu este e-mail, o Resend está funcionando.</p>',
    })
    return NextResponse.json({ env, resend: result })
  } catch (err) {
    return NextResponse.json({ env, resendError: String(err) }, { status: 500 })
  }
}
