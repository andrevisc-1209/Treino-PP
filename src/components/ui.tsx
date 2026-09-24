import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Componentes base mínimos. Podem ser trocados por shadcn/ui depois
// sem mudar as telas (mesmos nomes/props).

export function Button({ className, variant = 'primary', ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-medium transition disabled:opacity-50',
        variant === 'primary' && 'bg-brand text-white active:bg-brand-dark',
        variant === 'ghost' && 'text-slate-600 active:bg-slate-100',
        className,
      )}
      {...p}
    />
  )
}

export function Input({ className, ...p }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn('min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-brand', className)}
      {...p}
    />
  )
}

export function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </label>
  )
}
