import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Field, Input } from '@/components/ui'
import { configTipoCorrida, TIPOS_CORRIDA } from '@/data/corrida-tipos'
import { totalCorrida, type BlocoCorrida, type DadosCorrida, type TipoCorrida } from '@/types/corrida'
import { formatarTempo } from '@/types/natacao'
import { CabecalhoBloco, Chips, SeletorTipoTreino, ZonasFc } from './comum'
import { numero } from './numero'

const CHIPS_DESCANSO = [30, 60, 90, 120, 180]
const TIPOS_SERIES: TipoCorrida[] = ['intervalado-curto', 'intervalado-longo', 'hill-repeats']

function novoBloco(tipo: TipoCorrida): BlocoCorrida {
  const c = configTipoCorrida(tipo)
  const base: BlocoCorrida = { id: crypto.randomUUID(), tipo, nome: c.nome }
  if (tipo === 'strides') return { ...base, aceleracoes: 6, tempo_serie: 20, descanso: 60 }
  if (TIPOS_SERIES.includes(tipo)) return { ...base, series: 6, distancia_serie: c.chipsSugestao[0], descanso: 90 }
  const v = c.chipsSugestao[1] ?? c.chipsSugestao[0]
  return c.parametroPrincipal === 'distancia' ? { ...base, distancia: v } : { ...base, tempo: v }
}

function CartaoBloco({ bloco, indice, total, onChange, onMover, onRemover }: { bloco: BlocoCorrida; indice: number; total: number; onChange: (b: BlocoCorrida) => void; onMover: (d: -1 | 1) => void; onRemover: () => void }) {
  const c = configTipoCorrida(bloco.tipo)
  const set = (p: Partial<BlocoCorrida>) => onChange({ ...bloco, ...p })
  const strides = bloco.tipo === 'strides'
  const comSeries = TIPOS_SERIES.includes(bloco.tipo)

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
      <CabecalhoBloco titulo={bloco.nome} indice={indice} total={total} onMover={onMover} onRemover={onRemover} />

      {strides ? (
        <>
          <Field label="Acelerações">
            <Input type="number" inputMode="numeric" min={1} value={bloco.aceleracoes ?? ''} onChange={(e) => set({ aceleracoes: numero(e.target.value) })} />
          </Field>
          <Chips valores={c.chipsSugestao} atual={bloco.aceleracoes} unidade="" onEscolher={(v) => set({ aceleracoes: v })} />
          <Field label="Duração de cada aceleração (s)">
            <Input type="number" inputMode="numeric" min={1} value={bloco.tempo_serie ?? ''} onChange={(e) => set({ tempo_serie: numero(e.target.value) })} />
          </Field>
        </>
      ) : comSeries ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Séries">
              <Input type="number" inputMode="numeric" min={1} value={bloco.series ?? ''} onChange={(e) => set({ series: numero(e.target.value) })} />
            </Field>
            <Field label="Distância da série (m)">
              <Input type="number" inputMode="numeric" min={1} value={bloco.distancia_serie ?? ''} onChange={(e) => set({ distancia_serie: numero(e.target.value) })} />
            </Field>
          </div>
          <Chips valores={c.chipsSugestao} atual={bloco.distancia_serie} unidade="m" onEscolher={(v) => set({ distancia_serie: v })} />
        </>
      ) : (
        <div className="space-y-1.5">
          <Field label={c.parametroPrincipal === 'distancia' ? 'Distância (km)' : 'Tempo (min)'}>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={(c.parametroPrincipal === 'distancia' ? bloco.distancia : bloco.tempo) ?? ''}
              onChange={(e) => set(c.parametroPrincipal === 'distancia' ? { distancia: numero(e.target.value) } : { tempo: numero(e.target.value) })}
            />
          </Field>
          <Chips valores={c.chipsSugestao} atual={c.parametroPrincipal === 'distancia' ? bloco.distancia : bloco.tempo} unidade={c.parametroPrincipal === 'distancia' ? 'km' : 'min'} onEscolher={(v) => set(c.parametroPrincipal === 'distancia' ? { distancia: v } : { tempo: v })} />
        </div>
      )}

      {(comSeries || strides) && (
        <div className="space-y-1.5">
          <Field label="Descanso (s)">
            <Input type="number" inputMode="numeric" min={0} value={bloco.descanso ?? ''} onChange={(e) => set({ descanso: numero(e.target.value) })} />
          </Field>
          <Chips valores={CHIPS_DESCANSO} atual={bloco.descanso} unidade="s" onEscolher={(v) => set({ descanso: v })} />
          {bloco.descanso ? <p className="text-xs text-slate-600">= {formatarTempo(bloco.descanso)}</p> : null}
        </div>
      )}

      <Field label="Pace alvo (min/km, opcional)">
        <Input value={bloco.pace_alvo ?? ''} onChange={(e) => set({ pace_alvo: e.target.value })} placeholder="5:30" />
      </Field>
      <ZonasFc atual={bloco.zona_fc} onEscolher={(z) => set({ zona_fc: z })} />
      <Field label="Observações (opcional)">
        <Input value={bloco.observacao ?? ''} onChange={(e) => set({ observacao: e.target.value })} />
      </Field>
    </div>
  )
}

/** Treino de corrida: tipos de treino (regenerativo, intervalado, long run…) com distância/tempo, pace e zona de FC. */
export function CorridaForm({ dados, onChange }: { dados: DadosCorrida; onChange: (d: DadosCorrida) => void }) {
  const [seletor, setSeletor] = useState(false)
  const mover = (i: number, delta: -1 | 1) => {
    const alvo = i + delta
    if (alvo < 0 || alvo >= dados.blocos.length) return
    const copia = [...dados.blocos]
    ;[copia[i], copia[alvo]] = [copia[alvo], copia[i]]
    onChange({ blocos: copia })
  }
  const total = totalCorrida(dados.blocos)

  return (
    <div className="space-y-4">
      {dados.blocos.map((b, i) => (
        <CartaoBloco
          key={b.id}
          bloco={b}
          indice={i}
          total={dados.blocos.length}
          onChange={(nb) => onChange({ blocos: dados.blocos.map((x) => (x.id === b.id ? nb : x)) })}
          onMover={(d) => mover(i, d)}
          onRemover={() => onChange({ blocos: dados.blocos.filter((x) => x.id !== b.id) })}
        />
      ))}
      <button type="button" onClick={() => setSeletor(true)} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-600 active:bg-slate-50">
        <Plus size={16} /> Adicionar tipo de treino
      </button>
      {total && <p className="text-center text-sm font-medium text-slate-700">Total: {total}</p>}
      <SeletorTipoTreino
        aberto={seletor}
        titulo="Tipo de treino de corrida"
        tipos={TIPOS_CORRIDA}
        onClose={() => setSeletor(false)}
        onEscolher={(id) => {
          onChange({ blocos: [...dados.blocos, novoBloco(id as TipoCorrida)] })
          setSeletor(false)
        }}
      />
    </div>
  )
}
