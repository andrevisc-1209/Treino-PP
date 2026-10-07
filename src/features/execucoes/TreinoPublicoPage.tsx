import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Check, CircleAlert, CircleCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import logoPP from '@/assets/brand/logo-personal-perto-sm.png'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { formatarNumero } from '@/lib/format'
import { MODALIDADES_CONFIG, type ModalidadeDetalhes, type ModalidadeTipo } from '@/types/modalidades'
import { FormResultadoModalidade, ReferenciaTreino } from './ResultadoModalidade'
import { detalhesDoResultado, RESULTADO_VAZIO, type EstadoResultado } from './resultado'

type ExercicioPublico = {
  exercicio_id: string
  nome: string
  series: number
  repeticoes: string
  carga_kg: number | null
  descanso_seg: number | null
  observacao: string | null
}
type Treino = { nome: string; modalidade: ModalidadeTipo; detalhes: ModalidadeDetalhes; exercicios: ExercicioPublico[] }
type Resposta = {
  estado: 'valido' | 'invalido' | 'expirado' | 'usado' | 'concluido'
  treino?: Treino
  primeiro_nome_aluno?: string | null
  nome_personal?: string | null
}

const MENSAGENS = {
  invalido: { titulo: 'Link inválido', texto: 'Este link não é válido. Peça ao seu personal para enviar o treino de novo.' },
  expirado: { titulo: 'Link expirado', texto: 'Este link passou da validade (7 dias). Peça ao seu personal para enviar um novo.' },
  usado: { titulo: 'Treino já registrado', texto: 'Este treino já foi registrado. Para fazer outro, peça um novo link ao seu personal.' },
} as const

async function chamar(token: string, corpo: Record<string, unknown>): Promise<Resposta> {
  const { data, error } = await supabase.functions.invoke<Resposta>('treino-publico', { body: { token, ...corpo } })
  if (error || !data) throw new Error('Não foi possível concluir agora. Confira sua conexão e tente novamente.')
  return data
}

type Progresso = { series: Record<string, boolean[]>; obs: Record<string, string>; resultado: EstadoResultado }
const PROGRESSO_VAZIO: Progresso = { series: {}, obs: {}, resultado: RESULTADO_VAZIO }

