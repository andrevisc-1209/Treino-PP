import { BottomSheet } from '@/components/ui'
import { dataHoraSP } from '@/features/consentimentos/utils'
import { descreverExecucao, MODALIDADES_CONFIG } from '@/types/modalidades'
import type { Execucao } from './api'

const ROTULO_STATUS = { em_andamento: 'Em andamento', concluido: 'Concluído', cancelado: 'Cancelado' } as const

/** Resultado registrado de uma execução (pelo aluno, pelo link, ou pelo personal na aula) + observações. */
export function DetalheExecucaoSheet({ execucao, onClose }: { execucao: Execucao | null; onClose: () => void }) {
  const cfg = execucao ? MODALIDADES_CONFIG[execucao.modalidade] : null
  const linhas = execucao ? descreverExecucao(execucao.modalidade, execucao.detalhes_execucao) : []
  return (
    <BottomSheet open={!!execucao} onClose={onClose} title={execucao && cfg ? `${cfg.emoji} ${execucao.plano_nome ?? cfg.label}` : ''}>
      {execucao && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {ROTULO_STATUS[execucao.status]} em {dataHoraSP(execucao.concluido_em ?? execucao.created_at)} ·{' '}
            {execucao.origem === 'link' ? 'registrado pelo aluno' : 'registrado por você na aula'}
          </p>
          {linhas.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum resultado preenchido.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {linhas.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          )}
          {execucao.notas_aluno && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-medium text-slate-500">Observações</p>
              <p className="whitespace-pre-line text-sm text-slate-700">{execucao.notas_aluno}</p>
            </div>
          )}
        </div>
      )}
    </BottomSheet>
  )
}
