import { Field, Input } from '@/components/ui'
import type { DadosBrick } from '@/types/brick'
import { CiclismoForm } from './CiclismoForm'
import { CorridaForm } from './CorridaForm'
import { numero } from './numero'

/** Brick (bike → corrida): bloco de bike (outdoor), transição opcional (T2) e bloco de corrida. */
export function BrickForm({ dados, onChange }: { dados: DadosBrick; onChange: (d: DadosBrick) => void }) {
  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-2xl border border-slate-200 p-3">
        <h3 className="font-semibold">🚴 Ciclismo</h3>
        <CiclismoForm dados={{ ambiente: 'outdoor', blocos: dados.blocos_bike }} ambienteFixo="outdoor" onChange={(c) => onChange({ ...dados, blocos_bike: c.blocos })} />
      </section>

      <div className="rounded-2xl bg-slate-50 p-3">
        <Field label="⏱ Transição (T2) — tempo alvo em min (opcional)">
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            placeholder="2"
            value={dados.transicao_segundos != null ? dados.transicao_segundos / 60 : ''}
            onChange={(e) => {
              const m = numero(e.target.value)
              onChange({ ...dados, transicao_segundos: m && m > 0 ? Math.round(m * 60) : undefined })
            }}
          />
        </Field>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 p-3">
        <h3 className="font-semibold">🏃 Corrida</h3>
        <CorridaForm dados={{ blocos: dados.blocos_corrida }} onChange={(c) => onChange({ ...dados, blocos_corrida: c.blocos })} />
      </section>
    </div>
  )
}
