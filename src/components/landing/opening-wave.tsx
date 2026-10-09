'use client'

import { useEffect, useRef, useState } from 'react'

// Abertura silenciosa: toca uma vez e dissipa até fundo branco. Fallback de falha,
// timeout de 9s e prefers-reduced-motion (sem vídeo). Mídia hospedada em /public/landing.
const WAVE_WEBM = '/landing/solentis-premium-wave.webm'
const WAVE_STILL = '/landing/solentis-premium-wave-still.jpg'

export function OpeningWave() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [enabled, setEnabled] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    setEnabled(!motion.matches)
    const stop = () => {
      if (motion.matches) {
        videoRef.current?.pause()
        setEnabled(false)
        setFinished(true)
      }
    }
    motion.addEventListener('change', stop)
    const timeout = window.setTimeout(() => setFinished(true), 9000)
    return () => {
      motion.removeEventListener('change', stop)
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (!enabled) return
    const video = videoRef.current
    if (!video) return
    video.play().catch(() => setFinished(true))
  }, [enabled])

  return (
    <div
      className={`opening-wave${playing ? ' is-playing' : ''}${finished ? ' is-finished' : ''}`}
      aria-hidden="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={WAVE_STILL} alt="" />
      {enabled && (
        <video
          ref={videoRef}
          src={WAVE_WEBM}
          muted
          playsInline
          preload="metadata"
          onTimeUpdate={(event) => {
            const video = event.currentTarget
            if (Number.isFinite(video.duration) && video.currentTime >= video.duration - 0.9)
              setFinished(true)
          }}
          onPlaying={() => setPlaying(true)}
          onEnded={() => setFinished(true)}
          onError={() => setFinished(true)}
          tabIndex={-1}
        />
      )}
    </div>
  )
}
