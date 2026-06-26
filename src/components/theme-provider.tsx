'use client'

import React, { useEffect, useState } from 'react'
import { Sun, Moon } from 'lucide-react'

export function ThemeScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          try {
            let t = localStorage.getItem('theme');
            if (!t) {
              // Design é dark-first; o tema claro ainda tem ajustes de contraste
              // pendentes, então o padrão é escuro (o usuário pode alternar).
              t = 'dark';
            }
            if (t === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          } catch(e) {}
        `
      }}
    />
  )
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark' | null>(null)

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark')
    setTheme(isDark ? 'dark' : 'light')
  }, [])

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setTheme('light')
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setTheme('dark')
    }
  }

  if (theme === null) return <div className="w-8 h-8" /> // placeholder

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-100 transition-colors flex items-center justify-center"
      title="Alternar tema"
    >
      {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
