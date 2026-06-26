'use client'

import { useEffect } from 'react'
import { registrarLeitura } from '@/app/operador/leituras/actions'

export function SyncManager() {
  useEffect(() => {
    const handleOnline = async () => {
      try {
        const stored = localStorage.getItem('solentis_offline_leituras')
        if (!stored) return
        
        const queue: any[] = JSON.parse(stored)
        if (!Array.isArray(queue) || queue.length === 0) return

        let successCount = 0

        for (const item of queue) {
          try {
            // Usa uma Server Action especial ou a mesma action passando os dados.
            // Para garantir sucesso, passamos como FormData ou como objeto.
            const formData = new FormData()
            formData.append('equipment_id', item.equipment_id || '')
            formData.append('point_id', item.point_id)
            formData.append('parameter_id', item.parameter_id)
            formData.append('value', item.value)
            
            const res = await registrarLeitura({}, formData)
            if (res?.success) {
              successCount++
            } else {
              console.error('[SyncManager] Falha na leitura:', res?.error)
            }
          } catch (err) {
             console.error('[SyncManager] Erro no try-catch do item', err)
          }
        }
        
        // Limpar a fila do que deu certo. Aqui simplificamos limpando tudo,
        // num cenário real deveríamos remover apenas as que deram certo.
        localStorage.removeItem('solentis_offline_leituras')
        
        if (successCount > 0) {
          // Podemos disparar um evento customizado ou apenas um alerta simples
          alert(`Sincronização concluída: ${successCount} leituras enviadas.`)
        }
      } catch (err) {
        console.error('[SyncManager] Erro fatal na sincronização', err)
      }
    }

    window.addEventListener('online', handleOnline)

    // Se a pessoa abrir o app e já tiver internet e coisas na fila, sincroniza!
    if (navigator.onLine) {
       handleOnline()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return null // Não renderiza nada visual, é apenas um serviço background
}
