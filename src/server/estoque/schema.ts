/**
 * Entradas de dados do estoque de produtos químicos (T-25). Ficam fora dos arquivos
 * `'use server'` porque estes só podem exportar funções assíncronas.
 */
import { z } from 'zod'
import { numeroBR } from '@/lib/zod-ptbr'

const idCurto = z.string().max(64, 'Texto muito longo (máximo 64 caracteres).').min(1, { error: 'Produto obrigatório' })

const textoOpcional = (max: number) =>
  z.preprocess(
    (v) => (v === '' || v == null ? null : String(v)),
    z.string().max(max, `Texto muito longo (máximo ${max} caracteres).`).nullable(),
  )

const dataObrigatoria = (msg: string) =>
  z.string().max(40, 'Texto muito longo (máximo 40 caracteres).').min(1, { error: msg })

export const SaidaSchema = z.object({
  product_id: idCurto,
  // T-16: antes parseFloat('2,5') gravava 2
  quantity: numeroBR({ positivo: true, rotulo: 'A quantidade', obrigatorio: 'Informe a quantidade.' }),
  notes: textoOpcional(2000),
  used_at: dataObrigatoria('Data obrigatória'),
})

export const ContagemSchema = z.object({
  product_id: idCurto,
  counted_quantity: numeroBR({ min: 0, rotulo: 'A quantidade contada', obrigatorio: 'Informe a quantidade contada.' }),
  notes: textoOpcional(2000),
  counted_at: dataObrigatoria('Data obrigatória'),
})

export const EntradaSchema = z.object({
  product_id: idCurto,
  quantity: numeroBR({ positivo: true, rotulo: 'A quantidade', obrigatorio: 'Informe a quantidade.' }),
  supplier: textoOpcional(200),
  invoice_number: textoOpcional(200),
  notes: textoOpcional(2000),
  received_at: dataObrigatoria('Data de recebimento obrigatória'),
})
