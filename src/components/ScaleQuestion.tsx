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
  subtitulo,
  descritores,
  polaridade,
  value,
  onChange,
}: {
  titulo: string
  subtitulo?: string
  descritores: Descritor[]
  polaridade: 'positiva' | 'negativa'
  value: number | null
  onChange: (v: number) => void
}) {
  const descritorAtual = value != null ? descritores.find((d) => value >= d.min && value <= d.max) : null

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
      </div>

      <div className="text-center">
        {value != null && <p className="text-5xl font-bold tabular-nums">{value}</p>}
        <p className={cn('font-medium text-slate-500', value != null ? 'mt-1 text-sm' : 'py-2 text-base')}>
          {descritorAtual ? descritorAtual.label : 'Toque em um valor'}
        </p>
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

      <p className="truncate text-center text-xs text-slate-400">{descritores.map((d) => d.label.toLowerCase()).join(' · ')}</p>
    </div>
  )
}
