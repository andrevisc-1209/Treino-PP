import { Link } from 'react-router-dom'
import { CalendarClock, Dumbbell, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hojeSP } from '@/lib/datas'
import { formatarBRL } from '@/lib/moeda'
import { useAlunoCobranca, useFaturasDoAluno } from '@/features/financeiro/api'
import { cicloAtual } from '@/features/financeiro/calc'
import { statusFinanceiroDoAluno } from '@/features/financeiro/statusAluno'
import { textoProximaAula, textoUltimoTreino } from './linhasDeStatus'
import { useProximaAulaDoAluno, useUltimoTreinoDoAluno } from './useStatusDoAluno'

function Linha({ icone, rotulo, children }: { icone: React.ReactNode; rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="shrink-0 text-slate-500" aria-hidden>
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-600">{rotulo}</p>
        {children}
      </div>
    </div>
  )
}

/** Topo do Resumo: o que o personal consulta toda semana (próxima aula, último treino, cobrança), uma linha cada, antes dos dados cadastrais. */
export function StatusDoAluno({ alunoId }: { alunoId: string }) {
  const hoje = hojeSP()
  const { data: proxima, isLoading: carregandoAula } = useProximaAulaDoAluno(alunoId)
  const { data: ultimo, isLoading: carregandoTreino } = useUltimoTreinoDoAluno(alunoId)
  const { data: cobranca } = useAlunoCobranca(alunoId)
  const { data: faturas } = useFaturasDoAluno(alunoId)

  const aula = textoProximaAula(proxima ?? null, hoje)
  const treino = textoUltimoTreino(ultimo, hoje)
  const financeiro =
    cobranca?.ativo && faturas ? statusFinanceiroDoAluno(faturas, cicloAtual(cobranca.dia_ciclo, hoje).fim, hoje, formatarBRL) : null

  return (
    <section className="rounded-2xl bg-white px-4 py-1 shadow-sm" aria-label="Situação do aluno">
      <div className="divide-y divide-slate-100">
        <Linha icone={<CalendarClock size={18} />} rotulo="Próxima aula">
          <p className={cn('text-sm font-semibold', !proxima && !carregandoAula && 'text-slate-600')}>{carregandoAula ? '…' : aula.texto}</p>
          {aula.detalhe && <p className="truncate text-xs text-slate-600">{aula.detalhe}</p>}
        </Linha>
        <Linha icone={<Dumbbell size={18} />} rotulo="Último treino">
          <p className={cn('text-sm font-semibold', treino.alerta && !carregandoTreino && 'text-amber-800')}>{carregandoTreino ? '…' : treino.texto}</p>
        </Linha>
        {financeiro && (
          <Linha icone={<Wallet size={18} />} rotulo="Cobrança">
            <div className="flex items-center justify-between gap-2">
              <p className={cn('text-sm font-semibold', financeiro.tom === 'alerta' && 'text-red-800', financeiro.tom === 'atencao' && 'text-amber-800')}>{financeiro.texto}</p>
              {financeiro.acao && (
                <Link
                  to={financeiro.acao.faturaId ? `/financeiro/${financeiro.acao.faturaId}` : `/alunos/${alunoId}/fechar-ciclo`}
                  className="flex min-h-11 shrink-0 items-center text-sm font-medium text-brand-hover underline"
                >
                  {financeiro.acao.rotulo}
                </Link>
              )}
            </div>
          </Linha>
        )}
      </div>
    </section>
  )
}
