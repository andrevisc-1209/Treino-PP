import { Minus, Plus, X } from 'lucide-react'

function formatarMMSS(segundos: number): string {
  const m = Math.floor(segundos / 60)
  const s = segundos % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export function DescansoBar({
  segundosRestantes,
  onMenos15,
  onMais15,
  onPular,
}: {
  segundosRestantes: number
  onMenos15: () => void
  onMais15: () => void
  onPular: () => void
}) {
  return (
    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
      <span className="shrink-0 text-sm font-medium text-slate-500">Descanso</span>
      <button
        onClick={onMenos15}
        aria-label="Menos 15 segundos"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-600 active:bg-slate-100"
      >
        <Minus size={16} />
      </button>
      <span className="flex-1 text-center font-mono text-2xl font-bold tabular-nums">{formatarMMSS(segundosRestantes)}</span>
      <button
        onClick={onMais15}
        aria-label="Mais 15 segundos"
        className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-600 active:bg-slate-100"
      >
        <Plus size={16} />
      </button>
      <button
        onClick={onPular}
        className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl px-3 text-sm font-medium text-slate-600 active:bg-slate-100"
      >
        <X size={16} /> Pular
      </button>
    </div>
  )
}
