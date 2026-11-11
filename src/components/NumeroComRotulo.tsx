import { cn } from '@/lib/utils'

/** Número (ou tempo) em destaque com um rótulo curto embaixo; `destaque` pinta de âmbar (pede atenção). */
export function NumeroComRotulo({ valor, rotulo, destaque }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <div className={cn('rounded-xl px-3 py-2', destaque ? 'bg-amber-50' : 'bg-slate-50')}>
      <p className="text-lg font-bold leading-tight text-slate-900">{valor}</p>
      <p className="text-xs text-slate-700">{rotulo}</p>
    </div>
  )
}
