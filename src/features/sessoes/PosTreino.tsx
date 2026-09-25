import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ScaleQuestion } from '@/components/ScaleQuestion'
import { BottomSheet, Button, Field, Input } from '@/components/ui'
import { criarAulaAvulsaRealizada, finalizarAgendaAoConcluir } from '@/features/agenda/api'
import { useAtualizarSessao, useSessao } from './api'
import { DESCRITORES_NOTA, DESCRITORES_PSE } from './descritores'

export function PosTreino({
  sessionId,
  alunoId,
  onConcluirInicio,
}: {
  sessionId: string
  alunoId: string
  onConcluirInicio?: () => void
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: sessao } = useSessao(sessionId)
  const atualizar = useAtualizarSessao(sessionId, alunoId)
  const [perguntaAulaAvulsa, setPerguntaAulaAvulsa] = useState(false)
  const [duracaoConcluida, setDuracaoConcluida] = useState(0)
  const [salvandoAulaAvulsa, setSalvandoAulaAvulsa] = useState(false)

  const minutosDecorridos = sessao ? Math.max(1, Math.round((Date.now() - new Date(sessao.created_at).getTime()) / 60000)) : 0

  const [pse, setPse] = useState<number | null>(null)
  const [duracao, setDuracao] = useState<string>('')
  const [nota, setNota] = useState<number | null>(null)
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState<string | null>(null)

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
              setPerguntaAulaAvulsa(true)
              return
            }
          } catch {
            // a agenda é um bônus sobre o treino já concluído — uma falha aqui não deve travar o professor
          }
          navigate(`/alunos/${alunoId}`, { replace: true })
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
    navigate(`/alunos/${alunoId}`, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <ScaleQuestion titulo="Esforço percebido (PSE)" descritores={DESCRITORES_PSE} polaridade="negativa" value={pse} onChange={setPse} />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm">
        <Field label="Duração (minutos)">
          <Input type="number" inputMode="numeric" value={duracao} onChange={(e) => setDuracao(e.target.value)} />
        </Field>
      </div>

      <div className="space-y-4 rounded-2xl bg-white p-4 shadow-sm">
        <ScaleQuestion titulo="Avaliação do professor" descritores={DESCRITORES_NOTA} polaridade="positiva" value={nota} onChange={setNota} />
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
          <p className="text-sm text-slate-500">Carga interna (PSE × duração)</p>
          <p className="text-2xl font-bold">{cargaInterna} UA</p>
        </div>
      )}

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
