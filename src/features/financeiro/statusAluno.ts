export type TomStatus = 'ok' | 'atencao' | 'alerta'

export interface StatusFinanceiroAluno {
  texto: string
  tom: TomStatus
  /** próxima ação sugerida; `faturaId` leva à fatura, sem ele vai ao fechamento do ciclo */
  acao: { rotulo: string; faturaId?: string } | null
}

interface FaturaMin {
  id: string
  status: string
  vencimento: string | null
  total: number
  periodo_fim: string
}

const emAberto = (f: FaturaMin) => f.status === 'aberta' || f.status === 'enviada'

/**
 * Resumo do financeiro do aluno para a ficha: uma frase de status + a próxima ação.
 * Prioridade: fatura em atraso → ciclo para fechar → em dia. `faturas` vem da mais recente para a mais antiga.
 */
export function statusFinanceiroDoAluno(faturas: FaturaMin[], fimDoCicloAtual: string, hojeISO: string, formatar: (v: number) => string): StatusFinanceiroAluno {
  const atrasadas = faturas.filter((f) => emAberto(f) && f.vencimento && f.vencimento < hojeISO)
  if (atrasadas.length > 0) {
    const total = atrasadas.reduce((a, f) => a + f.total, 0)
    return {
      texto: `${atrasadas.length === 1 ? '1 fatura em atraso' : `${atrasadas.length} faturas em atraso`} · ${formatar(total)}`,
      tom: 'alerta',
      acao: { rotulo: 'Ver fatura', faturaId: atrasadas[0].id },
    }
  }
  const ultima = faturas[0]
  if (!ultima || ultima.periodo_fim < fimDoCicloAtual) return { texto: 'Ciclo atual aberto', tom: 'atencao', acao: { rotulo: 'Ver ciclo atual' } }
  const aReceber = faturas.filter(emAberto)
  if (aReceber.length > 0) return { texto: `${formatar(aReceber.reduce((a, f) => a + f.total, 0))} a receber`, tom: 'atencao', acao: { rotulo: 'Ver fatura', faturaId: aReceber[0].id } }
  return { texto: 'Em dia', tom: 'ok', acao: null }
}
