import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, Ref } from 'react'
import { Link } from 'react-router-dom'
import { Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

// Componentes base mínimos. Podem ser trocados por shadcn/ui depois
// sem mudar as telas (mesmos nomes/props).

export function Button({
  className,
  variant = 'primary',
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' | 'ghost' }) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 font-medium transition disabled:opacity-50',
        variant === 'primary' && 'bg-brand text-white active:bg-brand-hover',
        variant === 'outline' && 'border border-slate-300 bg-white text-slate-700 active:bg-slate-50',
        variant === 'ghost' && 'text-slate-600 active:bg-slate-100',
        className,
      )}
      {...p}
    />
  )
}

/**
 * Botão flutuante de criar item — padrão de todas as listas com ação de criação. Fica logo acima da
 * bottom nav e alinhado à borda direita do conteúdo (max-w-2xl). 56px: acima dos mínimos de toque.
 * As telas que o usam precisam de espaço no fim da lista (pb-20) pra ele não cobrir o último item.
 */
export function Fab({ label, onClick, to }: { label: string; onClick?: () => void; to?: string }) {
  const classe =
    'fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-[max(1rem,calc(50vw-20rem))] z-30 flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-lg transition active:bg-brand-hover'
  if (to) {
    return (
      <Link to={to} aria-label={label} className={classe} data-fab>
        <Plus size={26} />
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={classe} data-fab>
      <Plus size={26} />
    </button>
  )
}

export function Input({ className, ref, ...p }: InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
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

export function ChipsMultiSelect({
  options,
  value,
  onChange,
  disabled,
}: {
  options: readonly string[]
  value: string[]
  onChange: (v: string[]) => void
  disabled?: boolean
}) {
  const toggle = (opt: string) => {
    onChange(value.includes(opt) ? value.filter((v) => v !== opt) : [...value, opt])
  }
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selecionado = value.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            disabled={disabled}
            onClick={() => toggle(opt)}
            className={cn(
              'flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition disabled:opacity-50',
              selecionado ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
            )}
          >
            {selecionado && <Check size={16} />}
            {opt}
          </button>
        )
      })}
    </div>
  )
}

/** Switch estilo iOS/Android — OFF cinza, ON com a cor da marca. Salva na hora, sem confirmação. */
export function Switch({ checked, onChange, disabled, label }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
        checked ? 'bg-brand' : 'bg-slate-300',
      )}
    >
      <span className={cn('inline-block size-5 rounded-full bg-white shadow transition-transform', checked ? 'translate-x-6' : 'translate-x-1')} />
    </button>
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