/** Página PÚBLICA do aluno (sem login): vê o treino, marca o que fez e registra a execução. */
export function TreinoPublicoPage() {
  const { token = '' } = useParams<{ token: string }>()
  const [resp, setResp] = useState<Resposta | null>(null)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [progresso, setProgresso] = useState<Progresso>(() => {
    // sinal ruim na academia: o que já foi marcado sobrevive a recarregar a página
    try {
      const salvo = localStorage.getItem(`treino-pub:${token}`)
      return salvo ? (JSON.parse(salvo) as Progresso) : PROGRESSO_VAZIO
    } catch {
      return PROGRESSO_VAZIO
    }
  })

  useEffect(() => {
    let ativo = true
    chamar(token, { acao: 'consultar' })
      .then((r) => ativo && setResp(r))
      .catch((e: Error) => ativo && setErroCarga(e.message))
    return () => {
      ativo = false
    }
  }, [token])

  const salvarProgresso = (p: Progresso) => {
    setProgresso(p)
    try {
      localStorage.setItem(`treino-pub:${token}`, JSON.stringify(p))
    } catch {
      // armazenamento indisponível: segue só em memória
    }
  }

  const treino = resp?.treino
  const musc = treino?.modalidade === 'musculacao'

  const feitos = useMemo(() => {
    if (!treino || !musc) return { feitos: 0, total: 0 }
    const f = treino.exercicios.filter((e) => (progresso.series[e.exercicio_id] ?? []).filter(Boolean).length >= e.series).length
    return { feitos: f, total: treino.exercicios.length }
  }, [treino, musc, progresso.series])

  const concluir = async () => {
    if (!treino) return
    setErro(null)
    setEnviando(true)
    try {
      const detalhes =
        treino.modalidade === 'musculacao'
          ? {
              exercicios: treino.exercicios.map((e) => ({
                exercicio_id: e.exercicio_id,
                series_feitas: Math.min(e.series, (progresso.series[e.exercicio_id] ?? []).filter(Boolean).length),
                obs: progresso.obs[e.exercicio_id] ?? '',
              })),
            }
          : detalhesDoResultado(treino.modalidade, treino.detalhes, progresso.resultado)
      const r = await chamar(token, {
        acao: 'concluir',
        detalhes,
        notas: progresso.resultado.notas,
      })
      if (r.estado === 'concluido') {
        try {
          localStorage.removeItem(`treino-pub:${token}`)
        } catch {
          // ignora
        }
      }
      setResp(r)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  const casca = (filho: React.ReactNode) => (
    <main className="min-h-dvh bg-slate-50 p-4 pb-28">
      <div className="mx-auto max-w-md space-y-5">
        <img src={logoPP} alt="Personal Perto" className="mx-auto h-10 w-auto" />
        {filho}
      </div>
    </main>
  )

  if (!resp && !erroCarga) return casca(<p className="py-10 text-center text-sm text-slate-500">Carregando treino…</p>)
  if (!resp) return casca(<p className="py-10 text-center text-sm text-red-600">{erroCarga}</p>)

  if (resp.estado === 'concluido') {
    return casca(
      <div className="space-y-3 rounded-2xl bg-white p-6 text-center shadow-sm">
        <div className="pop-in flex justify-center text-brand" aria-hidden>
          <CircleCheck size={56} />
        </div>
        <h1 className="font-heading text-xl font-bold text-accent">Treino registrado! ✅</h1>
        <p className="text-sm text-slate-600">Seu personal poderá ver o que você fez. Bom trabalho! 💪</p>
      </div>,
    )
  }

  if (resp.estado !== 'valido' || !treino) {
    const m = MENSAGENS[resp.estado as keyof typeof MENSAGENS] ?? MENSAGENS.invalido
    return casca(
      <div className="space-y-3 rounded-2xl bg-white p-6 text-center shadow-sm">
        <div className="flex justify-center text-amber-500" aria-hidden>
          <CircleAlert size={48} />
        </div>
        <h1 className="font-heading text-xl font-bold text-accent">{m.titulo}</h1>
        <p className="text-sm text-slate-600">{m.texto}</p>
      </div>,
    )
  }

  const cfg = MODALIDADES_CONFIG[treino.modalidade]
  const pct = feitos.total > 0 ? Math.round((feitos.feitos / feitos.total) * 100) : 0

  return casca(
    <>
      <header className="space-y-1 text-center">
        <p className="text-sm text-slate-500">{resp.primeiro_nome_aluno ? `Olá, ${resp.primeiro_nome_aluno}!` : 'Olá!'}</p>
        <h1 className="font-heading text-2xl font-bold text-accent">{treino.nome}</h1>
        <p className="text-sm text-slate-500">
          {cfg.emoji} {cfg.label}
          {resp.nome_personal ? ` · ${resp.nome_personal}` : ''}
        </p>
      </header>

      {treino.modalidade === 'musculacao' ? (
        <>
          <div className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso do treino">
              <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-center text-xs text-slate-600">
              {feitos.feitos} de {feitos.total} exercícios concluídos
            </p>
          </div>
          <ul className="space-y-3">
            {treino.exercicios.map((e) => {
              const marcadas = progresso.series[e.exercicio_id] ?? Array.from({ length: e.series }, () => false)
              return (
                <li key={e.exercicio_id} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                  <div>
                    <p className="font-semibold">{e.nome}</p>
                    <p className="text-sm text-slate-600">
                      {e.series} × {e.repeticoes}
                      {e.carga_kg != null ? ` · ${formatarNumero(e.carga_kg)} kg` : ''}
                      {e.descanso_seg != null ? ` · descanso ${e.descanso_seg}s` : ''}
                    </p>
                    {e.observacao && <p className="text-sm text-slate-500">{e.observacao}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2" role="group" aria-label={`Séries de ${e.nome}`}>
                    {Array.from({ length: e.series }, (_, i) => {
                      const feita = !!marcadas[i]
                      return (
                        <button
                          key={i}
                          type="button"
                          role="checkbox"
                          aria-checked={feita}
                          aria-label={`Série ${i + 1}`}
                          onClick={() =>
                            salvarProgresso({
                              ...progresso,
                              series: { ...progresso.series, [e.exercicio_id]: Array.from({ length: e.series }, (_, j) => (j === i ? !feita : !!marcadas[j])) },
                            })
                          }
                          className={cn(
                            'flex size-12 items-center justify-center rounded-xl border text-sm font-semibold',
                            feita ? 'border-brand bg-brand text-white' : 'border-slate-300 bg-white text-slate-700',
                          )}
                        >
                          {feita ? <Check size={20} aria-hidden /> : i + 1}
                        </button>
                      )
                    })}
                  </div>
                  <input
                    aria-label={`Observação sobre ${e.nome}`}
                    placeholder="Observação (opcional)"
                    maxLength={300}
                    value={progresso.obs[e.exercicio_id] ?? ''}
                    onChange={(ev) => salvarProgresso({ ...progresso, obs: { ...progresso.obs, [e.exercicio_id]: ev.target.value } })}
                    className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-brand"
                  />
                </li>
              )
            })}
          </ul>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="notas-treino">
              Como foi o treino? (opcional)
            </label>
            <textarea
              id="notas-treino"
              className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
              maxLength={1000}
              value={progresso.resultado.notas}
              onChange={(ev) => salvarProgresso({ ...progresso, resultado: { ...progresso.resultado, notas: ev.target.value } })}
            />
          </div>
        </>
      ) : (
        <>
          <ReferenciaTreino modalidade={treino.modalidade} detalhes={treino.detalhes} />
          <FormResultadoModalidade
            modalidade={treino.modalidade}
            detalhes={treino.detalhes}
            estado={progresso.resultado}
            onEstado={(resultado) => salvarProgresso({ ...progresso, resultado })}
            dicaNotas="Como foi? Dor ou lesão, fale direto com seu personal."
          />
        </>
      )}

      {erro && <p className="text-center text-sm text-red-600">{erro}</p>}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-md">
          <Button onClick={concluir} className="w-full" disabled={enviando}>
            {enviando ? 'Enviando…' : 'Concluir treino'}
          </Button>
        </div>
      </div>
    </>,
  )
}
