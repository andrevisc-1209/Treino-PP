export type TipoNotificacao = 'treino_concluido' | 'ciclo_encerrado' | 'indicacao_concedida'

export interface NotificacaoAgrupavel {
  tipo: TipoNotificacao
  lida: boolean
}

/** Tipos que pedem uma ação do personal (encerrar o mês); o resto é informação. */
export const TIPOS_QUE_EXIGEM_ACAO: TipoNotificacao[] = ['ciclo_encerrado']

export const exigeAcao = (tipo: TipoNotificacao): boolean => TIPOS_QUE_EXIGEM_ACAO.includes(tipo)

export interface Grupos<T> {
  /** não lidas que pedem ação */
  acao: T[]
  /** não lidas informativas que não são treino (ex.: mês grátis da indicação) */
  novidades: T[]
  /** treinos concluídos pelos alunos, ainda não lidos */
  treinos: T[]
  /** já lidas, para consulta */
  lidas: T[]
}

/** Separa a lista (já ordenada) em grupos, mantendo a ordem dentro de cada um. */
export function agruparNotificacoes<T extends NotificacaoAgrupavel>(lista: T[]): Grupos<T> {
  const g: Grupos<T> = { acao: [], novidades: [], treinos: [], lidas: [] }
  for (const n of lista) {
    if (n.lida) g.lidas.push(n)
    else if (exigeAcao(n.tipo)) g.acao.push(n)
    else if (n.tipo === 'treino_concluido') g.treinos.push(n)
    else g.novidades.push(n)
  }
  return g
}

/** Contagem do selo do sino: o total de não lidas e quantas delas exigem ação (só estas ficam em vermelho). */
export function contarNaoLidas(tipos: TipoNotificacao[]): { total: number; acao: number } {
  return { total: tipos.length, acao: tipos.filter(exigeAcao).length }
}
