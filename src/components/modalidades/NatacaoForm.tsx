import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Sparkles, X } from 'lucide-react'
import { Field, Input } from '@/components/ui'
import { confirmarAcao } from '@/components/ConfirmSheet'
import { cn } from '@/lib/utils'
import { CHIPS_PADRAO, EXERCICIOS_NATACAO, type ExercicioNatacao } from '@/data/natacao-exercicios'
import type { TemplateNatacao } from '@/data/natacao-templates'
import { SeletorExercicioNatacao } from '@/features/natacao/SeletorExercicioNatacao'
import { AMBIENTES_NATACAO, formatarTempo, resumoTotalNatacao, type AmbienteNatacao, type BlocoNatacao, type DadosNatacao } from '@/types/natacao'

const CHIPS_DESCANSO = [15, 20, 30, 45, 60, 90]

function Chips({ valores, atual, unidade, onEscolher }: { valores: number[]; atual: number | undefined; unidade: string; onEscolher: (v: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {valores.map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={atual === v}
          onClick={() => onEscolher(v)}
          className={cn('min-h-9 rounded-full border px-3 text-xs font-medium', atual === v ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
        >
          {v}
          {unidade}
        </button>
      ))}
    </div>
  )
}

const numero = (v: string): number | undefined => (v === '' ? undefined : Number(v))

/** Um exercício do treino com seus parâmetros (distância ou tempo, séries, descanso, ritmo e observação). */
function CartaoBloco({
  bloco,
  indice,
  total,
  onChange,
  onMover,
  onRemover,
}: {
  bloco: BlocoNatacao
  indice: number
  total: number
  onChange: (b: BlocoNatacao) => void
  onMover: (delta: -1 | 1) => void
  onRemover: () => void
}) {
  const p = bloco.parametros
  const porTempo = p.tempo != null
  const lib = EXERCICIOS_NATACAO.find((e) => e.id === bloco.exercicio_id)
  const chips = lib?.chipsSugestao ?? (porTempo ? CHIPS_PADRAO.tempo : CHIPS_PADRAO.distancia)
  const atualizar = (parte: Partial<BlocoNatacao['parametros']>) => onChange({ ...bloco, parametros: { ...p, ...parte } })
  const n = indice + 1

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 p-3">
      <div className="flex items-center justify-between gap-1">
        <p className="min-w-0 truncate font-semibold">
          {bloco.is_custom && <span aria-label="Exercício seu">⭐ </span>}
          {bloco.nome}
        </p>
        <div className="flex shrink-0">
          <button type="button" onClick={() => onMover(-1)} disabled={indice === 0} aria-label={`Subir ${bloco.nome} (${n})`} className="flex size-11 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 disabled:opacity-30">
            <ArrowUp size={18} />
          </button>
          <button type="button" onClick={() => onMover(1)} disabled={indice === total - 1} aria-label={`Descer ${bloco.nome} (${n})`} className="flex size-11 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100 disabled:opacity-30">
            <ArrowDown size={18} />
          </button>
          <button type="button" onClick={onRemover} aria-label={`Remover ${bloco.nome} (${n})`} className="flex size-11 items-center justify-center rounded-xl text-red-600 active:bg-slate-100">
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Field label={porTempo ? 'Tempo (s)' : 'Distância (m)'}>
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={(porTempo ? p.tempo : p.distancia) ?? ''}
            onChange={(e) => atualizar(porTempo ? { tempo: numero(e.target.value) } : { distancia: numero(e.target.value) })}
          />
        </Field>
        {porTempo && p.tempo ? <p className="text-xs text-slate-600">= {formatarTempo(p.tempo)}</p> : null}
        <Chips valores={chips} atual={porTempo ? p.tempo : p.distancia} unidade={porTempo ? 's' : 'm'} onEscolher={(v) => atualizar(porTempo ? { tempo: v } : { distancia: v })} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Séries (1–20)">
          <Input type="number" inputMode="numeric" min={1} max={20} value={p.series} onChange={(e) => atualizar({ series: Number(e.target.value) })} />
        </Field>
        <Field label="Descanso (s)">
          <Input type="number" inputMode="numeric" min={0} value={p.descanso} onChange={(e) => atualizar({ descanso: Number(e.target.value) })} />
        </Field>
      </div>
      <Chips valores={CHIPS_DESCANSO} atual={p.descanso} unidade="s" onEscolher={(v) => atualizar({ descanso: v })} />

      <Field label="Ritmo (opcional)">
        <Input value={p.ritmo ?? ''} onChange={(e) => atualizar({ ritmo: e.target.value })} placeholder="ex.: 1:30/100m" />
      </Field>
      <Field label="Observações (opcional)">
        <textarea className="min-h-14 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand" value={p.observacao ?? ''} onChange={(e) => atualizar({ observacao: e.target.value })} />
      </Field>
    </div>
  )
}

