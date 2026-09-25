import { cn } from '@/lib/utils'
import type { Descritor } from '@/features/sessoes/descritores'

// Rampa de 5 cores: ruim → bom (vermelho → verde). Para perguntas de
// polaridade negativa (alto = ruim) a rampa é percorrida ao contrário.
const RAMPA = ['#e34948', '#eb6834', '#eda100', '#1baf7a', '#008300']

function corDoValor(valor: number, polaridade: 'positiva' | 'negativa'): string {
  const passo = Math.min(4, Math.floor(valor / 2.2))
  const indice = polaridade === 'positiva' ? passo : 4 - passo
  return RAMPA[indice]
}

export function ScaleQuestion({
  titulo,
  descritores,
  polaridade,
  value,
  onChange,
}: {
  titulo: string
  descritores: Descritor[]
  polaridade: 'positiva' | 'negativa'
  value: number | null
  onChange: (v: number) => void
}) {
  const descritorAtual = value != null ? descritores.find((d) => value >= d.min && value <= d.max) : null

  return (
    <div className="space-y-4">
      <h2 className="text-center text-lg font-semibold">{titulo}</h2>

      <div className="text-center">
        <p className="text-5xl font-bold tabular-nums">{value ?? '–'}</p>
        <p className="mt-1 text-sm font-medium text-slate-500">{descritorAtual ? descritorAtual.label : 'Toque em um valor'}</p>
      </div>

      <div className="grid grid-cols-11 gap-0.5">
        {Array.from({ length: 11 }, (_, n) => {
          const cor = corDoValor(n, polaridade)
          const selecionado = value === n
          return (
            <button
              key={n}
              type="button"
              onClick={() => {
                onChange(n)
                if ('vibrate' in navigator) navigator.vibrate(10)
              }}
              className={cn('h-12 w-full rounded-md text-xs font-semibold transition', selecionado ? 'text-white' : 'text-slate-700')}
              style={{ backgroundColor: selecionado ? cor : `${cor}26` }}
              aria-label={`${n}`}
              aria-pressed={selecionado}
            >
              {n}
            </button>
          )
        })}
      </div>

      <div className="flex flex-wrap justify-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
        {descritores.map((d) => (
          <span key={d.label}>
            {d.min}–{d.max} {d.label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  )
}
