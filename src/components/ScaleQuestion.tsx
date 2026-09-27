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

/** Gradiente fixo do início ao fim da barra — já vai na ordem certa pra cada polaridade. */
function gradienteDaBarra(polaridade: 'positiva' | 'negativa'): string {
  const cores = polaridade === 'positiva' ? RAMPA : [...RAMPA].reverse()
  return `linear-gradient(to right, ${cores.join(', ')})`
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
  const valorAtual = value ?? 0
  const cor = corDoValor(valorAtual, polaridade)

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{titulo}</h2>
        {subtitulo && <p className="text-sm text-slate-500">{subtitulo}</p>}
      </div>

      <div className="text-center">
        {value != null && (
          <p className="text-5xl font-bold tabular-nums" style={{ color: cor }}>
            {value}
          </p>
        )}
        <p className={cn('font-medium text-slate-500', value != null ? 'mt-1 text-sm' : 'py-2 text-base')}>
          {descritorAtual ? descritorAtual.label : 'Arraste pra escolher um valor'}
        </p>
      </div>

      <div className="px-1">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={valorAtual}
          onChange={(e) => {
            onChange(Number(e.target.value))
            if ('vibrate' in navigator) navigator.vibrate(10)
          }}
          className="h-3 w-full touch-none appearance-none rounded-full outline-none [&::-moz-range-thumb]:size-8 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-current [&::-moz-range-thumb]:shadow-md [&::-webkit-slider-thumb]:size-8 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-current [&::-webkit-slider-thumb]:shadow-md"
          style={{ background: gradienteDaBarra(polaridade), color: cor }}
          aria-label={titulo}
          aria-valuenow={value ?? undefined}
          aria-valuemin={0}
          aria-valuemax={10}
        />
        <div className="mt-1 flex justify-between text-xs text-slate-400">
          <span>{descritores[0]?.label}</span>
          <span>{descritores[descritores.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  )
}
