/** Só o que a conta precisa de uma participação (a lista vem de useParticipacoesCobraveisTodas / useParticipacoesAbertas). */
export type ParticipacaoNaoFaturada = { aluno_id: string; cobrar: boolean | null; valor: number | null; fatura_id: string | null }

export type AulasSemCobranca = { alunoId: string; qtd: number; total: number }

const arredondar2 = (n: number) => Math.round(n * 100) / 100

/** Aula cobrável, com valor e ainda sem fatura: dinheiro que existe e ainda não foi cobrado. */
const naoFaturada = (p: ParticipacaoNaoFaturada) => p.fatura_id === null && p.cobrar === true && (p.valor ?? 0) > 0

/**
 * Alunos SEM cobrança ativa que têm aulas por aula já feitas e nunca faturadas (a cobrança foi desligada, ou o aluno virou aluno de pacote
 * com aulas do tempo da cobrança por aula). Essas aulas não entram em nenhum fechamento de ciclo: sem este aviso, o dinheiro some sem ninguém ver.
 * Presença de pacote não entra (não tem valor por aula). Maior valor primeiro.
 */
export function aulasSemCobranca(participacoes: ParticipacaoNaoFaturada[], idsComCobrancaAtiva: Set<string>): AulasSemCobranca[] {
  const porAluno = new Map<string, AulasSemCobranca>()
  for (const p of participacoes) {
    if (!naoFaturada(p) || idsComCobrancaAtiva.has(p.aluno_id)) continue
    const atual = porAluno.get(p.aluno_id) ?? { alunoId: p.aluno_id, qtd: 0, total: 0 }
    atual.qtd += 1
    atual.total = arredondar2(atual.total + (p.valor ?? 0))
    porAluno.set(p.aluno_id, atual)
  }
  return [...porAluno.values()].toSorted((a, b) => b.total - a.total)
}

/** Aulas de UM aluno feitas e ainda não faturadas (para avisar antes de trocar a cobrança por pacote). */
export function resumoNaoFaturado(participacoes: ParticipacaoNaoFaturada[]): { qtd: number; total: number } {
  const itens = participacoes.filter(naoFaturada)
  return { qtd: itens.length, total: arredondar2(itens.reduce((a, p) => a + (p.valor ?? 0), 0)) }
}
