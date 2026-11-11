export type EstadoLinha = 'todos' | 'a_fechar' | 'enviada' | 'paga' | 'atraso'

export interface LinhaFinanceiro {
  alunoId: string
  estado: EstadoLinha
  totalCiclo: number
}

/**
 * Ciclo em aberto sem nada a cobrar ainda ("por aula" sem aula no ciclo): é legítimo, não é erro de geração, mas não pede ação.
 * Ciclo já encerrado continua visível mesmo zerado, porque falta fechá-lo.
 */
export function ehSemValor(l: LinhaFinanceiro, cicloEncerrado: boolean): boolean {
  return l.estado === 'a_fechar' && l.totalCiclo <= 0 && !cicloEncerrado
}

/** Ordem da lista: atrasadas, depois ciclos encerrados para fechar, depois o resto (a ordem original se mantém dentro de cada grupo). */
export function prioridadeDaLinha(l: LinhaFinanceiro, cicloEncerrado: boolean): 0 | 1 | 2 {
  if (l.estado === 'atraso') return 0
  if (cicloEncerrado) return 1
  return 2
}

export interface AcaoNecessaria {
  qtdAtraso: number
  totalAtraso: number
  qtdCiclosParaFechar: number
}

/** O que exige ação agora; `null` quando não há nada (o bloco some). */
export function acaoNecessaria(faturasEmAtraso: { total: number }[], ciclosParaFechar: number): AcaoNecessaria | null {
  if (faturasEmAtraso.length === 0 && ciclosParaFechar === 0) return null
  return { qtdAtraso: faturasEmAtraso.length, totalAtraso: faturasEmAtraso.reduce((a, f) => a + f.total, 0), qtdCiclosParaFechar: ciclosParaFechar }
}

export interface FaturaEmAtraso {
  id: string
  aluno_id: string
  total: number
  vencimento: string | null
}

/**
 * Faturas vencidas que nenhuma linha da lista mostra (ex.: uma fatura antiga de um aluno que já tem outra mais nova, ou de aluno sem cobrança
 * configurada). Sem elas, o aviso "N faturas em atraso" contava algo que o filtro "Em atraso" não listava. `idsJaMostrados` traz as faturas
 * que as outras linhas já cobrem (a última fatura de cada aluno e as dos pacotes). Ordem: a mais antiga primeiro.
 */
export function faturasEmAtrasoSemLinha(faturasEmAtraso: FaturaEmAtraso[], idsJaMostrados: Set<string>): FaturaEmAtraso[] {
  return faturasEmAtraso
    .filter((f) => !idsJaMostrados.has(f.id))
    .toSorted((a, b) => (a.vencimento ?? '').localeCompare(b.vencimento ?? ''))
}

export interface LinhaPacote {
  alunoId: string
  nome: string
  faturaId: string
  total: number
  status: 'aberta' | 'enviada' | 'paga'
  /** mesmo vocabulário dos filtros da lista; pacote nunca fica "a fechar" (a cobrança nasce na venda) */
  estado: Exclude<EstadoLinha, 'todos' | 'a_fechar'>
}

/**
 * Linhas dos alunos de pacote na lista do Financeiro: uma por pacote ativo, com a situação da fatura da venda.
 * Pacote sem fatura (ou com a fatura cancelada) não gera linha: não há nada a receber.
 */
export function linhasDePacote(
  pacotes: { aluno_id: string; fatura_id: string | null }[],
  faturas: { id: string; total: number; status: string; vencimento: string | null }[],
  nomes: Map<string, string>,
  hojeISO: string,
): LinhaPacote[] {
  const linhas: LinhaPacote[] = []
  for (const p of pacotes) {
    const f = faturas.find((x) => x.id === p.fatura_id)
    if (!f || (f.status !== 'aberta' && f.status !== 'enviada' && f.status !== 'paga')) continue
    const vencida = f.status !== 'paga' && !!f.vencimento && f.vencimento < hojeISO
    linhas.push({
      alunoId: p.aluno_id,
      nome: nomes.get(p.aluno_id) ?? '—',
      faturaId: f.id,
      total: f.total,
      status: f.status,
      estado: f.status === 'paga' ? 'paga' : vencida ? 'atraso' : 'enviada',
    })
  }
  return linhas
}
