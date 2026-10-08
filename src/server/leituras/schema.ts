/** Entrada do formulário de leitura de campo (T-25): fora do arquivo `'use server'`. */
import { z } from 'zod'
import { numeroBROpcional } from '@/lib/zod-ptbr'

const textoOpcional = (max: number, msg?: string) =>
  z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(max, msg ?? `Texto muito longo (máximo ${max} caracteres).`).nullable(),
  )

export const LeituraSchema = z
  .object({
    collection_point_id: z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').min(1, 'Selecione o ponto de coleta'),
    parameter_id: textoOpcional(64),
    // T-16: aceita 7,2 e 7.2; mensagens em português
    value: numeroBROpcional({ rotulo: 'O valor medido' }),
    unit: textoOpcional(200),
    notes: textoOpcional(1000, 'Observação deve ter no máximo 1000 caracteres'),
    recorded_at: z.string().max(40, 'Texto muito longo (máximo 40 caracteres).').min(1, 'Informe a data/hora da leitura'),
    // T-15: id gerado no aparelho; o mesmo id enviado de novo não duplica a leitura
    client_id: z.preprocess(
      (v) => (v === '' || v == null ? null : String(v)),
      z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').regex(/^[A-Za-z0-9-]{8,64}$/, 'Identificador inválido').nullable(),
    ),
  })
  .refine((d) => d.parameter_id === null || d.value !== null, {
    message: 'Informe o valor medido',
    path: ['value'],
  })

export type LeituraEntrada = z.infer<typeof LeituraSchema>
