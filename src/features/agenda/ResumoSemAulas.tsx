import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarCheck, CalendarDays, ChevronRight, Plus, TriangleAlert, Users } from 'lucide-react'
import { CardMetrica } from '@/components/CardMetrica'
import { Button } from '@/components/ui'
import { useAlunos } from '@/features/alunos/api'
import { useListaAlunosSemTreino } from '@/features/alunos/useMetricas'
import { dataSP, formatarDataCurta, formatarHoraInicioFim, hojeSP, inicioDaSemanaSP, limitesDaSemanaSP, nomeDiaCurto, somarDias } from '@/lib/datas'
import { useAulasNoIntervalo } from './api'

const MAX_PROXIMAS = 3
const MAX_SEM_TREINO = 5

function rotuloDia(starts_at: string, hoje: string): string {
  const dia = dataSP(starts_at)
  if (dia === hoje) return 'Hoje'
  if (dia === somarDias(hoje, 1)) return 'Amanhã'
  return `${nomeDiaCurto(dia)}, ${formatarDataCurta(dia)}`
}

/**
 * Substitui o "Nenhuma aula hoje" seco da Hoje: o dia livre vira um painel útil —
 * resumo da semana, próximas aulas e alunos sem treino há mais de 7 dias.
 */
export function ResumoSemAulas({ onMarcarAula }: { onMarcarAula: () => void }) {
  const hoje = hojeSP()
  const [agora] = useState(() => new Date())
  const { inicio, fim } = limitesDaSemanaSP(inicioDaSemanaSP(hoje))
  const proximosSeteDias = useMemo(() => new Date(agora.getTime() + 7 * 86_400_000), [agora])

  const { data: alunos } = useAlunos()
  const { data: aulasSemana } = useAulasNoIntervalo(inicio, fim)
  const { data: aulasProximas } = useAulasNoIntervalo(agora, proximosSeteDias)
  const { data: semTreino } = useListaAlunosSemTreino()

  const aulasNaSemana = aulasSemana?.filter((a) => a.status !== 'cancelada').length
  const proximas = (aulasProximas ?? []).filter((a) => a.status === 'agendada').slice(0, MAX_PROXIMAS)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <CardMetrica icone={<CalendarCheck size={16} />} valor={0} label="Aulas hoje" />
        <CardMetrica icone={<CalendarDays size={16} />} valor={aulasNaSemana} label="Aulas na semana" />
        <CardMetrica icone={<Users size={16} />} valor={alunos?.length} label="Alunos ativos" />
      </div>

      <section className="space-y-1 rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="font-semibold">Próximas aulas</h2>
        {proximas.length === 0 ? (
          <p className="text-sm text-slate-500">Nada agendado para os próximos 7 dias.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {proximas.map((a) => {
              const nomes = a.aula_participantes.map((p) => p.aluno?.name).filter((n): n is string => !!n)
              return (
                <li key={a.id}>
                  <Link to="/agenda" className="flex min-h-12 items-center justify-between gap-2 py-2 active:bg-slate-50">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        {rotuloDia(a.starts_at, hoje)} · {formatarHoraInicioFim(a.starts_at, a.duration_min)}
                      </p>
                      <p className="truncate text-xs text-slate-500">{nomes.join(', ') || 'Sem participantes'}</p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-slate-400" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {semTreino && semTreino.length > 0 && (
        <section className="space-y-1 rounded-2xl border-l-4 border-amber-500 bg-white p-4 shadow-sm">
          <h2 className="flex items-center gap-2 font-semibold">
            <TriangleAlert size={16} className="text-amber-600" /> Sem treino há mais de 7 dias
          </h2>
          <ul className="divide-y divide-slate-100">
            {semTreino.slice(0, MAX_SEM_TREINO).map((a) => (
              <li key={a.id}>
                <Link to={`/alunos/${a.id}`} className="flex min-h-12 items-center justify-between gap-2 py-2 text-sm font-medium active:bg-slate-50">
                  <span className="truncate">{a.name}</span>
                  <ChevronRight size={16} className="shrink-0 text-slate-400" />
                </Link>
              </li>
            ))}
          </ul>
          {semTreino.length > MAX_SEM_TREINO && (
            <Link to="/alunos" className="inline-flex min-h-11 items-center text-sm font-medium text-brand-hover">
              Ver todos os alunos ({semTreino.length})
            </Link>
          )}
        </section>
      )}

      <Button onClick={onMarcarAula} variant="outline" className="w-full">
        <Plus size={18} /> Marcar aula avulsa
      </Button>
    </div>
  )
}
