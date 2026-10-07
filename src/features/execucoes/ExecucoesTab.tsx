import { useState } from 'react'
import { BottomSheet } from '@/components/ui'
import { ListaSkeleton } from '@/components/Skeleton'
import { mapearErroSupabase } from '@/lib/erros'
import { cn } from '@/lib/utils'
import { dataHoraSP } from '@/features/consentimentos/utils'
import { descreverExecucao, MODALIDADES_CONFIG } from '@/types/modalidades'
import { useExecucoes, type Execucao } from './api'

const ROTULO_STATUS = { em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado' } as const
const CLASSE_STATUS = {
  em_andamento: 'bg-amber-100 text-amber-900',
  concluido: 'bg-emerald-100 text-emerald-800',
  cancelado: 'bg-slate-100 text-slate-700',
} as const

/** Treinos que o aluno registrou pelo link (ou que o personal registrou na aula), do mais recente ao mais antigo. */
export function ExecucoesTab({ alunoId }: { alunoId: string }) {
  const { data: execucoes, isLoading, error } = useExecucoes(alunoId)
  const [aberta, setAberta] = useState<Execucao | null>(null)

  if (isLoading) return <ListaSkeleton />
  if (error) return <p className="text-red-600">{mapearErroSupabase(error)}</p>

  return (
    <div className="space-y-3">
      {execucoes?.length === 0 && (
        <p className="text-sm text-slate-500">
          Nenhum treino registrado ainda. Quando o aluno concluir um treino enviado pelo WhatsApp (ou você registrar uma aula presencial de outra
          modalidade), ele aparece aqui.
        </p>
      )}

      <ul className="space-y-2">
        {execucoes?.map((e) => {
          const cfg = MODALIDADES_CONFIG[e.modalidade]
          return (
            <li key={e.id} className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {cfg.emoji} {e.plano_nome ?? cfg.label}
                </p>
                <p className="text-sm text-slate-500">
                  {dataHoraSP(e.concluido_em ?? e.created_at)} · {e.origem === 'link' ? 'pelo link do aluno' : 'aula presencial'}
                </p>
                <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold', CLASSE_STATUS[e.status])}>{ROTULO_STATUS[e.status]}</span>
              </div>
              <button
                onClick={() => setAberta(e)}
                className="min-h-11 shrink-0 rounded-xl border border-slate-300 px-3 text-sm font-medium text-slate-700 active:bg-slate-50"
              >
                Ver detalhes
              </button>
            </li>
          )
        })}
      </ul>

      <BottomSheet open={!!aberta} onClose={() => setAberta(null)} title={aberta ? `${MODALIDADES_CONFIG[aberta.modalidade].emoji} ${aberta.plano_nome ?? MODALIDADES_CONFIG[aberta.modalidade].label}` : ''}>
        {aberta && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {ROTULO_STATUS[aberta.status]} em {dataHoraSP(aberta.concluido_em ?? aberta.created_at)} ·{' '}
              {aberta.origem === 'link' ? 'registrado pelo aluno' : 'registrado por você na aula'}
            </p>
            {(() => {
              const linhas = descreverExecucao(aberta.modalidade, aberta.detalhes_execucao)
              return linhas.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhum resultado preenchido.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {linhas.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              )
            })()}
            {aberta.notas_aluno && (
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-medium text-slate-500">Observações</p>
                <p className="whitespace-pre-line text-sm text-slate-700">{aberta.notas_aluno}</p>
              </div>
            )}
          </div>
        )}
      </BottomSheet>
    </div>
  )
}
