import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useSessao } from './api'
import { PosTreino } from './PosTreino'
import { BotaoSairModoFoco } from '@/components/SairModoFoco'

export function FinalizarSessaoPage() {
  const { id, sessionId } = useParams<{ id: string; sessionId: string }>()
  const { data: sessao, isLoading } = useSessao(sessionId)
  // Enquanto concluímos o treino, o PosTreino pode precisar perguntar sobre
  // aula avulsa antes de navegar; trava o redirect automático até lá.
  const [concluindo, setConcluindo] = useState(false)

  if (!id || !sessionId) return <Navigate to="/" replace />
  if (isLoading) return <p className="p-4 text-slate-500">Carregando…</p>
  if (sessao && sessao.status !== 'em_andamento' && !concluindo) return <Navigate to={`/alunos/${id}/sessoes/${sessionId}`} replace />

  return (
    <div className="mx-auto max-w-2xl p-4">
      <header className="mb-4 flex items-center gap-3">
        <BotaoSairModoFoco to={`/alunos/${id}/sessoes/${sessionId}`} />
        <h1 className="text-xl font-bold">Pós-treino</h1>
      </header>

      <PosTreino sessionId={sessionId} alunoId={id} onConcluirInicio={() => setConcluindo(true)} />
    </div>
  )
}
