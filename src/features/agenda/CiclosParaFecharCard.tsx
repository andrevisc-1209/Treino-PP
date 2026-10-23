import { Link } from 'react-router-dom'
import { Receipt } from 'lucide-react'
import { useAlunosComCobranca, useFaturasTodas, useParticipacoesCobraveisTodas } from '@/features/financeiro/api'
import { alunosComCicloParaFechar } from '@/features/financeiro/cicloPendente'
import { hojeSP } from '@/lib/datas'

/** Aviso curto em Hoje: há alunos com ciclo de cobrança encerrado sem fatura. Sem lista (pode ser grande); leva ao Financeiro. */
export function CiclosParaFecharCard() {
  const { data: cobrancas } = useAlunosComCobranca()
  const { data: faturas } = useFaturasTodas()
  const { data: participacoes } = useParticipacoesCobraveisTodas()

  // sem os três dados ainda (ou erro): não mostra nada — o Financeiro continua sendo o lugar de conferir
  if (!cobrancas || !faturas || !participacoes) return null
  const qtd = alunosComCicloParaFechar({ cobrancas, faturas, participacoes, hoje: hojeSP() }).length
  if (qtd === 0) return null

  return (
    <Link to="/financeiro?filtro=a_fechar" className="mb-3 flex min-h-14 items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-amber-900 active:bg-amber-100">
      <Receipt size={20} className="shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 text-sm">
        <strong>{qtd}</strong> {qtd === 1 ? 'aluno com ciclo' : 'alunos com ciclo'} de cobrança para fechar
      </span>
      <span className="shrink-0 text-sm font-semibold">Ver ›</span>
    </Link>
  )
}
