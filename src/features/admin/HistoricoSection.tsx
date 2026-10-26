import { dataHoraSP } from '@/features/consentimentos/utils'
import { mapearErroSupabase } from '@/lib/erros'
import { ListaSkeleton } from '@/components/Skeleton'
import { ROTULO_ACAO_ADMIN } from './personais'
import { useAdminHistorico } from './api'

/** Quem fez o quê e em quem (reset de senha, trial, plano, CPF). Nunca mostra o CPF nem o e-mail enviado: só a ação, o personal e a data. */
export function HistoricoSection() {
  const { data, isLoading, error } = useAdminHistorico()
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="font-heading font-semibold text-accent">Histórico de ações do admin</h2>
      <p className="mb-3 text-sm text-slate-500">As 200 ações mais recentes feitas no painel.</p>

      {isLoading && <ListaSkeleton linhas={2} />}
      {error && <p className="py-4 text-sm text-red-600">{mapearErroSupabase(error)}</p>}
      {data?.length === 0 && <p className="py-4 text-center text-sm text-slate-500">Nenhuma ação registrada ainda.</p>}

      <ul className="divide-y divide-slate-100">
        {data?.map((h) => (
          <li key={h.id} className="py-2.5 text-sm">
            <p className="text-slate-800">
              <span className="font-medium">{ROTULO_ACAO_ADMIN[h.acao] ?? h.acao}</span> em{' '}
              <span className="font-medium">{h.personal_nome || h.personal_email || 'personal removido'}</span>
            </p>
            <p className="text-xs text-slate-500">
              {dataHoraSP(h.criado_em)} · por {h.admin_nome || 'admin'}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}
