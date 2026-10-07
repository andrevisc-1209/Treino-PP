import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, MessageSquareQuote } from 'lucide-react'
import { BottomSheet } from '@/components/ui'
import { cn } from '@/lib/utils'
import { tempoRelativo } from '@/features/execucoes/metricas'
import { MODALIDADES_CONFIG } from '@/types/modalidades'
import { useMarcarLida, useMarcarTodasLidas, useNaoLidas, useNotaDaExecucao, useNotificacoes, type Notificacao } from './api'

function Nota({ execucaoId }: { execucaoId: string }) {
  const { data, isLoading } = useNotaDaExecucao(execucaoId)
  return <p className="mt-1 whitespace-pre-line rounded-xl bg-slate-50 p-2 text-sm text-slate-700">{isLoading ? 'Carregando…' : (data ?? 'Sem observação.')}</p>
}

/** Sino do personal: contagem de não lidas e lista das últimas notificações (treinos concluídos pelos alunos). */
export function SinoNotificacoes() {
  const navigate = useNavigate()
  const { data: naoLidas = 0 } = useNaoLidas()
  const { data: lista } = useNotificacoes()
  const marcar = useMarcarLida()
  const marcarTodas = useMarcarTodasLidas()
  const [aberto, setAberto] = useState(false)
  const [notaAberta, setNotaAberta] = useState<string | null>(null)

  const abrir = (n: Notificacao) => {
    if (!n.lida) marcar.mutate(n.id)
    setAberto(false)
    navigate(`/alunos/${n.aluno_id}?tab=Performance`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-label={naoLidas > 0 ? `Notificações: ${naoLidas} não lidas` : 'Notificações'}
        className="relative flex size-12 shrink-0 items-center justify-center rounded-xl text-slate-600 active:bg-slate-100"
      >
        <Bell size={22} />
        {naoLidas > 0 && (
          <span className="absolute right-1.5 top-1.5 flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold leading-5 text-white" aria-hidden>
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      <BottomSheet open={aberto} onClose={() => setAberto(false)} title="Notificações">
        <div className="space-y-3">
          {naoLidas > 0 && (
            <button
              type="button"
              onClick={() => marcarTodas.mutate()}
              disabled={marcarTodas.isPending}
              className="min-h-11 w-full rounded-xl border border-slate-300 text-sm font-medium text-slate-700 active:bg-slate-50"
            >
              Marcar todas como lidas
            </button>
          )}
          {lista?.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Nenhuma notificação por enquanto.</p>}
          <ul className="space-y-2">
            {lista?.map((n) => {
              const m = n.payload.modalidade
              const emoji = m && MODALIDADES_CONFIG[m] ? MODALIDADES_CONFIG[m].emoji : '💪'
              return (
                <li key={n.id} className={cn('rounded-2xl border p-3', n.lida ? 'border-slate-200 bg-white' : 'border-brand bg-brand-soft')}>
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => abrir(n)} className="min-w-0 flex-1 text-left">
                      <span className="block text-sm">
                        {emoji} <strong>{n.aluno?.name ?? 'Aluno'}</strong> concluiu “{n.payload.plano_nome ?? 'treino'}”
                      </span>
                      <span className="block text-xs text-slate-500">{tempoRelativo(n.criada_em)}</span>
                    </button>
                    {n.payload.tem_notas && n.payload.execucao_id && (
                      <button
                        type="button"
                        onClick={() => setNotaAberta(notaAberta === n.id ? null : n.id)}
                        aria-expanded={notaAberta === n.id}
                        aria-label="Ler observação do aluno"
                        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-slate-500 active:bg-slate-100"
                      >
                        <MessageSquareQuote size={18} />
                      </button>
                    )}
                  </div>
                  {notaAberta === n.id && n.payload.execucao_id && <Nota execucaoId={n.payload.execucao_id} />}
                </li>
              )
            })}
          </ul>
        </div>
      </BottomSheet>
    </>
  )
}
