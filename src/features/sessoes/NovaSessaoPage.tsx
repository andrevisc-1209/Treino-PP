import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, TriangleAlert } from 'lucide-react'
import { useAluno } from '@/features/alunos/api'
import { usePlanos } from '@/features/planos/api'
import { ScaleQuestion } from '@/components/ScaleQuestion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui'
import { useIniciarSessao, type PreTreinoInput } from './api'
import { DESCRITORES_DOR, DESCRITORES_ESTRESSE, DESCRITORES_FADIGA, DESCRITORES_SONO, type Descritor } from './descritores'

type ChaveResposta = keyof Omit<PreTreinoInput, 'plano_id'>

const PERGUNTAS: { key: ChaveResposta; titulo: string; polaridade: 'positiva' | 'negativa'; descritores: Descritor[] }[] = [
  { key: 'pre_sleep', titulo: 'Sono', polaridade: 'positiva', descritores: DESCRITORES_SONO },
  { key: 'pre_stress', titulo: 'Nível de estresse', polaridade: 'negativa', descritores: DESCRITORES_ESTRESSE },
  { key: 'pre_fatigue', titulo: 'Nível de fadiga', polaridade: 'negativa', descritores: DESCRITORES_FADIGA },
  { key: 'pre_muscle_pain', titulo: 'Dor muscular', polaridade: 'negativa', descritores: DESCRITORES_DOR },
]

type Selecao = string | 'livre' | undefined

