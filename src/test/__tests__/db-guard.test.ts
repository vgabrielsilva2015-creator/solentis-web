/** A trava do harness: nunca limpar um banco que não seja local e de teste. (Unitário, não precisa de banco.) */
import { describe, it, expect } from 'vitest'
import { assertSafeDatabase } from '../db'

describe('assertSafeDatabase', () => {
  it.each([
    'postgresql://u:p@localhost:5432/solentis_int',
    'postgres://u@127.0.0.1:5433/solentis_test',
    'postgresql://u:p@localhost/ci',
    'postgresql://u:p@localhost/app-test',
    'postgresql://u:p@[::1]:5432/x_ci',
  ])('aceita %s', (url) => { expect(() => assertSafeDatabase(url)).not.toThrow() })

  it.each([
    [undefined, /não definida/],
    ['', /não definida/],
    ['isto não é url', /inválida/],
    ['mysql://u@localhost/x_test', /postgres/],
    ['postgresql://u:p@db.abcdefgh.supabase.co:5432/postgres', /local/],
    ['postgresql://u:p@aws-0-sa-east-1.pooler.supabase.com:6543/postgres', /local/],
    ['postgresql://u:p@10.0.0.5:5432/solentis_int', /local/],
    ['postgresql://u:p@localhost:5432/solentis', /nome do banco/],
    ['postgresql://u:p@localhost:5432/postgres', /nome do banco/],
    ['postgresql://u:p@localhost:5432/production_testing', /nome do banco/],
    ['postgresql://u:p@localhost:5432/', /nome do banco/],
  ])('recusa %s', (url, msg) => { expect(() => assertSafeDatabase(url as string | undefined)).toThrow(msg) })
})
