'use client'

import React from 'react'
import Link from 'next/link'
import { Logo } from '@/components/logo'
import { AlertCircle } from 'lucide-react'

// --- AuthHeader ---
export function AuthHeader({ title, subtitle }: { title: string, subtitle?: string }) {
  return (
    <div className="mb-8 space-y-4">
      {/* Logo aparece aqui apenas no mobile, pois no desktop já está no canvas */}
      <div className="md:hidden mb-6">
        <Logo size="sm" />
      </div>
      
      <div>
        <h1 className="text-2xl font-display tracking-tight text-foreground">{title}</h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
        )}
      </div>

      <div className="h-px w-10 bg-border mt-4" />
    </div>
  )
}

// --- AuthFooterLink ---
export function AuthFooterLink({ href, label, align = 'center' }: { href: string, label: React.ReactNode, align?: 'left' | 'center' | 'right' }) {
  return (
    <div className={`mt-6 text-sm text-muted-foreground ${align === 'center' ? 'text-center' : align === 'left' ? 'text-left' : 'text-right'}`}>
      <Link href={href} className="hover:text-foreground underline-offset-4 hover:underline transition-colors">
        {label}
      </Link>
    </div>
  )
}

// --- FormError ---
export function FormError({ message }: { message?: string }) {
  if (!message) return null
  
  return (
    <div className="flex items-start gap-2 p-3 bg-alarm/5 border border-alarm/30 rounded-lg text-sm text-alarm animate-in fade-in slide-in-from-top-2">
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
      <p>{message}</p>
    </div>
  )
}

// --- PasswordStrength ---
export function PasswordStrength({ password }: { password?: string }) {
  // Mock simple strength logic
  const len = password?.length || 0
  let strength = 0
  if (len > 0) strength++
  if (len >= 6) strength++
  if (len >= 10 && /[A-Z]/.test(password || '')) strength++
  if (len >= 10 && /[0-9]/.test(password || '') && /[^A-Za-z0-9]/.test(password || '')) strength++

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1 h-1">
        <div className={`flex-1 rounded-full ${strength >= 1 ? 'bg-alarm' : 'bg-surface-3'}`} />
        <div className={`flex-1 rounded-full ${strength >= 2 ? 'bg-amber-500' : 'bg-surface-3'}`} />
        <div className={`flex-1 rounded-full ${strength >= 3 ? 'bg-data' : 'bg-surface-3'}`} />
        <div className={`flex-1 rounded-full ${strength >= 4 ? 'bg-success' : 'bg-surface-3'}`} />
      </div>
      <p className="text-[10px] text-muted-foreground text-right uppercase tracking-wider">
        {strength === 0 && ' '}
        {strength === 1 && 'Muito Fraca'}
        {strength === 2 && 'Fraca'}
        {strength === 3 && 'Boa'}
        {strength === 4 && 'Forte'}
      </p>
    </div>
  )
}
