import { cicloAtual } from './calc'

/** Mínimo de cada fonte de dados para a previsão (os tipos completos do app cabem aqui). */
export interface FaturaParaPrevisao {
  aluno_id: string
  status: string
  total: number
  paga_em: string | null
  periodo_fim: string
}
export interface CobrancaParaPrevisao {
  aluno_id: string
  modelo: 'por_aula' | 'mensal'
  valor_aula: number | null
  valor_mensal: number | null
  dia_ciclo: number
  ativo: boolean
}
export interface ParticipacaoParaPrevisao {
  aluno_id: string
  valor: number | null
}
export interface AulaAgendadaParaPrevisao {
  status: string
  aula_participantes: { aluno_id: string; status: string }[]
}

export interface PrevisaoDoMes {
  /** faturas pagas no mês */
  recebido: number
  /** faturas abertas ou enviadas (inclusive atrasadas) */
  aReceber: number
  /** aulas já realizadas, "por aula", ainda sem fatura */
  realizadoNaoFaturado: number
  /** mensalidade do ciclo atual ainda sem fatura */
  mensalidades: number
  /** estimativa: aulas agendadas até o fim do mês × valor por aula do aluno */
  agendado: number
  total: number
  /** alunos ativos sem cobrança definida: ficam fora da conta */
  alunosSemValor: number
}

/** Último dia (AAAA-MM-DD) do mês de `hojeISO`. */
export function ultimoDiaDoMes(hojeISO: string): string {
  const [ano, mes] = hojeISO.split('-').map(Number)
  return `${hojeISO.slice(0, 8)}${String(new Date(Date.UTC(ano, mes, 0)).getUTCDate()).padStart(2, '0')}`
}

const arredondar2 = (n: number) => Math.round(n * 100) / 100
const soma = (v: number[]) => arredondar2(v.reduce((a, b) => a + b, 0))

/**
 * Previsão de ganho do mês (de caixa e de trabalho): o que já entrou + o que está a receber + o que já foi feito e ainda não foi
 * faturado + a mensalidade do ciclo + a PROJEÇÃO das aulas agendadas até o fim do mês. Só a última parcela é estimativa
 * (o aluno pode faltar); as outras são fatos. As datas de pagamento podem cair no mês seguinte.
 * `aulasAgendadas` deve vir já limitada a "de agora até o fim do mês".
 */
export function previsaoDoMes(args: {
  hojeISO: string
  faturas: FaturaParaPrevisao[]
  cobrancas: CobrancaParaPrevisao[]
  participacoesAbertas: ParticipacaoParaPrevisao[]
  aulasAgendadas: AulaAgendadaParaPrevisao[]
  idsAlunosAtivos: string[]
  /** alunos de pacote: o valor deles já está nas faturas, então não contam como "sem valor" */
  idsComPacote?: string[]
}): PrevisaoDoMes {
  const mes = args.hojeISO.slice(0, 7)
  const ativas = args.cobrancas.filter((c) => c.ativo)
  const porAluno = new Map(ativas.map((c) => [c.aluno_id, c]))
  const porAula = (id: string) => (porAluno.get(id)?.modelo === 'por_aula' ? porAluno.get(id) : undefined)

  const recebido = soma(args.faturas.filter((f) => f.status === 'paga' && f.paga_em?.startsWith(mes)).map((f) => f.total))
  const aReceber = soma(args.faturas.filter((f) => f.status === 'aberta' || f.status === 'enviada').map((f) => f.total))

  const realizadoNaoFaturado = soma(args.participacoesAbertas.filter((p) => porAula(p.aluno_id)).map((p) => p.valor ?? 0))

  // mensalidade do ciclo atual: só de quem ainda não tem fatura cobrindo esse ciclo
  const mensalidades = soma(
    ativas
      .filter((c) => c.modelo === 'mensal')
      .filter((c) => {
        const fimCiclo = cicloAtual(c.dia_ciclo, args.hojeISO).fim
        const ultimoFim = args.faturas.filter((f) => f.aluno_id === c.aluno_id && f.status !== 'cancelada').reduce((m, f) => (f.periodo_fim > m ? f.periodo_fim : m), '')
        return ultimoFim < fimCiclo
      })
      .map((c) => c.valor_mensal ?? 0),
  )

  const agendado = soma(
    args.aulasAgendadas
      .filter((a) => a.status === 'agendada')
      .flatMap((a) => a.aula_participantes.filter((p) => p.status === 'previsto'))
      .map((p) => porAula(p.aluno_id)?.valor_aula ?? 0),
  )

  const comPacote = new Set(args.idsComPacote ?? [])
  const alunosSemValor = args.idsAlunosAtivos.filter((id) => !porAluno.has(id) && !comPacote.has(id)).length
  return { recebido, aReceber, realizadoNaoFaturado, mensalidades, agendado, total: soma([recebido, aReceber, realizadoNaoFaturado, mensalidades, agendado]), alunosSemValor }
}
