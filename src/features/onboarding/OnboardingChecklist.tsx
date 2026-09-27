import { Link } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlunos } from '@/features/alunos/api'
import { useHorariosFixos, useProfessionalConfig } from '@/features/agenda/api'
import { useModelos } from '@/features/modelos/api'

type PassoOnboarding = { label: string; feito: boolean; to: string }

function usePassosOnboarding(): { passos: PassoOnboarding[]; carregando: boolean } {
  const { data: config, isLoading: l1 } = useProfessionalConfig()
  const { data: alunos, isLoading: l2 } = useAlunos()
  const { data: horarios, isLoading: l3 } = useHorariosFixos()
  const { data: modelos, isLoading: l4 } = useModelos()

  const passos: PassoOnboarding[] = [
    { label: 'Configure sua chave Pix', feito: !!config?.pix_tipo, to: '/configuracoes' },
    { label: 'Cadastre seu primeiro aluno', feito: (alunos?.length ?? 0) > 0, to: '/alunos/novo' },
    { label: 'Adicione um horário fixo', feito: (horarios?.length ?? 0) > 0, to: '/alunos' },
    { label: 'Monte seu primeiro treino planejado', feito: (modelos?.length ?? 0) > 0, to: '/meus-treinos/planejados' },
  ]

  return { passos, carregando: l1 || l2 || l3 || l4 }
}

/** Checklist de primeiro acesso — some sozinho quando os 4 passos estão feitos. */
export function OnboardingChecklist() {
  const { passos, carregando } = usePassosOnboarding()
  if (carregando) return null

  const restantes = passos.filter((p) => !p.feito)
  if (restantes.length === 0) return null

  return (
    <div className="mb-4 space-y-2 rounded-2xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-semibold">Primeiros passos</h2>
        <p className="text-sm text-slate-500">{restantes.length} de 4 pra completar</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {passos.map((p) => (
          <li key={p.label}>
            <Link
              to={p.to}
              className={cn(
                'flex min-h-11 items-center justify-between gap-2 py-2',
                p.feito ? 'text-slate-400' : 'text-slate-900 active:bg-slate-50',
              )}
            >
              <span className={cn('flex items-center gap-2 text-sm', p.feito && 'line-through')}>
                <span
                  className={cn(
                    'flex size-5 shrink-0 items-center justify-center rounded-full border',
                    p.feito ? 'border-brand bg-brand text-white' : 'border-slate-300',
                  )}
                >
                  {p.feito && <Check size={12} />}
                </span>
                {p.label}
              </span>
              {!p.feito && <ChevronRight size={16} className="shrink-0 text-slate-400" />}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
