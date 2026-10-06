import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Card compacto de número + rótulo (Alunos, Hoje). `alerta` = borda âmbar à esquerda. */
export function CardMetrica({ icone, valor, label, alerta }: { icone: ReactNode; valor: number | undefined; label: string; alerta?: boolean }) {
  return (
    <div className={cn('rounded-xl border bg-white p-2.5', alerta ? 'border-l-4 border-amber-500' : 'border-slate-200')}>
      <div className={cn('mb-0.5', alerta ? 'text-amber-600' : 'text-brand-hover')}>{icone}</div>
      <p className="text-lg font-bold text-accent">{valor ?? '—'}</p>
      <p className="text-[11px] leading-tight text-slate-500">{label}</p>
    </div>
  )
}
