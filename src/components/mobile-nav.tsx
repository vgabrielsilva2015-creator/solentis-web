'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function MobileNav({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Fechar o menu ao trocar de rota
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Prevenir scroll do fundo quando aberto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'auto'
    }
    return () => { document.body.style.overflow = 'auto' }
  }, [isOpen])

  return (
    <div className="lg:hidden flex items-center">
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2 -ml-2 mr-2 text-slate-300 hover:text-white rounded-md hover:bg-slate-800 transition-colors focus:outline-none"
        aria-label="Abrir menu"
      >
        <Menu className="w-6 h-6" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop Escuro */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Painel do Menu (Barra Lateral Móvel) */}
          <div className="relative flex w-64 flex-col bg-slate-900 border-r border-slate-800 h-full overflow-y-auto shadow-2xl">
            <div className="absolute right-2 top-2 z-50">
              <button 
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800/50 rounded-full hover:bg-slate-700 transition-colors"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mt-8 flex-1">
              {children}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
