// Calcula is_non_conformant para uma leitura de campo.
// Retorna null quando não há valor (leitura observacional sem parâmetro).
// Retorna false quando nenhum limite está definido para o parâmetro.
export function calcularNaoConformidade(
  value:    number | null,
  minLimit: number | null,
  maxLimit: number | null,
): boolean | null {
  if (value === null) return null
  const below = minLimit !== null && value < minLimit
  const above = maxLimit !== null && value > maxLimit
  return below || above
}
