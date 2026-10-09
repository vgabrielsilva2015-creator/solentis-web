import { describe, it, expect } from 'vitest'
import { errorMessage, errorCode, errorStatusCode } from '@/lib/error-utils'

describe('error-utils', () => {
  it('errorMessage lê Error, objeto com message e cai no fallback no resto', () => {
    expect(errorMessage(new Error('x'))).toBe('x')
    expect(errorMessage({ message: 'y' })).toBe('y')
    for (const v of [null, undefined, 'texto', 42, {}, { message: 7 }, new Error('')]) expect(errorMessage(v, 'padrão')).toBe('padrão')
    expect(errorMessage(null)).toBe('')
  })
  it('errorCode só aceita texto', () => {
    expect(errorCode({ code: 'P2002' })).toBe('P2002')
    expect(errorCode({ code: 2002 })).toBeUndefined()
    expect(errorCode(null)).toBeUndefined()
  })
  it('errorStatusCode só aceita número', () => {
    expect(errorStatusCode({ statusCode: 410 })).toBe(410)
    expect(errorStatusCode({ statusCode: '410' })).toBeUndefined()
    expect(errorStatusCode(undefined)).toBeUndefined()
  })
})
