/**
 * Banco dos testes de integração (T-28).
 *
 * REGRA DE SEGURANÇA: estes testes APAGAM todas as tabelas a cada teste. Por isso:
 *  - a URL vem SÓ de INTEGRATION_DATABASE_URL (nunca de DATABASE_URL, que pode ser a de dev ou produção);
 *  - o host precisa ser local (localhost, 127.0.0.1, ::1);
 *  - o nome do banco precisa terminar em _int, _test, _ci ou -test/-ci/-int (ou ser "ci"/"test").
 * Qualquer outra coisa lança erro antes de abrir a primeira conexão.
 */
const HOSTS_LOCAIS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])
const NOME_DE_TESTE = /(^|[_-])(int|integration|test|ci)$/i

export function assertSafeDatabase(url: string | undefined): URL {
  if (!url) {
    throw new Error('INTEGRATION_DATABASE_URL não definida. Aponte para um Postgres LOCAL de teste (ex.: .../solentis_int).')
  }
  let u: URL
  try { u = new URL(url) } catch { throw new Error('INTEGRATION_DATABASE_URL inválida.') }
  if (!/^postgres(ql)?:$/.test(u.protocol)) throw new Error('INTEGRATION_DATABASE_URL precisa ser postgres://.')
  if (!HOSTS_LOCAIS.has(u.hostname)) {
    throw new Error(`Recusado: o banco de integração precisa ser local, mas o host é "${u.hostname}".`)
  }
  const nome = decodeURIComponent(u.pathname.replace(/^\//, ''))
  if (!NOME_DE_TESTE.test(nome)) {
    throw new Error(`Recusado: o nome do banco ("${nome}") precisa terminar em _int, _test ou _ci.`)
  }
  return u
}

/** Esvazia todas as tabelas do schema public (menos o controle de migrations). */
export async function resetDb(): Promise<void> {
  const { prisma } = await import('@/lib/prisma')
  const tabelas = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename::text AS tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`
  if (tabelas.length === 0) throw new Error('Banco de integração sem tabelas: aplique as migrations (prisma migrate deploy).')
  const lista = tabelas.map((t) => `"${t.tablename}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${lista} RESTART IDENTITY CASCADE`)
}