export function NovaSessaoPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const planoDaUrl = searchParams.get('plano')
  const navigate = useNavigate()
  const { data: aluno } = useAluno(id)
  const { data: planos } = usePlanos(id)
  const iniciar = useIniciarSessao(id!)

  const [etapa, setEtapa] = useState<'plano' | 'perguntas' | 'resumo'>(planoDaUrl ? 'perguntas' : 'plano')
  const [selecaoManual, setSelecaoManual] = useState<Selecao>(planoDaUrl ?? undefined)
  const [perguntaAtual, setPerguntaAtual] = useState(0)
  const [respostas, setRespostas] = useState<Partial<Record<ChaveResposta, number>>>({})
  const [erro, setErro] = useState<string | null>(null)

  const planosAtivos = useMemo(() => planos?.filter((p) => p.active), [planos])
  const planosComExercicios = useMemo(() => planosAtivos?.filter((p) => p.plano_exercicios.length > 0), [planosAtivos])

  // Se só há um plano ativo com exercícios, ele já vem selecionado.
  const selecao = selecaoManual ?? (planosComExercicios?.length === 1 ? planosComExercicios[0].id : undefined)
  const setSelecao = setSelecaoManual

  if (!id) return <Navigate to="/" replace />

  const responder = (key: ChaveResposta, v: number) => setRespostas((r) => ({ ...r, [key]: v }))

  const responderMobile = (key: ChaveResposta, v: number) => {
    responder(key, v)
    setTimeout(() => {
      setPerguntaAtual((p) => {
        const prox = p + 1
        if (prox >= PERGUNTAS.length) {
          setEtapa('resumo')
          return p
        }
        return prox
      })
    }, 300)
  }

  const bemEstar =
    respostas.pre_sleep != null && respostas.pre_stress != null && respostas.pre_fatigue != null && respostas.pre_muscle_pain != null
      ? (respostas.pre_sleep + (10 - respostas.pre_stress) + (10 - respostas.pre_fatigue) + (10 - respostas.pre_muscle_pain)) / 4
      : null

  const alerta =
    respostas.pre_sleep != null && respostas.pre_sleep <= 3
      ? 'Sono baixo'
      : respostas.pre_muscle_pain != null && respostas.pre_muscle_pain >= 7
        ? 'Dor muscular alta'
        : null

  const comecarTreino = () => {
    const completo = PERGUNTAS.every((p) => respostas[p.key] != null)
    if (!completo) {
      setErro('Responda as 4 perguntas para iniciar o treino')
      return
    }
    setErro(null)
    const planoEscolhido = selecao === 'livre' || !selecao ? null : (planosAtivos?.find((p) => p.id === selecao) ?? null)
    iniciar.mutate(
      {
        plano_id: planoEscolhido?.id ?? null,
        plano_nome: planoEscolhido?.name ?? null,
        pre_sleep: respostas.pre_sleep!,
        pre_stress: respostas.pre_stress!,
        pre_fatigue: respostas.pre_fatigue!,
        pre_muscle_pain: respostas.pre_muscle_pain!,
      },
      {
        onSuccess: (sessaoId) => navigate(`/alunos/${id}/sessoes/${sessaoId}`, { replace: true }),
        onError: (e) => setErro((e as Error).message),
      },
    )
  }

  const voltar = () => {
    if (etapa === 'resumo') return setEtapa('perguntas')
    if (etapa === 'perguntas') {
      if (perguntaAtual > 0) return setPerguntaAtual((p) => p - 1)
      return setEtapa('plano')
    }
  }

  const titulo = etapa === 'plano' ? 'Escolher plano' : etapa === 'resumo' ? 'Resumo' : 'Pré-treino'

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        {etapa === 'plano' && !planoDaUrl ? (
          <Link to={`/alunos/${id}`} className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
            <ArrowLeft size={20} />
          </Link>
        ) : (
          <button onClick={voltar} className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold">{titulo}</h1>
          {aluno && etapa !== 'plano' && <p className="truncate text-sm text-slate-500">{aluno.name}</p>}
        </div>
      </header>

      {etapa === 'plano' && (
        <div className="space-y-3 pb-4">
          <div className="space-y-2">
            {planosAtivos?.map((p) => {
              const temExercicios = p.plano_exercicios.length > 0
              const ordenados = [...p.plano_exercicios].sort((a, b) => a.order_index - b.order_index)
              const previa = ordenados
                .slice(0, 3)
                .map((i) => i.exercicio?.name)
                .filter(Boolean)
                .join(', ')
              if (!temExercicios) {
                return (
                  <div key={p.id} className="rounded-2xl bg-white p-4 opacity-70 shadow-sm">
                    <p className="font-medium text-slate-400">{p.name}</p>
                    <Link to={`/alunos/${id}/planos/${p.id}`} className="text-sm font-medium text-brand-dark">
                      Adicione exercícios
                    </Link>
                  </div>
                )
              }
              return (
                <button
                  key={p.id}
                  onClick={() => setSelecao(p.id)}
                  className={cn(
                    'w-full rounded-2xl p-4 text-left shadow-sm transition',
                    selecao === p.id ? 'bg-brand/10 ring-2 ring-brand' : 'bg-white active:bg-slate-50',
                  )}
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-slate-500">
                    {p.plano_exercicios.length} exercícios{previa && ` · ${previa}`}
                  </p>
                </button>
              )
            })}
            <button
              onClick={() => setSelecao('livre')}
              className={cn(
                'w-full rounded-2xl p-4 text-left font-medium shadow-sm transition',
                selecao === 'livre' ? 'bg-brand/10 text-slate-900 ring-2 ring-brand' : 'bg-white text-slate-600 active:bg-slate-50',
              )}
            >
              Treino livre
            </button>
          </div>
          <Button onClick={() => setEtapa('perguntas')} className="w-full" disabled={selecao === undefined}>
            Continuar
          </Button>
        </div>
      )}

      {etapa === 'perguntas' && (
        <>
          {/* Celular: uma pergunta por tela */}
          <div className="space-y-4 md:hidden">
            <div className="space-y-1">
              <p className="text-center text-xs font-medium text-slate-400">
                {perguntaAtual + 1} de {PERGUNTAS.length}
              </p>
              <div className="flex gap-1">
                {PERGUNTAS.map((p, i) => (
                  <div key={p.key} className={cn('h-1 flex-1 rounded-full', i <= perguntaAtual ? 'bg-brand' : 'bg-slate-200')} />
                ))}
              </div>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <ScaleQuestion
                titulo={PERGUNTAS[perguntaAtual].titulo}
                descritores={PERGUNTAS[perguntaAtual].descritores}
                polaridade={PERGUNTAS[perguntaAtual].polaridade}
                value={respostas[PERGUNTAS[perguntaAtual].key] ?? null}
                onChange={(v) => responderMobile(PERGUNTAS[perguntaAtual].key, v)}
              />
            </div>
          </div>

          {/* Tablet: grade 2x2 */}
          <div className="hidden md:block md:space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {PERGUNTAS.map((p) => (
                <div key={p.key} className="rounded-2xl bg-white p-4 shadow-sm">
                  <ScaleQuestion
                    titulo={p.titulo}
                    descritores={p.descritores}
                    polaridade={p.polaridade}
                    value={respostas[p.key] ?? null}
                    onChange={(v) => responder(p.key, v)}
                  />
                </div>
              ))}
            </div>
            <Button onClick={() => setEtapa('resumo')} className="w-full" disabled={!PERGUNTAS.every((p) => respostas[p.key] != null)}>
              Continuar
            </Button>
          </div>
        </>
      )}

      {etapa === 'resumo' && (
        <div className="space-y-4">
          <div className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
            {PERGUNTAS.map((p, i) => (
              <button
                key={p.key}
                onClick={() => {
                  setPerguntaAtual(i)
                  setEtapa('perguntas')
                }}
                className="flex w-full items-center justify-between p-4 text-left active:bg-slate-50"
              >
                <span className="font-medium">{p.titulo}</span>
                <span className="text-slate-500">{respostas[p.key]}</span>
              </button>
            ))}
          </div>

          {bemEstar != null && (
            <div className="rounded-2xl bg-slate-100 p-4 text-center">
              <p className="text-sm text-slate-500">Índice de bem-estar</p>
              <p className="text-2xl font-bold">{bemEstar.toFixed(1)}</p>
            </div>
          )}

          {alerta && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
              <TriangleAlert size={18} className="mt-0.5 shrink-0" />
              <span>{alerta}. Considere reduzir a intensidade.</span>
            </div>
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}
          <Button onClick={comecarTreino} className="w-full" disabled={iniciar.isPending}>
            Começar treino
          </Button>
        </div>
      )}
    </div>
  )
}
