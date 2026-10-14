import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Field, Input } from '@/components/ui'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { cn } from '@/lib/utils'
import { CHIPS_CICLISMO, tiposCiclismo } from '@/data/ciclismo-tipos'
import { rotuloAmbienteCiclismo, totalCiclismo, type AmbienteCiclismo, type BlocoCiclismo, type DadosCiclismo, type TipoCiclismo } from '@/types/ciclismo'
import { formatarTempo } from '@/types/natacao'
import { CabecalhoBloco, Chips, SeletorTipoTreino, ZonasFc } from './comum'
import { numero } from './numero'
import { useExerciciosParaBloco } from '@/features/exercicios/api'

const TIPOS_SERIES: TipoCiclismo[] = ['hiit', 'piramide', 'subidas', 'sprints']
const CHIPS_DESCANSO = [30, 60, 90, 120, 180]

function novoBloco(tipo: TipoCiclismo, ambiente: AmbienteCiclismo): BlocoCiclismo {
  const cfg = tiposCiclismo(ambiente).find((t) => t.id === tipo)!
  const base: BlocoCiclismo = { id: crypto.randomUUID(), tipo, nome: cfg.nome }
  if (TIPOS_SERIES.includes(tipo)) return { ...base, series: 6, tempo_serie: 60, descanso: 90 }
  return cfg.parametroPrincipal === 'distancia' ? { ...base, distancia: 40 } : { ...base, tempo: 45 }
}

function CartaoBloco({ bloco, ambiente, indice, total, onChange, onMover, onRemover }: { bloco: BlocoCiclismo; ambiente: AmbienteCiclismo; indice: number; total: number; onChange: (b: BlocoCiclismo) => void; onMover: (d: -1 | 1) => void; onRemover: () => void }) {
  const cfg = tiposCiclismo(ambiente).find((t) => t.id === bloco.tipo)
  const set = (p: Partial<BlocoCiclismo>) => onChange({ ...bloco, ...p })
  const comSeries = TIPOS_SERIES.includes(bloco.tipo)
  const porDistancia = cfg?.parametroPrincipal === 'distancia'

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
      <CabecalhoBloco titulo={bloco.nome} indice={indice} total={total} onMover={onMover} onRemover={onRemover} />

      {comSeries ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Séries">
              <Input type="number" inputMode="numeric" min={1} value={bloco.series ?? ''} onChange={(e) => set({ series: numero(e.target.value) })} />
            </Field>
            <Field label="Tempo da série (s)">
              <Input type="number" inputMode="numeric" min={1} value={bloco.tempo_serie ?? ''} onChange={(e) => set({ tempo_serie: numero(e.target.value) })} />
            </Field>
          </div>
          {bloco.tempo_serie ? <p className="text-xs text-slate-600">cada série = {formatarTempo(bloco.tempo_serie)}</p> : null}
          <Field label="Descanso (s)">
            <Input type="number" inputMode="numeric" min={0} value={bloco.descanso ?? ''} onChange={(e) => set({ descanso: numero(e.target.value) })} />
          </Field>
          <Chips valores={CHIPS_DESCANSO} atual={bloco.descanso} unidade="s" onEscolher={(v) => set({ descanso: v })} />
        </>
      ) : (
        <div className="space-y-1.5">
          <Field label={porDistancia ? 'Distância (km)' : 'Tempo (min)'}>
            <Input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={(porDistancia ? bloco.distancia : bloco.tempo) ?? ''}
              onChange={(e) => set(porDistancia ? { distancia: numero(e.target.value) } : { tempo: numero(e.target.value) })}
            />
          </Field>
          {!porDistancia && bloco.tempo ? <p className="text-xs text-slate-600">= {formatarTempo(bloco.tempo * 60)}</p> : null}
          <Chips valores={porDistancia ? CHIPS_CICLISMO.distancia : CHIPS_CICLISMO.tempo} atual={porDistancia ? bloco.distancia : bloco.tempo} unidade={porDistancia ? 'km' : 'min'} onEscolher={(v) => set(porDistancia ? { distancia: v } : { tempo: v })} />
        </div>
      )}

      {ambiente === 'indoor' ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Potência alvo (W)">
            <Input type="number" inputMode="numeric" min={0} value={bloco.watts_alvo ?? ''} onChange={(e) => set({ watts_alvo: numero(e.target.value) })} />
          </Field>
          <Field label="Cadência (rpm)">
            <Input type="number" inputMode="numeric" min={0} value={bloco.cadencia_alvo ?? ''} onChange={(e) => set({ cadencia_alvo: numero(e.target.value) })} />
          </Field>
        </div>
      ) : (
        <Field label="Velocidade alvo (km/h)">
          <Input type="number" inputMode="decimal" min={0} step="any" value={bloco.velocidade_alvo ?? ''} onChange={(e) => set({ velocidade_alvo: numero(e.target.value) })} />
        </Field>
      )}
      <ZonasFc atual={bloco.zona_fc} onEscolher={(z) => set({ zona_fc: z })} />
      <Field label="Observações (opcional)">
        <Input value={bloco.observacao ?? ''} onChange={(e) => set({ observacao: e.target.value })} />
      </Field>
    </div>
  )
}

