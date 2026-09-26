import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, ChevronDown, Search, TriangleAlert } from 'lucide-react'
import { useAluno } from '@/features/alunos/api'
import { avisoSaude } from '@/features/alunos/format'
import {
  usePlanos,
  useAtualizarPlano,
  useCriarPlanoDeModelo,
  buscarItensComparaveisPlano,
  sincronizarPlanoComModelo,
  type Plano,
} from '@/features/planos/api'
import { itensIguais } from '@/features/planos/compare'
import { useModelos, buscarItensComparaveisModelo, type Modelo } from '@/features/modelos/api'
import { ScaleQuestion } from '@/components/ScaleQuestion'
import { cn } from '@/lib/utils'
import { formatarNumero } from '@/lib/format'
import { Button, BottomSheet, Input } from '@/components/ui'
import { BotaoSairModoFoco } from '@/components/SairModoFoco'
import { useIniciarSessao, useSessoes, type PreTreinoInput } from './api'
import { DESCRITORES_DOR, DESCRITORES_ESTRESSE, DESCRITORES_FADIGA, DESCRITORES_SONO, type Descritor } from './descritores'
import { descritorPara, faixaProntidao } from './prontidao'
import { planoSugerido, rotuloUltimoUso } from './rotina'

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
  const aulaId = searchParams.get('aula')
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: aluno } = useAluno(id)
  const { data: planos } = usePlanos(id)
  const { data: modelos } = useModelos()
  const { data: sessoes } = useSessoes(id)
  const iniciar = useIniciarSessao(id!)
  const ativarPlano = useAtualizarPlano(id!)
  const criarDeModelo = useCriarPlanoDeModelo(id!)

  const [etapa, setEtapa] = useState<'plano' | 'aviso' | 'perguntas' | 'resumo'>(planoDaUrl ? 'perguntas' : 'plano')
  const [selecaoManual, setSelecaoManual] = useState<Selecao>(planoDaUrl ?? undefined)
  const [perguntaAtual, setPerguntaAtual] = useState(0)
  const [respostas, setRespostas] = useState<Partial<Record<ChaveResposta, number>>>({})
  const [erro, setErro] = useState<string | null>(null)

  const [inativosAbertos, setInativosAbertos] = useState(false)
  const [buscaModelo, setBuscaModelo] = useState('')
  const [conflito, setConflito] = useState<{ modelo: Modelo; planoExistente: Plano } | null>(null)
  const [avisoPendente, setAvisoPendente] = useState<{ id: string; name: string } | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [copiando, setCopiando] = useState(false)
  const [verificando, setVerificando] = useState(false)
  const [sincronizando, setSincronizando] = useState(false)

  const planosAtivos = useMemo(() => planos?.filter((p) => p.active), [planos])
  const planosInativos = useMemo(() => planos?.filter((p) => !p.active), [planos])
  const planosComExercicios = useMemo(() => planosAtivos?.filter((p) => p.plano_exercicios.length > 0), [planosAtivos])
  const sugestao = useMemo(
    () => (planosComExercicios && sessoes ? planoSugerido(planosComExercicios, sessoes) : null),
    [planosComExercicios, sessoes],
  )
  const modelosFiltrados = useMemo(
    () => modelos?.filter((m) => m.name.toLowerCase().includes(buscaModelo.trim().toLowerCase())),
    [modelos, buscaModelo],
  )

  // Se só há um plano ativo com exercícios, ele já vem selecionado.
  const selecao = selecaoManual ?? (planosComExercicios?.length === 1 ? planosComExercicios[0].id : undefined)
  const setSelecao = setSelecaoManual

  if (!id) return <Navigate to="/" replace />

  const mostrarToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const avancarComPlano = (plano: { id: string; name: string }, viaTreinoPronto: boolean) => {
    if (viaTreinoPronto && aluno && avisoSaude(aluno)) {
      setAvisoPendente(plano)
      setEtapa('aviso')
      return
    }
    setSelecao(plano.id)
    setEtapa('perguntas')
  }

  const copiarTreinoPlanejado = (m: Modelo) => {
    setCopiando(true)
    criarDeModelo.mutate(
      { id: m.id, name: m.name, notes: m.notes },
      {
        onSuccess: (planoId) => {
          setCopiando(false)
          mostrarToast('Treino adicionado ao aluno')
          avancarComPlano({ id: planoId, name: m.name }, true)
        },
        onError: (e) => {
          setCopiando(false)
          setErro((e as Error).message)
        },
      },
    )
  }

  const usarPlanoExistente = (p: Plano) => {
    if (!p.active) {
      ativarPlano.mutate({ id: p.id, active: true })
    }
    avancarComPlano(p, true)
  }

  const atualizarCopiaEUsar = async (p: Plano, m: Modelo) => {
    setSincronizando(true)
    try {
      await sincronizarPlanoComModelo(p.id, m.id)
      qc.invalidateQueries({ queryKey: ['planos', id] })
      setSincronizando(false)
      if (!p.active) ativarPlano.mutate({ id: p.id, active: true })
      avancarComPlano(p, true)
    } catch (e) {
      setSincronizando(false)
      setErro((e as Error).message)
    }
  }

  const escolherTreinoPlanejado = async (m: Modelo) => {
    if (m.modelo_exercicios.length === 0) return
    const existente = planos?.find((p) => p.modelo_origem_id === m.id)
    if (!existente) {
      copiarTreinoPlanejado(m)
      return
    }
    setVerificando(true)
    try {
      const [itensExistente, itensModelo] = await Promise.all([
        buscarItensComparaveisPlano(existente.id),
        buscarItensComparaveisModelo(m.id),
      ])
      setVerificando(false)
      if (itensExistente.length === 0) {
        await atualizarCopiaEUsar(existente, m)
        return
      }
      if (itensIguais(itensExistente, itensModelo)) {
        usarPlanoExistente(existente)
        return
      }
      setConflito({ modelo: m, planoExistente: existente })
    } catch (e) {
      setVerificando(false)
      setErro((e as Error).message)
    }
  }

  const ativarEIniciar = (p: Plano) => {
    ativarPlano.mutate({ id: p.id, active: true }, { onSuccess: () => avancarComPlano(p, false) })
  }

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
    const planoEscolhido = selecao === 'livre' || !selecao ? null : (planos?.find((p) => p.id === selecao) ?? null)
    iniciar.mutate(
      {
        plano_id: planoEscolhido?.id ?? null,
        plano_nome: planoEscolhido?.name ?? null,
        aula_id: aulaId,
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
    if (etapa === 'aviso') {
      setAvisoPendente(null)
      return setEtapa('plano')
    }
  }

  const titulo = etapa === 'plano' ? 'Escolher treino' : etapa === 'aviso' ? 'Aviso de saúde' : etapa === 'resumo' ? 'Resumo' : 'Pré-treino'

  const semPlanos = (planos?.length ?? 0) === 0
  const semTreinosProntos = (modelos?.length ?? 0) === 0
  const estadoVazio = semPlanos && semTreinosProntos

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        {etapa === 'plano' && !planoDaUrl ? (
          <BotaoSairModoFoco to={`/alunos/${id}`} />
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

      {etapa === 'plano' && estadoVazio && (
        <div className="space-y-4 rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="font-semibold">Crie o primeiro treino</p>
          <p className="text-sm text-slate-500">Monte um treino para {aluno?.name ?? 'o aluno'} ou crie um treino planejado para reutilizar depois.</p>
          <div className="space-y-2">
            <Button onClick={() => navigate(`/alunos/${id}?tab=Treinos`)} className="w-full">
              Montar treino do aluno
            </Button>
            <Button variant="ghost" onClick={() => navigate('/meus-treinos/planejados')} className="w-full">
              Criar treino planejado
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setSelecao('livre')
                setEtapa('perguntas')
              }}
              className="w-full"
            >
              Treino livre
            </Button>
          </div>
        </div>
      )}

      {etapa === 'plano' && !estadoVazio && (
        <div className="space-y-5 pb-4">
          {sugestao && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-500">Sugerido</h2>
              <button
                onClick={() => avancarComPlano(sugestao.plano, true)}
                disabled={verificando || sincronizando}
                className="w-full rounded-2xl border-2 border-brand bg-brand/10 p-4 text-left shadow-sm transition active:bg-brand/20 disabled:opacity-50"
              >
                <p className="font-medium">{sugestao.plano.name}</p>
                <p className="text-sm text-slate-500">
                  {sugestao.plano.plano_exercicios.length} exercícios · {rotuloUltimoUso(sugestao.ultimoUso)}
                </p>
              </button>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-500">Treinos do aluno</h2>
            {planosComExercicios?.length === 0 && planosAtivos && planosAtivos.length === 0 && (
              <p className="text-sm text-slate-500">Nenhum treino ativo ainda.</p>
            )}
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
                  onClick={() => avancarComPlano(p, true)}
                  disabled={verificando || sincronizando}
                  className="w-full rounded-2xl bg-white p-4 text-left shadow-sm transition active:bg-slate-50 disabled:opacity-50"
                >
                  <p className="font-medium">{p.name}</p>
                  <p className="text-sm text-slate-500">
                    {p.plano_exercicios.length} exercícios{previa && ` · ${previa}`}
                  </p>
                </button>
              )
            })}

            {planosInativos && planosInativos.length > 0 && (
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <button
                  onClick={() => setInativosAbertos((v) => !v)}
                  className="flex w-full items-center justify-between p-4 text-left text-sm font-medium text-slate-500"
                >
                  Treinos inativos ({planosInativos.length})
                  <ChevronDown size={18} className={cn('transition', inativosAbertos && 'rotate-180')} />
                </button>
                {inativosAbertos && (
                  <ul className="divide-y divide-slate-100 border-t border-slate-100">
                    {planosInativos.map((p) => {
                      const temExercicios = p.plano_exercicios.length > 0
                      return (
                        <li key={p.id} className="flex items-center justify-between gap-2 p-4">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-500">{p.name}</p>
                            <p className="text-sm text-slate-400">{p.plano_exercicios.length} exercícios</p>
                          </div>
                          {temExercicios ? (
                            <Button variant="ghost" onClick={() => ativarEIniciar(p)} disabled={ativarPlano.isPending} className="shrink-0 px-3">
                              Ativar e iniciar
                            </Button>
                          ) : (
                            <Link to={`/alunos/${id}/planos/${p.id}`} className="shrink-0 text-sm font-medium text-brand-dark">
                              Adicione exercícios
                            </Link>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {modelos && modelos.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-slate-500">Treinos planejados</h2>
              {modelos.length > 5 && (
                <div className="relative">
                  <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Buscar treino planejado"
                    value={buscaModelo}
                    onChange={(e) => setBuscaModelo(e.target.value)}
                    className="pl-10"
                  />
                </div>
              )}
              <div className="space-y-2">
                {modelosFiltrados?.map((m) => {
                  const vazio = m.modelo_exercicios.length === 0
                  const ordenados = [...m.modelo_exercicios].sort((a, b) => a.order_index - b.order_index)
                  const previa = ordenados
                    .slice(0, 3)
                    .map((i) => i.exercicio?.name)
                    .filter(Boolean)
                    .join(', ')
                  if (vazio) {
                    return (
                      <Link
                        key={m.id}
                        to={`/meus-treinos/planejados/${m.id}`}
                        className="block rounded-2xl bg-white p-4 opacity-70 shadow-sm"
                      >
                        <p className="font-medium text-slate-400">{m.name}</p>
                        <span className="text-sm font-medium text-brand-dark">Sem exercícios · toque para montar</span>
                      </Link>
                    )
                  }
                  return (
                    <button
                      key={m.id}
                      onClick={() => escolherTreinoPlanejado(m)}
                      disabled={copiando || verificando || sincronizando}
                      className="w-full rounded-2xl bg-white p-4 text-left shadow-sm transition active:bg-slate-50 disabled:opacity-50"
                    >
                      <p className="font-medium">{m.name}</p>
                      <p className="text-sm text-slate-500">
                        {m.modelo_exercicios.length} exercícios{previa && ` · ${previa}`}
                      </p>
                    </button>
                  )
                })}
                {modelosFiltrados?.length === 0 && <p className="text-sm text-slate-500">Nenhum treino planejado encontrado.</p>}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-slate-500">Outras opções</h2>
            <button
              onClick={() => {
                setSelecao('livre')
                setEtapa('perguntas')
              }}
              className="w-full rounded-2xl bg-white p-4 text-left font-medium text-slate-600 shadow-sm transition active:bg-slate-50"
            >
              Treino livre
            </button>
            <button
              onClick={() => navigate(`/alunos/${id}?tab=Treinos`)}
              className="w-full rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-left font-medium text-slate-600 shadow-sm transition active:bg-slate-50"
            >
              + Criar treino
            </button>
          </div>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
        </div>
      )}

      {etapa === 'aviso' && avisoPendente && aluno && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" />
            <span>{avisoSaude(aluno)}. Revise a prescrição antes de iniciar.</span>
          </div>
          <Button variant="ghost" onClick={() => navigate(`/alunos/${id}/planos/${avisoPendente.id}`)} className="w-full">
            Ajustar treino antes
          </Button>
          <Button
            onClick={() => {
              const p = avisoPendente
              setAvisoPendente(null)
              setSelecao(p.id)
              setEtapa('perguntas')
            }}
            className="w-full"
          >
            Seguir assim
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
            <div className="space-y-3 rounded-2xl bg-slate-100 p-4">
              <div className="text-center">
                <p className="text-sm text-slate-500">Prontidão</p>
                <p className="text-2xl font-bold">
                  {formatarNumero(bemEstar)} / 10{' '}
                  <span className={cn('text-base font-medium', faixaProntidao(bemEstar).cor)}>{faixaProntidao(bemEstar).label}</span>
                </p>
              </div>
              <div className="space-y-1 border-t border-slate-200 pt-3">
                <p className="text-xs font-medium text-slate-500">O que influenciou</p>
                {PERGUNTAS.map((p) => {
                  const valor = respostas[p.key]
                  if (valor == null) return null
                  const descritor = descritorPara(p.descritores, valor)
                  const faixa = p.polaridade === 'positiva' ? faixaProntidao(valor) : faixaProntidao(10 - valor)
                  return (
                    <p key={p.key} className={cn('text-sm', faixa.cor)}>
                      {p.titulo} {valor} · {descritor.toLowerCase()}
                    </p>
                  )
                })}
              </div>
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

      <BottomSheet open={!!conflito} onClose={() => setConflito(null)} title={conflito?.modelo.name}>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            O treino do aluno ("{conflito?.planoExistente.name}", {conflito?.planoExistente.plano_exercicios.length}{' '}
            {conflito?.planoExistente.plano_exercicios.length === 1 ? 'exercício' : 'exercícios'}) tem ajustes diferentes da versão atual do
            treino planejado ({conflito?.modelo.modelo_exercicios.length} {conflito?.modelo.modelo_exercicios.length === 1 ? 'exercício' : 'exercícios'}).
            O que fazer?
          </p>
          <button
            onClick={() => {
              const c = conflito
              setConflito(null)
              if (c) usarPlanoExistente(c.planoExistente)
            }}
            disabled={sincronizando}
            className="w-full rounded-2xl border border-slate-200 p-4 text-left active:bg-slate-50 disabled:opacity-50"
          >
            <p className="font-medium">Usar o treino do aluno</p>
            <p className="text-sm text-slate-500">Mantém os ajustes que já foram feitos pra esse aluno, sem mudar nada.</p>
          </button>
          <button
            onClick={() => {
              const c = conflito
              setConflito(null)
              if (c) atualizarCopiaEUsar(c.planoExistente, c.modelo)
            }}
            disabled={sincronizando}
            className="w-full rounded-2xl border border-slate-200 p-4 text-left active:bg-slate-50 disabled:opacity-50"
          >
            <p className="font-medium">Atualizar com o treino planejado</p>
            <p className="text-sm text-slate-500">Substitui os exercícios do aluno pelos do treino planejado atual. Os ajustes dele se perdem.</p>
          </button>
        </div>
      </BottomSheet>

      {toast && (
        <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
          <div className="rounded-full bg-slate-900 px-4 py-2 text-sm text-white shadow-lg">{toast}</div>
        </div>
      )}
    </div>
  )
}
