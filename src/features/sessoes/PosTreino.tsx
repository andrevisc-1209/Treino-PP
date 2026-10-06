import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { X, ArrowRight, Clock, Dumbbell, Flame, Info, ListChecks, Repeat, Share2, Star, TrendingUp } from 'lucide-react'
import { ScaleQuestion } from '@/components/ScaleQuestion'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { criarAulaAvulsaRealizada, finalizarAgendaAoConcluir } from '@/features/agenda/api'
import { formatarDataBR, formatarNumero } from '@/lib/format'
import { hojeSP, inicioDaSemanaSP, somarDias } from '@/lib/datas'
import { cn } from '@/lib/utils'
import { mostrarErroGlobal } from '@/components/Toast'
import { useSessoesDetalhadas } from '@/features/evolucao/api'
import { useAtualizarSessao, useSessao, useSessaoExercicios } from './api'
import { DESCRITORES_NOTA, DESCRITORES_PSE } from './descritores'
import { APP_NAME } from '@/config/app'
import iconMark from '@/assets/brand/icon-mark.png'
import { calcularProntidao, descritorPara, faixaProntidao } from './prontidao'
import {
  calcularRecordes,
  calcularSequencia,
  cumprimentoPlano,
  evolucaoPorExercicio,
  exercicioDestaque,
  exerciciosFeitos,
  gruposTrabalhados,
  textoEvolucao,
  totalRepeticoes,
  statusCargaInterna,
  textoVariacao,
  variacaoVolume,
  volumeSessao,
  volumeUltimoTreino,
  type ExercicioResumo,
  type SessaoHistorico,
} from './resumoSessao'
import { compartilharResumo } from './imagemResumo'

const CHIPS_PSE = [
  { valor: 1, label: 'Repouso' },
  { valor: 3, label: 'Leve' },
  { valor: 5, label: 'Moderado' },
  { valor: 8, label: 'Forte' },
  { valor: 10, label: 'Máximo' },
]

const CHIPS_NOTA = [
  { valor: 1, label: 'Fraco' },
  { valor: 3, label: 'Razoável' },
  { valor: 5, label: 'Bom' },
  { valor: 8, label: 'Ótimo' },
  { valor: 10, label: 'Excelente' },
]

type ResumoConcluido = { duracaoMin: number; pse: number; nota: number | null; cargaInterna: number }

function Indicador({ icone, valor, label }: { icone: ReactNode; valor: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-2xl bg-white p-4 text-center shadow-sm">
      <span className="text-slate-400" aria-hidden>
        {icone}
      </span>
      <p className="text-xl font-bold">{valor}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  )
}

