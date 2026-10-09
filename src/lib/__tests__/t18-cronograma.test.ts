/**
 * T-18 — B-07 — cronograma de monitoramento validado.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { MonitoringScheduleSchema, executorFor } from '@/lib/monitoring-schedule'

const src = (p: string) => readFileSync(join(process.cwd(), 'src', p), 'utf-8')
const semComentarios = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// ─── B-07 ────────────────────────────────────────────────────────────────────
describe('B-07: cronograma validado', () => {
  const ok = { collection_point_id: 'p1', parameter_id: 'q1', sample_type: 'FIELD', frequency: 'DAILY', days_of_week: [], days_of_month: [] }
  const erro = (o: object) => {
    const r = MonitoringScheduleSchema.safeParse({ ...ok, ...o })
    return r.success ? null : r.error.issues[0].message
  }

  it('aceita o caso comum e normaliza os dias (sem repetição, em ordem)', () => {
    const r = MonitoringScheduleSchema.parse({ ...ok, frequency: 'WEEKLY', days_of_week: ['5', '1', '1'] })
    expect(r.days_of_week).toEqual([1, 5])
  })
  it('dias do mês aceitam "1, 15" num campo só', () => {
    expect(MonitoringScheduleSchema.parse({ ...ok, frequency: 'MONTHLY', days_of_month: ['1, 15 30'] }).days_of_month).toEqual([1, 15, 30])
  })
  it('tipo e frequência fora da lista são recusados (antes: gravava qualquer texto)', () => {
    expect(erro({ sample_type: 'HACK' })).toBe('Selecione o tipo de análise.')
    expect(erro({ sample_type: undefined })).toBe('Selecione o tipo de análise.')
    expect(erro({ frequency: 'YEARLY' })).toBe('Selecione a frequência.')
  })
  it('dia inválido é recusado com mensagem (antes: virava NaN e o banco quebrava)', () => {
    expect(erro({ days_of_week: ['abc'] })).toMatch(/Dias da semana: use números inteiros de 0 a 6/)
    expect(erro({ days_of_week: ['7'] })).toMatch(/de 0 a 6/)
    expect(erro({ frequency: 'MONTHLY', days_of_month: ['0'] })).toMatch(/de 1 a 31/)
    expect(erro({ frequency: 'MONTHLY', days_of_month: ['2,5'] })).toBeNull() // "2,5" = dias 2 e 5
    expect(erro({ frequency: 'MONTHLY', days_of_month: ['2.5'] })).toMatch(/de 1 a 31/)
  })
  it('semanal sem dia e mensal sem dia são recusados (nunca apareceriam na escala)', () => {
    expect(erro({ frequency: 'WEEKLY' })).toMatch(/semanal/)
    expect(erro({ frequency: 'MONTHLY' })).toMatch(/mensal/)
  })
  it('ponto e parâmetro obrigatórios', () => {
    expect(erro({ collection_point_id: '' })).toBe('Selecione o ponto de coleta.')
    expect(erro({ parameter_id: undefined })).toBe('Selecione o parâmetro.')
  })
  it('executor segue o tipo', () => {
    expect(executorFor('FIELD')).toBe('OPERATOR')
    expect(executorFor('INTERNAL')).toBe('TECHNICIAN')
    expect(executorFor('EXTERNAL')).toBe('TECHNICIAN')
  })
  it('a action usa o schema e não converte com Number/cast', () => {
    const t = semComentarios(src('app/gestor/(sistema)/cronograma/novo/actions.ts'))
    expect(t).toMatch(/parseMonitoringScheduleForm\(formData\)/)
    expect(t).not.toMatch(/\.map\(Number\)/)
    expect(t).not.toMatch(/as string/)
  })
})
