/**
 * Validação do cronograma de monitoramento (T-18 / B-07).
 *
 * Antes: `createMonitoringSchedule` gravava o que viesse do formulário —
 * `sample_type`/`frequency` livres (qualquer texto), `days_of_week` virava
 * `NaN` com um valor inválido (o Postgres recusava com erro cru) e "Semanal"
 * sem nenhum dia era aceito, mas nunca aparecia na escala. "Mensal" não tinha
 * como informar os dias do mês, então também nunca aparecia.
 */
import { z } from 'zod'

export const SAMPLE_TYPES = ['FIELD', 'INTERNAL', 'EXTERNAL'] as const
export const FREQUENCIES = ['DAILY', 'PER_SHIFT', 'WEEKLY', 'MONTHLY'] as const

/** Quem executa depende do tipo de amostra: campo = operador, laboratório = técnico. */
export function executorFor(sampleType: (typeof SAMPLE_TYPES)[number]): 'OPERATOR' | 'TECHNICIAN' {
  return sampleType === 'FIELD' ? 'OPERATOR' : 'TECHNICIAN'
}

/** "1, 15 30" ou ["1","15"] → [1, 15, 30]; item que não é inteiro vira NaN (recusado). */
function listaDeInteiros(v: unknown): number[] {
  const partes = (Array.isArray(v) ? v : [v])
    .flatMap((x) => String(x ?? '').split(/[\s,;]+/))
    .map((x) => x.trim())
    .filter((x) => x !== '')
  return partes.map((x) => (/^\d+$/.test(x) ? Number(x) : Number.NaN))
}

function diasEntre(min: number, max: number, rotulo: string) {
  const msg = `${rotulo}: use números inteiros de ${min} a ${max}.`
  return z.preprocess(
    listaDeInteiros,
    z
      .array(
        z.number({ error: msg }).refine((n) => Number.isInteger(n) && n >= min && n <= max, { error: msg }),
      )
      .max(max - min + 1, { error: msg })
      .transform((a) => [...new Set(a)].sort((x, y) => x - y)),
  )
}

export const MonitoringScheduleSchema = z
  .object({
    collection_point_id: z.string({ error: 'Selecione o ponto de coleta.' }).max(64, 'Texto muito longo (máximo 64 caracteres).').trim().min(1, { error: 'Selecione o ponto de coleta.' }),
    parameter_id: z.string({ error: 'Selecione o parâmetro.' }).max(64, 'Texto muito longo (máximo 64 caracteres).').trim().min(1, { error: 'Selecione o parâmetro.' }),
    sample_type: z.enum(SAMPLE_TYPES, { error: 'Selecione o tipo de análise.' }),
    frequency: z.enum(FREQUENCIES, { error: 'Selecione a frequência.' }),
    days_of_week: diasEntre(0, 6, 'Dias da semana'),
    days_of_month: diasEntre(1, 31, 'Dias do mês'),
  })
  .superRefine((d, ctx) => {
    if (d.frequency === 'WEEKLY' && d.days_of_week.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['days_of_week'], message: 'Frequência semanal: marque pelo menos um dia da semana.' })
    }
    if (d.frequency === 'MONTHLY' && d.days_of_month.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['days_of_month'], message: 'Frequência mensal: informe pelo menos um dia do mês (ex.: 1, 15).' })
    }
  })

export type MonitoringScheduleInput = z.infer<typeof MonitoringScheduleSchema>

export function parseMonitoringScheduleForm(fd: FormData) {
  return MonitoringScheduleSchema.safeParse({
    collection_point_id: fd.get('collection_point_id') ?? undefined,
    parameter_id: fd.get('parameter_id') ?? undefined,
    sample_type: fd.get('sample_type') ?? undefined,
    frequency: fd.get('frequency') ?? undefined,
    days_of_week: fd.getAll('days_of_week'),
    days_of_month: fd.getAll('days_of_month'),
  })
}

/** Primeira mensagem de erro, para mostrar no topo do formulário. */
export function primeiraMensagem(err: z.ZodError): string {
  return err.issues[0]?.message ?? 'Dados inválidos.'
}
