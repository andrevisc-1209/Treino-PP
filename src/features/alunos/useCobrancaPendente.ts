import { useMemo } from 'react'
import { hojeSP } from '@/lib/datas'
import { useAlunosComCobranca, useFaturasTodas, useParticipacoesCobraveisTodas } from '@/features/financeiro/api'
import { alunosComCicloParaFechar } from '@/features/financeiro/cicloPendente'
import { estaVencida } from '@/features/financeiro/rotulos'

/** Alunos com fatura em atraso ou ciclo de cobrança encerrado sem fatura (o mesmo critério do "Ação necessária" do Financeiro). */
export function useAlunosComCobrancaPendente(): Set<string> {
  const { data: cobrancas } = useAlunosComCobranca()
  const { data: faturas } = useFaturasTodas()
  const { data: participacoes } = useParticipacoesCobraveisTodas()
  return useMemo(() => {
    const hoje = hojeSP()
    const ids = new Set<string>()
    for (const f of faturas ?? []) if (estaVencida(f.vencimento, f.status, hoje)) ids.add(f.aluno_id)
    for (const id of alunosComCicloParaFechar({ cobrancas: cobrancas ?? [], faturas: faturas ?? [], participacoes: participacoes ?? [], hoje })) ids.add(id)
    return ids
  }, [cobrancas, faturas, participacoes])
}
