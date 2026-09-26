import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { ScaleQuestion } from '@/components/ScaleQuestion'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { criarAulaAvulsaRealizada, finalizarAgendaAoConcluir } from '@/features/agenda/api'
import { formatarNumero } from '@/lib/format'
import { useAtualizarSessao, useSessao, useSessaoExercicios } from './api'
import { DESCRITORES_NOTA, DESCRITORES_PSE } from './descritores'
import { calcularProntidao, faixaProntidao } from './prontidao'

type ResumoConcluido = { duracaoMin: number; pse: number; nota: number | null; cargaInterna: number }

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

  const seriesFeitas = itens?.reduce((acc, ex) => acc + ex.sessao_series.filter((s) => s.completed).length, 0) ?? 0
  const volumeTotal =
    itens?.reduce((acc, ex) => acc + ex.sessao_series.filter((s) => s.completed).reduce((a, s) => a + (s.reps ?? 0) * (s.load_kg ?? 0), 0), 0) ?? 0
  const prontidaoInicio = sessao ? calcularProntidao(sessao) : null

  const linhas: { label: string; valor: string }[] = [
    { label: 'Duração', valor: `${resumo.duracaoMin} min` },
    { label: 'Séries feitas', valor: String(seriesFeitas) },
    { label: 'Volume total', valor: `${formatarNumero(volumeTotal)} kg` },
    { label: 'PSE', valor: String(resumo.pse) },
    ...(resumo.nota != null ? [{ label: 'Avaliação do personal', valor: String(resumo.nota) }] : []),
    { label: 'Carga interna', valor: `${formatarNumero(resumo.cargaInterna)} UA` },
    ...(prontidaoInicio != null ? [{ label: 'Prontidão no início', valor: `${formatarNumero(prontidaoInicio)}/10 · ${faixaProntidao(prontidaoInicio).label}` }] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <p className="text-4xl">🎉</p>
        <h1 className="text-xl font-bold">Treino concluído</h1>
      </div>

      <dl className="divide-y divide-slate-100 rounded-2xl bg-white shadow-sm">
        {linhas.map((l) => (
          <div key={l.label} className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-slate-500">{l.label}</dt>
            <dd className="font-semibold">{l.valor}</dd>
          </div>
        ))}
      </dl>

      <div className="space-y-2">
        <Link to="/" className="flex min-h-11 w-full items-center justify-center rounded-xl bg-brand font-medium text-white active:bg-brand-dark">
          Voltar para Hoje
        </Link>
        <Link
          to={`/alunos/${alunoId}`}
          className="flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white font-medium text-slate-700 active:bg-slate-50"
        >
          Ver ficha do aluno
        </Link>
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

  const minutosDecorridos = sessao ? Math.max(1, Math.round((Date.now() - new Date(sessao.created_at).getTime()) / 60000)) : 0

  const [pse, setPse] = useState<number | null>(null)
  const [duracao, setDuracao] = useState<string>('')
  const [nota, setNota] = useState<number | null>(null)
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [explicarCarga, setExplicarCarga] = useState(false)

  useEffect(() => {
    if (sessao) setDuracao(String(minutosDecorridos))
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
