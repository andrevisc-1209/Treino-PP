import { useItensRecibo, type Fatura } from '@/features/financeiro/api'
import { usePacotesAtivos } from './api'

/** Aulas de uma fatura para o recibo e o relatório. Fatura de um pacote ainda aberto lista as presenças do pacote até agora. */
export function useItensDaFatura(fatura: Pick<Fatura, 'id' | 'aluno_id' | 'modelo'> | undefined) {
  const { data: pacotes } = usePacotesAtivos()
  const pacote = fatura?.modelo === 'pacote' ? pacotes?.get(fatura.aluno_id) : undefined
  const aberto = pacote && pacote.pacote.fatura_id === fatura?.id ? { alunoId: fatura.aluno_id, inicio: pacote.pacote.inicio } : undefined
  return useItensRecibo(fatura?.id, aberto)
}
