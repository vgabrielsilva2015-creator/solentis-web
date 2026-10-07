/**
 * T-18 — B-11 — passagem de turno: timeout calculado na leitura, confirmação atrasada permitida.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import {
  aguardandoConfirmacao, passagemVencida, statusEfetivoPassagem, HANDOVER_STATUS_LABEL,
} from '@/lib/handover-status'

const src = (p: string) => readFileSync(join(process.cwd(), 'src', p), 'utf-8')
const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// ─── B-11 ────────────────────────────────────────────────────────────────────
describe('B-11: passagem de turno — timeout calculado, sem gravar no GET', () => {
  const agora = new Date('2026-10-07T12:00:00Z')
  const antes = new Date('2026-10-07T11:00:00Z')
  const depois = new Date('2026-10-07T13:00:00Z')

  it('PENDING dentro do prazo continua PENDING', () => {
    expect(statusEfetivoPassagem({ status: 'PENDING', timeout_at: depois }, agora)).toBe('PENDING')
    expect(passagemVencida({ status: 'PENDING', timeout_at: depois }, agora)).toBe(false)
  })
  it('PENDING com prazo esgotado aparece como vencida', () => {
    expect(statusEfetivoPassagem({ status: 'PENDING', timeout_at: antes }, agora)).toBe('TIMED_OUT')
    expect(passagemVencida({ status: 'PENDING', timeout_at: antes }, agora)).toBe(true)
  })
  it('TIMED_OUT gravado pela versão antiga continua aguardando (pode ser confirmada)', () => {
    expect(aguardandoConfirmacao('TIMED_OUT')).toBe(true)
    expect(statusEfetivoPassagem({ status: 'TIMED_OUT', timeout_at: antes }, agora)).toBe('TIMED_OUT')
  })
  it('confirmada depois do prazo fica registrada como atrasada', () => {
    expect(statusEfetivoPassagem({ status: 'CONFIRMED', timeout_at: antes, confirmed_at: agora })).toBe('CONFIRMED_LATE')
    expect(statusEfetivoPassagem({ status: 'CONFIRMED', timeout_at: depois, confirmed_at: agora })).toBe('CONFIRMED')
    expect(aguardandoConfirmacao('CONFIRMED')).toBe(false)
  })
  it('todo status tem rótulo em português', () => {
    for (const v of Object.values(HANDOVER_STATUS_LABEL)) expect(v).toMatch(/[a-zç]/i)
  })

  it('nenhuma page.tsx/layout.tsx grava no banco ao renderizar', () => {
    const achados: string[] = []
    const walk = (dir: string) => {
      for (const e of readdirSync(dir)) {
        const full = join(dir, e)
        if (statSync(full).isDirectory()) walk(full)
        else if (/^(page|layout)\.tsx$/.test(e)) {
          const t = semComentarios(readFileSync(full, 'utf-8'))
          if (/prisma\.\w+\.(update|updateMany|create|createMany|delete|deleteMany|upsert)\s*\(/.test(t) || /aplicarTimeouts/.test(t)) {
            achados.push(full)
          }
        }
      }
    }
    walk(join(process.cwd(), 'src/app'))
    expect(achados).toEqual([])
  })

  it('aplicarTimeouts não existe mais', () => {
    expect(semComentarios(src('app/operador/turnos/actions.ts'))).not.toMatch(/aplicarTimeouts/)
  })

  it('confirmarPassagem aceita passagem vencida e confirma uma única vez', () => {
    const t = semComentarios(src('app/operador/turnos/actions.ts'))
    const i = t.indexOf('export async function confirmarPassagem')
    const corpo = t.slice(i, t.indexOf('export async function', i + 10))
    expect(corpo).not.toMatch(/status\s*!==\s*'PENDING'/)
    expect(corpo).toMatch(/aguardandoConfirmacao\(handover\.status\)/)
    // update condicional ao status + checagem de count: dois entrantes não fecham o turno duas vezes
    expect(corpo).toMatch(/status:\s*\{\s*in:\s*\[\.\.\.STATUS_AGUARDANDO\]\s*\}/)
    expect(corpo).toMatch(/count\s*!==\s*1/)
  })

  it('telas do operador usam a mesma regra (lista, confirmação e contagem do dashboard)', () => {
    expect(src('app/operador/turnos/page.tsx')).toMatch(/aguardandoConfirmacao\(inst\.handover\.status\)/)
    expect(src('app/operador/turnos/confirmar/page.tsx')).toMatch(/!aguardandoConfirmacao\(handover\.status\)/)
    const dash = semComentarios(src('app/operador/dashboard/page.tsx'))
    const bloco = dash.slice(dash.indexOf('prisma.shiftHandover.count'), dash.indexOf('prisma.shiftHandover.count') + 400)
    expect(bloco).toMatch(/STATUS_AGUARDANDO/)
    expect(bloco).not.toMatch(/date:\s*today/)
  })
})
