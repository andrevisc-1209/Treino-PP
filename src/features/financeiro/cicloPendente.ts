// Quais alunos têm um ciclo de cobrança JÁ ENCERRADO ainda sem fatura (o aviso de Hoje e a etiqueta "Ciclo encerrado" do Financeiro).
// Diferente do filtro "A fechar" do Financeiro, que também inclui o ciclo em andamento: aqui só entra o que já passou da data.

import { somarDias } from '@/lib/datas'
import { cicloAtual, itensCobraveisDoCiclo, type ParticipacaoParaFechamento } from './calc'

export type CobrancaParaCiclo = { aluno_id: string; modelo: 'por_aula' | 'mensal'; dia_ciclo: number }
export type FaturaParaCiclo = { aluno_id: string; periodo_fim: string; status: string }
export type ParticipacaoParaCiclo = Omit<ParticipacaoParaFechamento, 'aula_starts_at'> & { aluno_id: string; aula: { starts_at: string } | null }

/**
 * Alunos (ids) com o ciclo anterior encerrado e sem fatura que o cubra:
 *  - por aula: só se houver aula cobrável ainda não faturada naquele ciclo (sem aula, nada a cobrar);
 *  - mensal: só se o aluno já tem alguma fatura (está na rotina de cobrança), para não avisar de ciclos anteriores ao cadastro.
 * Fatura cancelada não conta como fechada.
 */
export function alunosComCicloParaFechar(args: {
  cobrancas: CobrancaParaCiclo[]
  faturas: FaturaParaCiclo[]
  participacoes: ParticipacaoParaCiclo[]
  hoje: string
}): string[] {
  const { cobrancas, faturas, participacoes, hoje } = args
  const ids: string[] = []
  for (const c of cobrancas) {
    const atual = cicloAtual(c.dia_ciclo, hoje)
    const anterior = cicloAtual(c.dia_ciclo, somarDias(atual.inicio, -1))
    const faturasDoAluno = faturas.filter((f) => f.aluno_id === c.aluno_id && f.status !== 'cancelada')
    if (faturasDoAluno.some((f) => f.periodo_fim >= anterior.fim)) continue
    const pendente =
      c.modelo === 'mensal'
        ? faturasDoAluno.length > 0
        : itensCobraveisDoCiclo(
            participacoes.filter((p) => p.aluno_id === c.aluno_id).map((p) => ({ ...p, aula_starts_at: p.aula?.starts_at ?? '' })),
            anterior,
          ).length > 0
    if (pendente) ids.push(c.aluno_id)
  }
  return ids
}
