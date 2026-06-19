'use client'

import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export function PasswordField({ label = "Senha", ...props }: PasswordFieldProps) {
  const [show, setShow] = useState(false)

  return (
    <div className="space-y-1.5">
      <label htmlFor={props.id || props.name} className="block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <Input
          {...props}
          type={show ? 'text' : 'password'}
          className={`h-11 rounded-[10px] bg-surface-2 border-border focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary/40 pr-10 ${props.className || ''}`}
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShow(!show)}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
