import { diasEntre } from '@/lib/datas'

/** Dias sem treino a partir dos quais o aluno entra na fila (o mesmo corte do aviso "Sem treino há +7 dias"). */
export const DIAS_ALERTA = 7

export type FaixaSemTreino = 'todos' | 'alerta' | '8-14' | '15-30' | '30+' | 'nunca'
export type OrdemAlunos = 'nome' | 'sem_treino' | 'cobranca'

export const ROTULO_FAIXA: Record<FaixaSemTreino, string> = {
  todos: 'Todos',
  alerta: 'Sem treino +7 dias',
  '8-14': '8–14 dias',
  '15-30': '15–30 dias',
  '30+': 'Mais de 30 dias',
  nunca: 'Nunca treinou',
}

export const ROTULO_ORDEM: Record<OrdemAlunos, string> = { nome: 'Nome (A–Z)', sem_treino: 'Mais tempo sem treino', cobranca: 'Cobrança pendente primeiro' }

export interface AlunoParaFila {
  id: string
  name: string
}

/** Dias desde o último treino concluído; `null` se o aluno nunca teve treino. */
export function diasSemTreino(ultimaSessao: string | undefined, hojeISO: string): number | null {
  return ultimaSessao ? Math.max(0, diasEntre(ultimaSessao, hojeISO)) : null
}

/** O aluno está na fila de "sem treino" (nunca treinou ou passou de 7 dias)? */
export const estaNaFila = (dias: number | null): boolean => dias === null || dias > DIAS_ALERTA

/** Faixas que um aluno com esses dias sem treino ocupa (as de intervalo são exclusivas; "alerta" reúne todas, inclusive quem nunca treinou). */
export function pertenceAFaixa(dias: number | null, faixa: FaixaSemTreino): boolean {
  switch (faixa) {
    case 'todos':
      return true
    case 'alerta':
      return estaNaFila(dias)
    case 'nunca':
      return dias === null
    case '8-14':
      return dias !== null && dias >= 8 && dias <= 14
    case '15-30':
      return dias !== null && dias >= 15 && dias <= 30
    case '30+':
      return dias !== null && dias > 30
  }
}

/** Quantos alunos há em cada faixa (para os contadores dos filtros). */
export function contarFaixas(diasDosAlunos: (number | null)[]): Record<FaixaSemTreino, number> {
  const faixas = Object.keys(ROTULO_FAIXA) as FaixaSemTreino[]
  return Object.fromEntries(faixas.map((f) => [f, diasDosAlunos.filter((d) => pertenceAFaixa(d, f)).length])) as Record<FaixaSemTreino, number>
}

/**
 * Ordena a lista de alunos. "sem_treino": quem nunca treinou primeiro (nada a comparar, precisa de atenção), depois o mais antigo.
 * "cobranca": quem tem fatura em atraso ou ciclo encerrado vem antes. Empate sempre pelo nome.
 */
export function ordenarAlunos<T extends AlunoParaFila>(
  alunos: T[],
  ordem: OrdemAlunos,
  contexto: { dias: Map<string, number | null>; comCobrancaPendente: Set<string> },
): T[] {
  const porNome = (a: T, b: T) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })
  const pesoDias = (id: string) => {
    const d = contexto.dias.get(id)
    return d === null || d === undefined ? Number.POSITIVE_INFINITY : d
  }
  if (ordem === 'sem_treino') return alunos.toSorted((a, b) => pesoDias(b.id) - pesoDias(a.id) || porNome(a, b))
  if (ordem === 'cobranca') return alunos.toSorted((a, b) => Number(contexto.comCobrancaPendente.has(b.id)) - Number(contexto.comCobrancaPendente.has(a.id)) || porNome(a, b))
  return alunos.toSorted(porNome)
}
