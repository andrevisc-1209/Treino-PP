import { useMemo, useState } from 'react'
import { Plus, Search, Star } from 'lucide-react'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { cn } from '@/lib/utils'
import { mapearErroSupabase } from '@/lib/erros'
import { formatarNumero } from '@/lib/format'
import { EXERCICIOS_NATACAO, GRUPOS_NATACAO, serveAoAmbiente, type ExercicioNatacao } from '@/data/natacao-exercicios'
import { ROTULO_NIVEL, TEMPLATES_NATACAO, type TemplateNatacao } from '@/data/natacao-templates'
import { distanciaTotalNatacao, formatarTempo, rotuloAmbiente, tempoTotalNatacao, type AmbienteNatacao, type GrupoNatacao } from '@/types/natacao'
import { useCriarExercicioNatacao, useExerciciosNatacaoCustom } from './api'

type Aba = 'biblioteca' | 'meus' | 'templates'

function CartaoExercicio({ e, ambiente, onEscolher }: { e: ExercicioNatacao; ambiente: AmbienteNatacao; onEscolher: () => void }) {
  const serve = serveAoAmbiente(e, ambiente)
  return (
    <button
      type="button"
      onClick={onEscolher}
      disabled={!serve}
      title={serve ? undefined : `Disponível só em ${e.ambiente === 'mar' ? 'Mar Aberto' : 'Piscina'}`}
      className="flex min-h-12 w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left active:bg-slate-50 disabled:opacity-40"
    >
      <span className="min-w-0 flex-1">
        <span className="block font-medium">
          {e.is_custom && <Star size={14} className="mr-1 inline fill-amber-400 text-amber-500" aria-label="Exercício seu" />}
          {e.nome}
        </span>
        {!serve && <span className="block text-xs text-slate-500">Só em {e.ambiente === 'mar' ? 'Mar Aberto' : 'Piscina'}</span>}
      </span>
      <Plus size={18} className="shrink-0 text-slate-400" aria-hidden />
    </button>
  )
}

