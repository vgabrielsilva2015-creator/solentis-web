export function calcularEstoqueAtual(totalEntradas: number, totalSaidas: number): number {
  return totalEntradas - totalSaidas
}

export function estaAbaixoMinimo(
  estoqueCalculado: number,
  estoqueFisico: number | null,
  minStock: number,
): boolean {
  return estoqueCalculado < minStock || (estoqueFisico !== null && estoqueFisico < minStock)
}

export function calcularDivergencia(
  estoqueCalculado: number,
  estoqueFisico: number | null,
): number | null {
  if (estoqueFisico === null) return null
  return estoqueFisico - estoqueCalculado
}

export function formatarQuantidade(value: number): string {
  return value % 1 === 0 ? value.toFixed(0) : value.toFixed(2)
}
