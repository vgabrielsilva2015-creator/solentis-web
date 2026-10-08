/**
 * MFA_ENFORCE liga o segundo fator em etapas, só para SUPER_ADMIN:
 *   off       (padrão) nada muda; é também a alavanca de emergência se o TOTP der problema.
 *   enroll    quem já cadastrou o TOTP precisa do código ao entrar; quem não cadastrou
 *             entra normalmente e vê o aviso para cadastrar.
 *   required  quem não cadastrou só alcança a tela de cadastro; ninguém opera o painel sem o 2º fator.
 * Valor desconhecido (erro de digitação) vira `enroll`: não tranca ninguém, mas também não deixa o MFA desligado.
 */
export type MfaMode = 'off' | 'enroll' | 'required'

export function mfaMode(env: Record<string, string | undefined> = process.env): MfaMode {
  const v = env.MFA_ENFORCE?.trim().toLowerCase()
  if (!v || v === 'off') return 'off'
  if (v === 'required') return 'required'
  return 'enroll'
}

/** Estado do 2º fator carregado no token da sessão. */
export type MfaClaim = 'ok' | 'pending' | 'none'
// ok       entrou com o código (ou recuperação)
// pending  super admin ainda sem TOTP cadastrado (modo enroll/required)
// none     MFA desligado (modo off) ou usuário que não é SUPER_ADMIN

/**
 * No modo `required`, SUPER_ADMIN sem o 2º fator confirmado nesta sessão só alcança o cadastro.
 * Vale também para sessão aberta antes de o modo mudar (claim 'none'): precisa sair e entrar de novo.
 */
export function mfaExigeCadastro(role: string | undefined, claim: MfaClaim | undefined, mode: MfaMode): boolean {
  return mode === 'required' && role === 'SUPER_ADMIN' && claim !== 'ok'
}

/** Rotas que o super admin sem 2º fator pode abrir no modo `required`. */
export function rotaLivreSemMfa(pathname: string): boolean {
  // '/' só redireciona (a própria página manda ao cadastro; redirecionar no proxy deixava a URL parada em '/')
  return pathname === '/' || pathname === '/mfa' || pathname.startsWith('/mfa/') || pathname === '/trocar-senha' || pathname.startsWith('/trocar-senha/')
}