function CriarExercicio({ ambiente, onCriado, onCancelar }: { ambiente: AmbienteNatacao; onCriado: (e: ExercicioNatacao) => void; onCancelar: () => void }) {
  const criar = useCriarExercicioNatacao()
  const [nome, setNome] = useState('')
  const [grupo, setGrupo] = useState<GrupoNatacao>(ambiente === 'mar' ? 'mar' : 'serie')
  const [amb, setAmb] = useState<'piscina' | 'mar' | 'ambos'>(ambiente)
  const [descricao, setDescricao] = useState('')
  const [principal, setPrincipal] = useState<'distancia' | 'tempo'>(ambiente === 'mar' ? 'tempo' : 'distancia')
  const [valor, setValor] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  const salvar = () => {
    if (!nome.trim()) {
      setErro('Dê um nome ao exercício.')
      return
    }
    setErro(null)
    const n = Number(valor)
    criar.mutate(
      { nome, grupo, ambiente: amb, descricao, parametroPrincipal: principal, valorSugerido: Number.isFinite(n) && n > 0 ? n : undefined },
      { onSuccess: onCriado, onError: (e) => setErro(mapearErroSupabase(e)) },
    )
  }

  const radio = (ativo: boolean) =>
    cn('min-h-11 flex-1 rounded-xl border px-3 text-sm font-medium', ativo ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')

  return (
    <div className="space-y-3">
      <Field label="Nome *">
        <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Sprint com elástico + palmar" autoFocus />
      </Field>
      <Field label="Grupo">
        <select className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3" value={grupo} onChange={(e) => setGrupo(e.target.value as GrupoNatacao)}>
          {GRUPOS_NATACAO.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </select>
      </Field>
      <div>
        <p className="mb-1 text-sm font-medium">Ambiente</p>
        <div className="flex gap-2" role="radiogroup" aria-label="Ambiente do exercício">
          {(['piscina', 'mar', 'ambos'] as const).map((a) => (
            <button key={a} type="button" role="radio" aria-checked={amb === a} onClick={() => setAmb(a)} className={radio(amb === a)}>
              {a === 'piscina' ? 'Piscina' : a === 'mar' ? 'Mar' : 'Ambos'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 text-sm font-medium">Parâmetro principal</p>
        <div className="flex gap-2" role="radiogroup" aria-label="Parâmetro principal">
          <button type="button" role="radio" aria-checked={principal === 'distancia'} onClick={() => setPrincipal('distancia')} className={radio(principal === 'distancia')}>
            Distância (m)
          </button>
          <button type="button" role="radio" aria-checked={principal === 'tempo'} onClick={() => setPrincipal('tempo')} className={radio(principal === 'tempo')}>
            Tempo (s)
          </button>
        </div>
      </div>
      <Field label={`Valor sugerido (${principal === 'distancia' ? 'm' : 's'})`}>
        <Input type="number" inputMode="numeric" min={0} value={valor} onChange={(e) => setValor(e.target.value)} />
      </Field>
      <Field label="Descrição (opcional)">
        <textarea className="min-h-16 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
      </Field>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button onClick={salvar} disabled={criar.isPending}>
          Salvar e adicionar
        </Button>
      </div>
    </div>
  )
}

function CartaoTemplate({ t, onUsar }: { t: TemplateNatacao; onUsar: () => void }) {
  const blocos = t.blocos.map((b, i) => ({ ...b, id: String(i) }))
  const total = t.ambiente === 'mar' ? formatarTempo(tempoTotalNatacao(blocos)) : `${formatarNumero(distanciaTotalNatacao(blocos))} m`
  return (
    <div className="space-y-2 rounded-2xl border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{t.nome}</p>
          <p className="text-xs text-slate-500">
            {rotuloAmbiente(t.ambiente)} · {total}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{ROTULO_NIVEL[t.nivel]}</span>
      </div>
      <p className="text-sm text-slate-600">{t.descricao}</p>
      <ol className="list-decimal space-y-0.5 pl-5 text-xs text-slate-600">
        {t.blocos.map((b, i) => (
          <li key={i}>
            {b.nome} · {b.parametros.distancia != null ? `${b.parametros.distancia} m` : formatarTempo(b.parametros.tempo ?? 0)} × {b.parametros.series}
          </li>
        ))}
      </ol>
      <Button onClick={onUsar} className="w-full">
        Usar este modelo
      </Button>
    </div>
  )
}

/** Escolha de exercício (biblioteca da plataforma, os meus) ou de um modelo pronto de treino. */
export function SeletorExercicioNatacao({
  aberto,
  abaInicial,
  ambiente,
  onClose,
  onEscolherExercicio,
  onEscolherTemplate,
}: {
  aberto: boolean
  abaInicial: Aba
  ambiente: AmbienteNatacao
  onClose: () => void
  onEscolherExercicio: (e: ExercicioNatacao) => void
  onEscolherTemplate: (t: TemplateNatacao) => void
}) {
  const [aba, setAba] = useState<Aba>(abaInicial)
  const [grupo, setGrupo] = useState<GrupoNatacao | 'todos'>('todos')
  const [busca, setBusca] = useState('')
  const [criando, setCriando] = useState(false)
  const { data: meus } = useExerciciosNatacaoCustom()

  const termo = busca.trim().toLowerCase()
  const filtrar = (lista: ExercicioNatacao[]) =>
    lista.filter((e) => (grupo === 'todos' || e.grupo === grupo) && (!termo || e.nome.toLowerCase().includes(termo)))
  const biblioteca = useMemo(() => filtrar(EXERCICIOS_NATACAO), [grupo, termo]) // eslint-disable-line react-hooks/exhaustive-deps
  const gruposVisiveis = GRUPOS_NATACAO.filter((g) => g.key !== 'mar' || ambiente === 'mar')
  const templates = TEMPLATES_NATACAO.filter((t) => t.ambiente === ambiente)

  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'biblioteca', rotulo: 'Biblioteca' },
    { id: 'meus', rotulo: 'Meus exercícios' },
    { id: 'templates', rotulo: 'Modelos' },
  ]

  return (
    <BottomSheet open={aberto} onClose={onClose} title={`Adicionar — ${rotuloAmbiente(ambiente)}`}>
      <div className="space-y-3">
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
          {abas.map((a) => (
            <button
              key={a.id}
              type="button"
              role="tab"
              aria-selected={aba === a.id}
              onClick={() => {
                setAba(a.id)
                setCriando(false)
              }}
              className={cn('min-h-10 flex-1 rounded-lg px-2 text-sm font-medium', aba === a.id ? 'bg-white shadow-sm' : 'text-slate-500')}
            >
              {a.rotulo}
            </button>
          ))}
        </div>

        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {aba === 'biblioteca' && (
            <>
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input placeholder="Buscar exercício" value={busca} onChange={(e) => setBusca(e.target.value)} className="pl-9" />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Grupo">
                {[{ key: 'todos' as const, label: 'Todos' }, ...gruposVisiveis].map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    aria-pressed={grupo === g.key}
                    onClick={() => setGrupo(g.key)}
                    className={cn('min-h-10 shrink-0 rounded-full border px-3 text-sm font-medium', grupo === g.key ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700')}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              {biblioteca.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Nenhum exercício encontrado.</p>}
              {biblioteca.map((e) => (
                <CartaoExercicio key={e.id} e={e} ambiente={ambiente} onEscolher={() => onEscolherExercicio(e)} />
              ))}
            </>
          )}

          {aba === 'meus' &&
            (criando ? (
              <CriarExercicio ambiente={ambiente} onCancelar={() => setCriando(false)} onCriado={(e) => { setCriando(false); onEscolherExercicio(e) }} />
            ) : (
              <>
                <Button variant="outline" onClick={() => setCriando(true)} className="w-full">
                  <Plus size={16} /> Criar exercício
                </Button>
                {meus?.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Crie seu primeiro exercício.</p>}
                {meus?.map((e) => <CartaoExercicio key={e.id} e={e} ambiente={ambiente} onEscolher={() => onEscolherExercicio(e)} />)}
              </>
            ))}

          {aba === 'templates' && (
            <>
              {templates.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Sem modelos para este ambiente.</p>}
              {(['iniciante', 'intermediario', 'avancado'] as const).map((nivel) => {
                const doNivel = templates.filter((t) => t.nivel === nivel)
                if (doNivel.length === 0) return null
                return (
                  <div key={nivel} className="space-y-2">
                    <h3 className="pt-1 text-sm font-semibold text-slate-600">{ROTULO_NIVEL[nivel]}</h3>
                    {doNivel.map((t) => (
                      <CartaoTemplate key={t.id} t={t} onUsar={() => onEscolherTemplate(t)} />
                    ))}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>
    </BottomSheet>
  )
}
