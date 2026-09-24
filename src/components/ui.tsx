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

export function ScaleGrid({
  value,
  onChange,
  labels,
  disabled,
}: {
  value: number | null
  onChange: (v: number) => void
  labels?: Record<number, string>
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 11 }, (_, n) => (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange(n)}
            className={cn(
              'flex min-h-12 items-center justify-center rounded-xl border text-base font-semibold transition disabled:opacity-50',
              value === n ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
            )}
          >
            {n}
          </button>
        ))}
      </div>
      {labels && (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
          {Object.entries(labels).map(([n, label]) => (
            <span key={n}>
              {n} = {label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

export function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-4 pb-8 shadow-lg">
        {title && <h2 className="mb-3 text-lg font-semibold">{title}</h2>}
        {children}
      </div>
    </div>
  )
}
