import { useId, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Seção expansível (card). `alterado` mostra um ponto âmbar quando há mudança ainda não salva dentro dela. */
export function Acordeao({
  titulo,
  aberto,
  onAlternar,
  alterado,
  children,
}: {
  titulo: string
  aberto: boolean
  onAlternar: () => void
  alterado?: boolean
  children: ReactNode
}) {
  const idCorpo = useId()
  return (
    <section className="rounded-2xl bg-white shadow-sm">
      <h2>
        <button
          type="button"
          onClick={onAlternar}
          aria-expanded={aberto}
          aria-controls={idCorpo}
          className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2 text-left font-semibold"
        >
          <span className="flex items-center gap-2">
            {titulo}
            {alterado && <span className="size-2 rounded-full bg-amber-500" role="img" aria-label="alterações não salvas" />}
          </span>
          <ChevronDown size={20} className={cn('shrink-0 text-slate-400 transition-transform', aberto && 'rotate-180')} />
        </button>
      </h2>
      {aberto && (
        <div id={idCorpo} role="region" aria-label={titulo} className="space-y-4 px-4 pb-4">
          {children}
        </div>
      )}
    </section>
  )
}