/** Treino de ciclismo: ambiente (indoor com watts/cadência, outdoor com km/velocidade) e tipos de treino por ambiente. */
export function CiclismoForm({ dados, onChange, ambienteFixo, incluirBrick }: { dados: DadosCiclismo; onChange: (d: DadosCiclismo) => void; ambienteFixo?: AmbienteCiclismo; incluirBrick?: boolean }) {
  const [seletor, setSeletor] = useState(false)
  const ambiente = ambienteFixo ?? dados.ambiente
  const meus = useExerciciosParaBloco('ciclismo', { ambiente, incluirBrick })

  const trocarAmbiente = async (novo: AmbienteCiclismo) => {
    if (novo === dados.ambiente) return
    if (dados.blocos.length > 0) {
      const ok = await confirmarAcao({ titulo: 'Trocar ambiente', mensagem: 'Os blocos atuais serão removidos (indoor e outdoor têm tipos e parâmetros diferentes).', textoConfirmar: 'Trocar', destrutivo: true })
      if (!ok) return
    }
    onChange({ ambiente: novo, blocos: [] })
  }
  const mover = (i: number, delta: -1 | 1) => {
    const alvo = i + delta
    if (alvo < 0 || alvo >= dados.blocos.length) return
    const copia = [...dados.blocos]
    ;[copia[i], copia[alvo]] = [copia[alvo], copia[i]]
    onChange({ ...dados, blocos: copia })
  }
  const total = totalCiclismo({ ambiente, blocos: dados.blocos })

  return (
    <div className="space-y-4">
      {!ambienteFixo && (
        <div>
          <p className="mb-2 text-sm font-medium">Ambiente</p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Ambiente do ciclismo">
            {(['indoor', 'outdoor'] as const).map((a) => (
              <button key={a} type="button" role="radio" aria-checked={dados.ambiente === a} onClick={() => trocarAmbiente(a)} className={cn('min-h-12 rounded-xl border px-2 text-sm font-medium', dados.ambiente === a ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}>
                {a === 'indoor' ? '🚴' : '🌄'} {rotuloAmbienteCiclismo(a)}
              </button>
            ))}
          </div>
        </div>
      )}

      {dados.blocos.map((b, i) => (
        <CartaoBloco
          key={b.id}
          bloco={b}
          ambiente={ambiente}
          indice={i}
          total={dados.blocos.length}
          onChange={(nb) => onChange({ ...dados, blocos: dados.blocos.map((x) => (x.id === b.id ? nb : x)) })}
          onMover={(d) => mover(i, d)}
          onRemover={() => onChange({ ...dados, blocos: dados.blocos.filter((x) => x.id !== b.id) })}
        />
      ))}
      <button type="button" onClick={() => setSeletor(true)} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-600 active:bg-slate-50">
        <Plus size={16} /> Adicionar tipo de treino
      </button>
      {total && <p className="text-center text-sm font-medium text-slate-700">Total: {total}</p>}
      <SeletorTipoTreino
        aberto={seletor}
        titulo={`Tipo de treino — ${rotuloAmbienteCiclismo(ambiente)}`}
        tipos={tiposCiclismo(ambiente)}
        onClose={() => setSeletor(false)}
        onEscolher={(id) => {
          onChange({ ...dados, blocos: [...dados.blocos, novoBloco(id as TipoCiclismo, ambiente)] })
          setSeletor(false)
        }}
        meus={meus}
        onEscolherExercicio={(e) => {
          onChange({ ...dados, blocos: [...dados.blocos, { ...novoBloco(e.tipoId as TipoCiclismo, ambiente), nome: e.nome, exercicio_id: e.id }] })
          setSeletor(false)
        }}
      />
    </div>
  )
}
