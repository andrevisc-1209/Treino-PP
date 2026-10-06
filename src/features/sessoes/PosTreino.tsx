import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight, Clock, Flame, Info, ListChecks, Share2, Star } from 'lucide-react'
import { ScaleQuestion } from '@/components/ScaleQuestion'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { criarAulaAvulsaRealizada, finalizarAgendaAoConcluir } from '@/features/agenda/api'
import { formatarDataBR, formatarNumero } from '@/lib/format'
import { hojeSP } from '@/lib/datas'
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
  statusCargaInterna,
  textoVariacao,
  variacaoVolume,
  volumeSessao,
  volumeUltimoTreino,
  type ExercicioResumo,
  type SessaoHistorico,
} from './resumoSessao'
import { compartilharResumo } from './imagemResumo'

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
        cargaInterna: `${formatarNumero(resumo.cargaInterna)} UA`,
        statusCarga: status.label,
        duracao: `${resumo.duracaoMin} min`,
        series: String(seriesFeitas),
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

      <div className="grid grid-cols-2 gap-3">
        <Indicador icone={<Clock size={20} />} valor={`${resumo.duracaoMin} min`} label="Duração" />
        <Indicador icone={<ListChecks size={20} />} valor={String(seriesFeitas)} label="Séries concluídas" />
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

      {recordes.length > 0 && (
        <ul className="space-y-1.5">
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
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <ScaleQuestion
          titulo="Esforço percebido (PSE)"
          subtitulo="Como o aluno sentiu o treino?"
          descritores={DESCRITORES_PSE}
          polaridade="negativa"
          value={pse}
          onChange={setPse}
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <Field label="Duração (minutos)">
          <Input type="number" inputMode="numeric" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
        </Field>
      </div>

      <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <ScaleQuestion
          titulo="Avaliação do personal"
          subtitulo="Como você avalia a sessão?"
          descritores={DESCRITORES_NOTA}
          polaridade="positiva"
          value={nota}
          onChange={setNota}
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
