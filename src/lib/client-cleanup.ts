/**
 * Limpeza do aparelho ao sair (T-12). Roda no navegador, antes do logout.
 *
 * - Apaga todos os caches do Cache Storage (o SW recria os de arquivos estáticos).
 * - Apaga os rascunhos de formulário, que guardam dados digitados pelo usuário
 *   que saiu (num tablet compartilhado, o próximo operador os veria).
 * - NÃO apaga a fila offline antiga do T-01 (só as chaves de DRAFT_KEYS são
 *   removidas): ela pode ter leituras não enviadas e será recuperada pela T-15.
 * - NÃO apaga a preferência de tema.
 */
export const DRAFT_KEYS = [
  'reading_draft',
  'occurrence_draft',
  'occurrence_draft_gestor',
  'occurrence_draft_tecnico',
  'analysis_draft',
]

export async function clearLocalUserData(): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const names = await caches.keys()
      await Promise.all(names.map((n) => caches.delete(n)))
    }
  } catch {
    // modo privado / sem permissão: segue o logout mesmo assim
  }
  try {
    for (const k of DRAFT_KEYS) window.localStorage.removeItem(k)
  } catch {
    // idem
  }
}