function TreinoConcluidoResumo({
  alunoId,
  sessionId,
  resumo,
}: {
  alunoId: string
  sessionId: string
  resumo: ResumoConcluido
}) {
  const { data: sessao } = useSessao(sessionId)
  const { data: itens } = useSessaoExercicios(sessionId)
  const { data: detalhadas } = useSessoesDetalhadas(alunoId)
  const [compartilhando, setCompartilhando] = useState(false)

  const atual: ExercicioResumo[] = useMemo(
    () =>
      (itens ?? []).map((i) => ({
        exercicio_id: i.exercicio_id,
        nome: i.exercicio?.name ?? 'Exercício',
        series: i.sessao_series.map((s) => ({ reps: s.reps, load_kg: s.load_kg, completed: s.completed })),
        grupo: i.exercicio?.muscle_group ?? null,
        planejado: i.plano_exercicio_id != null,
      })),
    [itens],
  )
  // histórico = sessões concluídas anteriores (a atual fica de fora, mesmo se a lista já a trouxer)
  const historico: SessaoHistorico[] = useMemo(
    () =>
      (detalhadas ?? [])
        .filter((s) => s.id !== sessionId && (!sessao || s.session_date <= sessao.session_date))
        .map((s) => ({
          id: s.id,
          session_date: s.session_date,
          exercicios: s.sessao_exercicios.map((e) => ({
            exercicio_id: e.exercicio_id,
            nome: e.exercicio?.name ?? 'Exercício',
            series: e.sessao_series,
          })),
        })),
    [detalhadas, sessionId, sessao],
  )

  const seriesFeitas = atual.reduce((acc, ex) => acc + ex.series.filter((s) => s.completed).length, 0)
  const volumeTotal = volumeSessao(atual)
  const variacao = textoVariacao(variacaoVolume(volumeTotal, volumeUltimoTreino(historico)))
  const status = statusCargaInterna(resumo.cargaInterna)
  const recordes = useMemo(() => calcularRecordes(atual, historico), [atual, historico])
  const recordePrincipal = recordes.find((r) => r.tipo === 'volume') ?? recordes[0]
  const nExercicios = exerciciosFeitos(atual)
  const repeticoes = totalRepeticoes(atual)
  const plano = cumprimentoPlano(atual)
  const destaque = exercicioDestaque(atual)
  const grupos = gruposTrabalhados(atual)
  const evolucao = useMemo(() => evolucaoPorExercicio(atual, historico), [atual, historico])
  const sequencia = useMemo(
    () => calcularSequencia(historico.map((h) => h.session_date), sessao?.session_date ?? hojeSP(), inicioDaSemanaSP, (w) => somarDias(w, -7)),
    [historico, sessao],
  )
  const primeiroTreino = historico.length === 0
  const contexto = primeiroTreino ? 'Primeiro treino registrado 🎯' : `Treino #${sequencia.numeroTreino} · ${sequencia.naSemana}º da semana`
  const prontidaoInicio = sessao ? calcularProntidao(sessao) : null
  const pseLabel = descritorPara(DESCRITORES_PSE, resumo.pse)

  const textoRecorde = (r: (typeof recordes)[number]) =>
    `Novo recorde: ${r.tipo === 'volume' ? 'Maior volume' : 'Maior carga'} em ${r.exercicio} (${formatarNumero(r.valor)} kg)`

  const compartilhar = async () => {
    setCompartilhando(true)
    try {
      await compartilharResumo({
        data: formatarDataBR(sessao?.session_date ?? hojeSP()),
        volume: `${formatarNumero(volumeTotal)} kg`,
        variacao,
        contexto: primeiroTreino ? 'Primeiro treino 🎯' : `Treino #${sequencia.numeroTreino} · ${sequencia.naSemana}º da semana`,
        exercicios: String(nExercicios),
        series: String(seriesFeitas),
        repeticoes: String(repeticoes),
        destaque: destaque ? `Destaque: ${destaque.nome} · ${formatarNumero(destaque.volume)} kg` : null,
        evolucao: evolucao[0] ? `${evolucao[0].exercicio} ${textoEvolucao(evolucao[0])}` : null,
        pse: `${resumo.pse}/10 · ${pseLabel}`,
        recorde: recordePrincipal ? textoRecorde(recordePrincipal) : null,
        marca: APP_NAME,
      })
    } catch (e) {
      mostrarErroGlobal((e as Error).message)
    } finally {
      setCompartilhando(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="text-xl font-bold">Treino concluído</h1>
        <p className="text-sm text-slate-500">{contexto}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-accent p-4 text-center text-white shadow-sm">
          <p className="text-xs text-white/70">Volume total</p>
          <p className="mt-1 text-2xl font-extrabold leading-tight">{formatarNumero(volumeTotal)} kg</p>
          <p className="mt-1 text-xs text-white/80">{variacao}</p>
        </div>
        <div className="rounded-2xl bg-white p-4 text-center shadow-sm">
          <p className="text-xs text-slate-500">Carga interna</p>
          <p className="mt-1 text-2xl font-extrabold leading-tight">{formatarNumero(resumo.cargaInterna)} UA</p>
          <span className={cn('mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold', status.classe)}>{status.label}</span>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
        <p className="text-xs font-medium text-slate-500">Treino em números</p>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { icone: <Dumbbell size={18} />, valor: nExercicios, label: nExercicios === 1 ? 'exercício' : 'exercícios' },
            { icone: <ListChecks size={18} />, valor: seriesFeitas, label: seriesFeitas === 1 ? 'série' : 'séries' },
            { icone: <Repeat size={18} />, valor: repeticoes, label: 'repetições' },
            { icone: <Clock size={18} />, valor: `${resumo.duracaoMin}`, label: 'minutos' },
          ].map((m) => (
            <div key={m.label} className="flex flex-col items-center gap-0.5">
              <span className="text-slate-400" aria-hidden>
                {m.icone}
              </span>
              <p className="text-xl font-bold leading-tight">{m.valor}</p>
              <p className="text-[11px] text-slate-500">{m.label}</p>
            </div>
          ))}
        </div>
        {plano && (
          <div className="space-y-1 border-t border-slate-100 pt-3">
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-brand" style={{ width: `${plano.pct}%` }} />
            </div>
            <p className="text-xs text-slate-600">
              Cumpriu {plano.pct}% do planejado ({plano.feitas} de {plano.total} séries)
            </p>
          </div>
        )}
      </div>

      {evolucao.length > 0 && (
        <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">Evolução vs. última vez</p>
          <ul className="space-y-1.5">
            {evolucao.map((e) => (
              <li key={e.exercicio} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">{e.exercicio}</span>
                <span className="shrink-0 font-semibold text-emerald-700">
                  <TrendingUp size={14} className="mr-1 inline" aria-hidden />
                  {textoEvolucao(e)} <span className="font-normal text-slate-500">({formatarNumero(e.de)} → {formatarNumero(e.para)})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(destaque || grupos.length > 0) && (
        <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
          {destaque && (
            <p className="text-sm">
              💪 <span className="font-medium">Exercício destaque:</span> {destaque.nome} · {formatarNumero(destaque.volume)} kg
            </p>
          )}
          {grupos.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {grupos.map((g) => (
                <span key={g} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Indicador icone={<Flame size={20} />} valor={`${resumo.pse}/10`} label="PSE" />
        <Indicador icone={<Star size={20} />} valor={resumo.nota != null ? `${resumo.nota}/10` : '—'} label="Avaliação do personal" />
      </div>

      {prontidaoInicio != null && (
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-2 text-xs font-medium text-slate-500">Antes → depois</p>
          <div className="flex items-center justify-between gap-2 text-sm">
            <p>
              <span className="text-slate-500">Prontidão inicial</span>
              <br />
              <span className="font-semibold">
                {formatarNumero(prontidaoInicio)}/10 · {faixaProntidao(prontidaoInicio).label}
              </span>
            </p>
            <ArrowRight size={18} className="shrink-0 text-slate-400" aria-hidden />
            <p className="text-right">
              <span className="text-slate-500">PSE final</span>
              <br />
              <span className="font-semibold">
                {resumo.pse}/10 · {pseLabel}
              </span>
            </p>
          </div>
        </div>
      )}

      {(recordes.length > 0 || sequencia.semanasSeguidas >= 2) && (
        <ul className="space-y-1.5">
          {sequencia.semanasSeguidas >= 2 && (
            <li className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">🔥 {sequencia.semanasSeguidas} semanas seguidas treinando</li>
          )}
          {recordes.slice(0, 3).map((r) => (
            <li key={`${r.tipo}-${r.exercicio}`} className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
              🏆 {textoRecorde(r)}
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Link to="/" className="flex min-h-11 w-full items-center justify-center rounded-xl bg-brand font-medium text-white active:bg-brand-hover">
          Voltar para Hoje
        </Link>
        <Link
          to={`/alunos/${alunoId}`}
          className="flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white font-medium text-slate-700 active:bg-slate-50"
        >
          Ver ficha do aluno
        </Link>
        <button
          type="button"
          onClick={compartilhar}
          disabled={compartilhando}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl font-medium text-slate-600 active:bg-slate-100 disabled:opacity-60"
        >
          <Share2 size={18} />
          {compartilhando ? 'Gerando imagem…' : 'Compartilhar resumo'}
        </button>
      </div>

      <div className="flex items-center justify-center gap-1.5 pt-2 opacity-60">
        <img src={iconMark} alt="Personal Perto" className="h-4 w-auto" />
        <span className="text-xs text-slate-500">{APP_NAME}</span>
      </div>
    </div>
  )
}

export function PosTreino({
  sessionId,
  alunoId,
  onConcluirInicio,
}: {
  sessionId: string
  alunoId: string
  onConcluirInicio?: () => void
}) {
  const qc = useQueryClient()
  const { data: sessao } = useSessao(sessionId)
  const atualizar = useAtualizarSessao(sessionId, alunoId)
  const [perguntaAulaAvulsa, setPerguntaAulaAvulsa] = useState(false)
  const [duracaoConcluida, setDuracaoConcluida] = useState(0)
  const [salvandoAulaAvulsa, setSalvandoAulaAvulsa] = useState(false)
  const [resumo, setResumo] = useState<ResumoConcluido | null>(null)
  const resumoPendenteRef = useRef<ResumoConcluido | null>(null)

  // Se o cronômetro (tela de execução) foi usado, a duração sugerida vem do
  // tempo de fato "rodando" (pausas não contam) — ver sessionStorage gravado
  // em SessaoPage.tsx. Sem isso, cai de volta pro cálculo antigo (criação da
  // sessão até agora), que superestima quando teve pausa/intervalo no meio.
  const minutosDecorridos = sessao ? Math.max(1, Math.round((Date.now() - new Date(sessao.created_at).getTime()) / 60000)) : 0

  const [pse, setPse] = useState<number | null>(null)
  const [duracao, setDuracao] = useState<string>('')
  const [nota, setNota] = useState<number | null>(null)
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [explicarCarga, setExplicarCarga] = useState(false)

  useEffect(() => {
    if (!sessao) return
    const raw = sessionStorage.getItem(`cronometro:${sessionId}`)
    if (raw) {
      sessionStorage.removeItem(`cronometro:${sessionId}`)
      try {
        const dados = JSON.parse(raw) as { usado: boolean; segundos: number }
        if (dados.usado) {
          setDuracao(String(Math.max(1, Math.round(dados.segundos / 60))))
          return
        }
      } catch {
        // dado corrompido, cai no fallback abaixo
      }
    }
    setDuracao(String(minutosDecorridos))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!sessao])

  const cargaInterna = pse != null && duracao.trim() ? pse * Number(duracao) : null

  const concluir = () => {
    if (pse == null) {
      setErro('Informe o PSE')
      return
    }
    if (!duracao.trim() || Number(duracao) <= 0) {
      setErro('Informe a duração')
      return
    }
    setErro(null)
    onConcluirInicio?.()
    const duracaoMin = Number(duracao)
    const novoResumo: ResumoConcluido = { duracaoMin, pse, nota, cargaInterna: pse * duracaoMin }
    atualizar.mutate(
      {
        status: 'concluida',
        post_pse: pse,
        duration_minutes: duracaoMin,
        prof_rating: nota,
        prof_notes: observacao.trim() || null,
      },
      {
        onSuccess: async () => {
          try {
            const resultado = await finalizarAgendaAoConcluir({ sessaoId: sessionId, alunoId, aulaId: sessao?.aula_id ?? null })
            qc.invalidateQueries({ queryKey: ['aulas'] })
            if (resultado === 'sem-aula-hoje') {
              setDuracaoConcluida(duracaoMin)
              resumoPendenteRef.current = novoResumo
              setPerguntaAulaAvulsa(true)
              return
            }
          } catch {
            // a agenda é um bônus sobre o treino já concluído — uma falha aqui não deve travar o professor
          }
          setResumo(novoResumo)
        },
        onError: (e) => setErro((e as Error).message),
      },
    )
  }

  const responderAulaAvulsa = async (criar: boolean) => {
    if (criar) {
      setSalvandoAulaAvulsa(true)
      try {
        await criarAulaAvulsaRealizada({ alunoId, sessaoId: sessionId, durationMin: duracaoConcluida })
        qc.invalidateQueries({ queryKey: ['aulas'] })
      } catch {
        // segue mesmo se falhar — o treino já foi concluído normalmente
      }
      setSalvandoAulaAvulsa(false)
    }
    setPerguntaAulaAvulsa(false)
    setResumo(resumoPendenteRef.current)
  }

  if (resumo) return <TreinoConcluidoResumo alunoId={alunoId} sessionId={sessionId} resumo={resumo} />

  return (
    <div className="md:fixed md:inset-0 md:z-40 md:flex md:items-center md:justify-center md:bg-slate-900/50 md:p-4">
      <div role="dialog" aria-label="Pós-treino" className="space-y-6 md:max-h-full md:w-full md:max-w-lg md:overflow-y-auto md:rounded-2xl md:bg-white md:p-6 md:shadow-xl">
      <div className="hidden items-center justify-between md:flex">
        <h2 className="text-xl font-bold">Pós-treino</h2>
        <Link to={`/alunos/${alunoId}/sessoes/${sessionId}`} className="flex size-11 items-center justify-center rounded-xl active:bg-slate-100" aria-label="Fechar">
          <X size={20} />
        </Link>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm md:rounded-none md:bg-transparent md:p-0 md:shadow-none">
        <ScaleQuestion
          titulo="Esforço percebido (PSE)"
          subtitulo="Como o aluno sentiu o treino?"
          descritores={DESCRITORES_PSE}
          polaridade="negativa"
          value={pse}
          onChange={setPse}
          chips={CHIPS_PSE}
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm md:rounded-none md:bg-transparent md:p-0 md:shadow-none">
        <Field label="Duração (minutos)">
          <Input type="number" inputMode="numeric" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
        </Field>
        {duracao.trim() !== '' && Number(duracao) > 0 && Number(duracao) < 5 && (
          <p className="mt-2 text-xs text-amber-700">Confira a duração: menos de 5 minutos.</p>
        )}
      </div>

      <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm md:rounded-none md:bg-transparent md:p-0 md:shadow-none">
        <ScaleQuestion
          titulo="Avaliação do personal"
          subtitulo="Como você avalia a sessão?"
          descritores={DESCRITORES_NOTA}
          polaridade="positiva"
          value={nota}
          onChange={setNota}
          chips={CHIPS_NOTA}
        />
        <Field label="Observação">
          <textarea
            className="min-h-20 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 outline-none focus:border-brand"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </Field>
      </div>

      {cargaInterna != null && (
        <div className="rounded-2xl bg-slate-100 p-4 text-center">
          <div className="flex items-center justify-center gap-1.5">
            <p className="text-sm text-slate-500">Carga interna</p>
            <button type="button" onClick={() => setExplicarCarga(true)} aria-label="O que é carga interna?" className="flex size-6 items-center justify-center text-slate-400">
              <Info size={14} />
            </button>
          </div>
          <p className="text-2xl font-bold">{formatarNumero(cargaInterna)} UA</p>
          <p className="text-xs text-slate-500">
            PSE {pse} × {duracao} min
          </p>
        </div>
      )}

      <BottomSheet open={explicarCarga} onClose={() => setExplicarCarga(false)} title="Carga interna">
        <p className="text-sm leading-relaxed text-slate-600">
          Método de Foster: carga interna (em UA, unidades arbitrárias) = PSE (esforço percebido de 0 a 10) × duração do treino em minutos. É uma
          forma simples de comparar o quanto cada sessão exigiu do aluno, mesmo entre treinos bem diferentes.
        </p>
      </BottomSheet>

      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <Button onClick={concluir} className="w-full" disabled={atualizar.isPending}>
        Concluir treino
      </Button>
      </div>

      <BottomSheet open={perguntaAulaAvulsa} onClose={() => responderAulaAvulsa(false)} title="Registrar como aula avulsa?">
        <div className="space-y-3">
          <p className="text-sm text-slate-500">Não há aula prevista hoje para este aluno. Registrar este treino como aula avulsa para cobrança?</p>
          <Button onClick={() => responderAulaAvulsa(true)} className="w-full" disabled={salvandoAulaAvulsa}>
            Sim, registrar
          </Button>
          <Button variant="ghost" onClick={() => responderAulaAvulsa(false)} className="w-full" disabled={salvandoAulaAvulsa}>
            Não
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