function novoBloco(e: ExercicioNatacao, ambiente: AmbienteNatacao): BlocoNatacao {
  const valor = e.valorSugerido ?? (e.parametroPrincipal === 'tempo' ? 600 : 200)
  return {
    id: crypto.randomUUID(),
    exercicio_id: e.id,
    nome: e.nome,
    ...(e.is_custom ? { is_custom: true } : {}),
    parametros: { ...(e.parametroPrincipal === 'tempo' ? { tempo: valor } : { distancia: valor }), series: 1, descanso: ambiente === 'mar' ? 120 : 30 },
  }
}

/** Treino de natação: ambiente (piscina/mar), exercícios da biblioteca com parâmetros e modelos prontos. */
export function NatacaoForm({ dados, onChange, textoAntigo }: { dados: DadosNatacao; onChange: (d: DadosNatacao) => void; textoAntigo?: string[] }) {
  const [seletor, setSeletor] = useState<{ aba: 'biblioteca' | 'templates' } | null>(null)

  const trocarAmbiente = async (ambiente: AmbienteNatacao) => {
    if (ambiente === dados.ambiente) return
    if (dados.blocos.length > 0) {
      const ok = await confirmarAcao({
        titulo: 'Trocar ambiente',
        mensagem: 'Os exercícios do treino atual serão removidos (piscina e mar têm exercícios diferentes).',
        textoConfirmar: 'Trocar',
        destrutivo: true,
      })
      if (!ok) return
    }
    onChange({ ambiente, blocos: [] })
  }

  const usarTemplate = async (t: TemplateNatacao) => {
    if (dados.blocos.length > 0) {
      const ok = await confirmarAcao({ titulo: 'Usar modelo', mensagem: 'Os exercícios atuais serão substituídos pelos do modelo.', textoConfirmar: 'Substituir', destrutivo: true })
      if (!ok) return
    }
    onChange({ ambiente: t.ambiente, blocos: t.blocos.map((b) => ({ ...b, id: crypto.randomUUID(), parametros: { ...b.parametros } })) })
    setSeletor(null)
  }

  const mover = (i: number, delta: -1 | 1) => {
    const alvo = i + delta
    if (alvo < 0 || alvo >= dados.blocos.length) return
    const copia = [...dados.blocos]
    ;[copia[i], copia[alvo]] = [copia[alvo], copia[i]]
    onChange({ ...dados, blocos: copia })
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">Ambiente</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Ambiente da natação">
          {AMBIENTES_NATACAO.map((a) => (
            <button
              key={a.valor}
              type="button"
              role="radio"
              aria-checked={dados.ambiente === a.valor}
              onClick={() => trocarAmbiente(a.valor)}
              className={cn('min-h-12 rounded-xl border px-2 text-sm font-medium', dados.ambiente === a.valor ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
            >
              {a.emoji} {a.rotulo}
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={() => setSeletor({ aba: 'templates' })} className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-medium text-brand-hover active:bg-slate-100">
        <Sparkles size={16} /> Começar de um modelo ›
      </button>

      {textoAntigo && textoAntigo.length > 0 && dados.blocos.length === 0 && (
        <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900" role="note">
          <p className="font-medium">Este treino foi criado no formato antigo (texto livre). Refaça com a biblioteca — o que estava cadastrado:</p>
          <ul className="mt-1 list-disc pl-5">
            {textoAntigo.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </div>
      )}

      {dados.blocos.map((b, i) => (
        <CartaoBloco
          key={b.id}
          bloco={b}
          indice={i}
          total={dados.blocos.length}
          onChange={(nb) => onChange({ ...dados, blocos: dados.blocos.map((x) => (x.id === b.id ? nb : x)) })}
          onMover={(d) => mover(i, d)}
          onRemover={() => onChange({ ...dados, blocos: dados.blocos.filter((x) => x.id !== b.id) })}
        />
      ))}

      <button
        type="button"
        onClick={() => setSeletor({ aba: 'biblioteca' })}
        className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 text-sm font-medium text-slate-600 active:bg-slate-50"
      >
        <Plus size={16} /> Adicionar exercício
      </button>

      {dados.blocos.length > 0 && <p className="text-center text-sm font-medium text-slate-700">{resumoTotalNatacao(dados)}</p>}

      <SeletorExercicioNatacao
        key={seletor?.aba ?? 'fechado'}
        aberto={!!seletor}
        abaInicial={seletor?.aba ?? 'biblioteca'}
        ambiente={dados.ambiente}
        onClose={() => setSeletor(null)}
        onEscolherExercicio={(e) => {
          onChange({ ...dados, blocos: [...dados.blocos, novoBloco(e, dados.ambiente)] })
          setSeletor(null)
        }}
        onEscolherTemplate={usarTemplate}
      />
    </div>
  )
}
