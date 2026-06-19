export function formatDateDisplay(date: Date | string) {
  const d = new Date(date)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
