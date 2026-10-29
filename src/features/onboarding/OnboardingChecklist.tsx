import { Link } from 'react-router-dom'
import { Check, ChevronRight, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAlunos } from '@/features/alunos/api'
import { useHorariosFixos, useProfessionalConfig } from '@/features/agenda/api'
import { useModelos } from '@/features/modelos/api'
import { ROTA_IMPORTAR_COM_IA } from '@/features/alunos/importar/via'
import { useAtivacao } from './useAtivacao'

type PassoOnboarding = { label: string; feito: boolean; to: string; /** não impede o checklist de sumir quando os outros passos acabam */ opcional?: boolean; /** outro jeito de cumprir o mesmo passo (linha logo abaixo) */ alternativa?: { label: string; to: string } }

function usePassosOnboarding(): { passos: PassoOnboarding[]; carregando: boolean } {
  const { data: config, isLoading: l1 } = useProfessionalConfig()
  const { data: alunos, isLoading: l2 } = useAlunos()
  const { data: horarios, isLoading: l3 } = useHorariosFixos()
  const { data: modelos, isLoading: l4 } = useModelos()

  // ordem por valor para a ativação: alunos primeiro; o Pix (só para cobrar) por último
  const passos: PassoOnboarding[] = [
    {
      label: 'Cadastre seus primeiros alunos',
      feito: (alunos?.length ?? 0) > 0,
      to: '/alunos/novo',
      alternativa: { label: 'Importar vários alunos (ajuda de uma IA ou planilha)', to: ROTA_IMPORTAR_COM_IA },
    },
    { label: 'Defina os horários em que você atende', feito: !!config?.agenda_ajustada_em, to: '/agenda/disponibilidade' },
    // opcional e só depois dos horários: quem não quer divulgar a agenda não fica com o checklist para sempre
    ...(config?.agenda_ajustada_em ? [{ label: 'Ative e compartilhe o link da sua agenda (opcional)', feito: !!config?.agenda_publica_ativa, to: '/configuracoes?secao=pagina', opcional: true }] : []),
    { label: 'Adicione um horário fixo', feito: (horarios?.length ?? 0) > 0, to: '/alunos' },
    { label: 'Monte seu primeiro treino planejado', feito: (modelos?.length ?? 0) > 0, to: '/meus-treinos/planejados' },
    { label: 'Configure sua chave Pix', feito: !!config?.pix_tipo, to: '/configuracoes' },
  ]

  return { passos, carregando: l1 || l2 || l3 || l4 }
}

/** Checklist de primeiro acesso — some sozinho quando os 4 passos estão feitos. */
export function OnboardingChecklist() {
  const { passos, carregando } = usePassosOnboarding()
  const { emAtivacao } = useAtivacao()
  // enquanto o cartão de ativação (3 alunos) está na tela, o checklist de 4 itens só atrapalharia
  if (carregando || emAtivacao) return null

  const restantes = passos.filter((p) => !p.feito && !p.opcional)
  if (restantes.length === 0) return null

  return (
    <div className="mb-4 space-y-2 rounded-2xl bg-white p-4 shadow-sm">
      <div>
        <h2 className="font-semibold">Comece por aqui</h2>
        <p className="text-sm text-slate-600">{passos.length - restantes.length} de {passos.length} etapas concluídas</p>
      </div>
      <ul className="divide-y divide-slate-100">
        {passos.map((p) => (
          <li key={p.label}>
            <Link
              to={p.to}
              className={cn(
                'flex min-h-11 items-center justify-between gap-2 py-2',
                p.feito ? 'text-slate-500' : 'text-slate-900 active:bg-slate-50',
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
            {!p.feito && p.alternativa && (
              <Link to={p.alternativa.to} className="mb-1 ml-7 flex min-h-11 items-center gap-2 rounded-xl bg-brand-soft px-3 py-2 text-sm font-medium text-brand-hover active:bg-slate-100">
                <Upload size={16} className="shrink-0" aria-hidden />
                <span>{p.alternativa.label}</span>
              </Link>
            )}
          </li>
        ))}
      </ul>
      <Link to="/ajuda" className="flex min-h-11 items-center text-sm font-medium text-brand-hover">
        Precisa de ajuda? Veja a central de ajuda
      </Link>
    </div>
  )
}
