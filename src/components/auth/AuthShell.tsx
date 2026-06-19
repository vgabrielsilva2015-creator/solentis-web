'use client'

import React from 'react'
import { WaterCanvas } from './WaterCanvas'

interface AuthShellProps {
  children: React.ReactNode
  tagline?: string
}

export function AuthShell({ children, tagline }: AuthShellProps) {
  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-background">
      {/* Lado Esquerdo - Visual (Água animada) */}
      {/* Mobile: 40vh de altura. Desktop: 50% da largura, fixa na tela */}
      <div className="relative w-full md:w-1/2 h-[40vh] md:h-screen shrink-0 border-b md:border-b-0 md:border-r border-border overflow-hidden">
        {/* No desktop a imagem fica sticky para não rolar se o form for grande */}
        <div className="absolute inset-0 md:fixed md:w-1/2 md:h-screen">
          <WaterCanvas tagline={tagline} />
        </div>
      </div>

      {/* Lado Direito - Painel do Formulário */}
      <div className="flex-1 flex flex-col items-center justify-center bg-surface px-6 py-12 md:px-12 lg:px-16 min-h-[60vh]">
        <div className="w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
          {children}
        </div>
      </div>
    </div>
  )
}
