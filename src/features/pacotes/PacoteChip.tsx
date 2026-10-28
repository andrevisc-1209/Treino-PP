import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SituacaoPacote } from './pacote'

const COR: Record<SituacaoPacote['nivel'], string> = {
  ok: 'bg-slate-100 text-slate-700',
  atencao: 'bg-amber-50 text-amber-800',
  esgotado: 'bg-red-50 text-red-700',
}

/** Etiqueta do pacote: "Pacote 2/10", ou o aviso quando está acabando ("Faltam 3 aulas · 7/10"). */
export function PacoteChip({ situacao, className }: { situacao: SituacaoPacote; className?: string }) {
  const texto = situacao.aviso ? `${situacao.aviso} · ${situacao.contador}` : `Pacote ${situacao.contador}`
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', COR[situacao.nivel], className)}>
      <Package size={12} aria-hidden /> {texto}
    </span>
  )
}
