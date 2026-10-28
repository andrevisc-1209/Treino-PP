import { Droplets, Sun, Wind } from 'lucide-react'
import { useClima } from '@/features/clima/useClima'
import { rotuloChuvaMm } from '@/features/clima/chuva'

/** Clima de hoje na cidade do personal, com uma dica para treino ao ar livre. Some se não há cidade ou se a previsão falhar. */
export function ClimaCard({ compacto = false }: { compacto?: boolean }) {
  const { data } = useClima()
  if (!data || data.semCidade) return null
  const mm = rotuloChuvaMm(data.hoje.chuvaMm)

  if (compacto) {
    return (
      <section className="mb-4 rounded-2xl bg-white px-4 py-3 shadow-sm" aria-label="Clima de hoje">
        <p className="flex items-center gap-2 text-sm">
          <span className="text-2xl" aria-hidden>
            {data.atual.emoji}
          </span>
          <span className="min-w-0 flex-1">
            <span className="font-semibold">{data.atual.temp}°C</span>
            <span className="text-slate-500"> · {data.atual.texto}</span>
            <span className="block text-xs text-slate-600">
              chuva {data.hoje.chuvaProb}%{mm ? ` · ${mm}` : ''} · UV {data.hoje.uv} · vento {data.atual.vento} km/h
            </span>
          </span>
        </p>
        <p className="mt-1.5 text-xs text-slate-600">{data.dica}</p>
      </section>
    )
  }

  return (
    <section className="mb-4 rounded-2xl bg-white p-4 shadow-sm" aria-label="Clima de hoje">
      <div className="flex items-center gap-3">
        <span className="text-4xl" aria-hidden>
          {data.atual.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {data.atual.temp}°C <span className="font-normal text-slate-500">· {data.atual.texto}</span>
          </p>
          <p className="truncate text-sm text-slate-500">
            {data.cidade}/{data.uf} · mín {data.hoje.min}° · máx {data.hoje.max}°
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1">
          <Droplets size={14} aria-hidden /> chuva {data.hoje.chuvaProb}%{mm ? ` · ${mm}` : ''}
        </span>
        <span className="inline-flex items-center gap-1">
          <Wind size={14} aria-hidden /> vento {data.atual.vento} km/h
        </span>
        <span className="inline-flex items-center gap-1">
          <Sun size={14} aria-hidden /> UV {data.hoje.uv}
        </span>
      </div>
      <p className="mt-2 rounded-xl bg-slate-50 p-2 text-sm text-slate-700">{data.dica}</p>
    </section>
  )
}
