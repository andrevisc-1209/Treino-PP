import { Link } from 'react-router-dom'
import { useSessoes } from './api'

export function HistoricoTab({ alunoId }: { alunoId: string }) {
  const { data: sessoes, isLoading, error } = useSessoes(alunoId)

  if (isLoading) return <p className="text-slate-500">Carregando…</p>
  if (error) return <p className="text-red-600">{(error as Error).message}</p>
  if (sessoes?.length === 0) return <p className="text-sm text-slate-500">Nenhuma sessão registrada ainda.</p>

  return (
    <ul className="space-y-2">
      {sessoes?.map((s) => {
        const cargaInterna = s.post_pse != null && s.duration_minutes != null ? s.post_pse * s.duration_minutes : null
        return (
          <li key={s.id}>
            <Link to={`/alunos/${alunoId}/sessoes/${s.id}`} className="block rounded-2xl bg-white p-4 shadow-sm active:bg-slate-50">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 font-medium">
                  {s.plano_nome ?? 'Treino livre'}
                  {s.plano_nome != null && s.plano_id == null && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">plano excluído</span>
                  )}
                </p>
                <span className="text-sm text-slate-500">{s.session_date}</span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {s.status === 'em_andamento' && 'Em andamento'}
                {s.status === 'cancelada' && 'Cancelada'}
                {s.status === 'concluida' &&
                  [
                    s.post_pse != null && `PSE ${s.post_pse}`,
                    s.duration_minutes != null && `${s.duration_minutes} min`,
                    cargaInterna != null && `${cargaInterna} UA`,
                    s.prof_rating != null && `nota ${s.prof_rating}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
              </p>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
