'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'

interface Photo {
  id: string
}

interface PhotoGalleryProps {
  occurrenceId: string
  photos: Photo[]
}

export function PhotoGallery({ occurrenceId, photos }: PhotoGalleryProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Listen to keyboard for closing and navigating the modal
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return
    if (e.key === 'Escape') {
      setIsOpen(false)
    } else if (e.key === 'ArrowRight') {
      setCurrentIndex((prev) => (prev + 1) % photos.length)
    } else if (e.key === 'ArrowLeft') {
      setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
    }
  }, [isOpen, photos.length])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!photos || photos.length === 0) return null

  return (
    <>
      {/* Thumbnail Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-2">
        {photos.map((photo, i) => (
          <button
            key={photo.id}
            onClick={() => {
              setCurrentIndex(i)
              setIsOpen(true)
            }}
            className="group relative aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted flex items-center justify-center transition-all hover:ring-2 hover:ring-brand hover:ring-offset-2 hover:ring-offset-background"
            type="button"
            aria-label={`Visualizar foto ${i + 1}`}
          >
            {/* Usamos a tag img normal para não depender de domínios externos do Next/Image caso seja storage local ou URL direta, 
                e para evitar problemas com blob URLs não registradas no next.config.js, 
                já que a API retorna o stream da imagem. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={`/api/occurrences/${occurrenceId}/photo?index=${i}`}
              alt={`Miniatura ${i + 1}`}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
              loading="lazy"
            />
            {/* Overlay Icon */}
            <div className="absolute inset-0 bg-black/30 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center pointer-events-none">
              <ZoomIn className="h-6 w-6 text-white drop-shadow-md" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox Modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)} // clique fora fecha
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button 
            className="absolute top-4 right-4 z-50 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/80 hover:text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(false)
            }}
            aria-label="Fechar"
          >
            <X className="h-6 w-6" />
          </button>

          {/* Imagem Principal */}
          <div 
            className="relative w-full max-w-5xl aspect-[4/3] sm:aspect-video flex items-center justify-center"
            onClick={(e) => e.stopPropagation()} // impede fechar ao clicar na imagem
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/occurrences/${occurrenceId}/photo?index=${currentIndex}`}
              alt={`Foto ${currentIndex + 1} da ocorrência`}
              className="max-h-full max-w-full object-contain rounded-md shadow-2xl"
            />

            {/* Controles de Navegação */}
            {photos.length > 1 && (
              <>
                <button
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/80 hover:bg-black/80 hover:text-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length)
                  }}
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white/80 hover:bg-black/80 hover:text-white transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    setCurrentIndex((prev) => (prev + 1) % photos.length)
                  }}
                  aria-label="Próximo"
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
                
                {/* Indicador de posição */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white/90 text-sm font-medium px-3 py-1 rounded-full backdrop-blur-md">
                  {currentIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
