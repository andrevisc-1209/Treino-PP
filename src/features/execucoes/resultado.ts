import { camposPrePosDoResultado, type ProntidaoExec } from './prontidaoExecucao'
import { dadosNatacaoDe } from '@/types/natacao'
import { itensChecklist, RESULTADO_CAMPOS, type DetalhesExecucao, type ModalidadeDetalhes, type ModalidadeTipo } from '@/types/modalidades'

type Outra = Exclude<ModalidadeTipo, 'musculacao'>

export type EstadoResultado = {
  valores: Record<string, string>
  feitos: boolean[]
  notas: string
  /** Tempo de execução (opcional), em dois campos de texto: horas e minutos. */
  duracaoH?: string
  duracaoMin?: string
  /** Pré-treino respondido (opcional: pular deixa vazio). */
  prontidao?: ProntidaoExec
  /** Esforço percebido 0–10 ao final (opcional). */
  pse?: number | null
}

export const RESULTADO_VAZIO: EstadoResultado = { valores: {}, feitos: [], notas: '' }

/** Campos de tempo que o "Tempo de execução" (h + min) substitui — gravados a partir dele para os leitores antigos continuarem valendo. */
export const CAMPOS_TEMPO_SUBSTITUIDOS = ['duracao_min', 'tempo_min'] as const

/** Horas + minutos digitados → minutos inteiros (null se ficou em branco, inválido ou zero). */
export function duracaoEmMinutos(h: string | undefined, min: string | undefined): number | null {
  const parse = (s: string | undefined) => {
    const n = Number((s ?? '').trim().replace(',', '.'))
    return Number.isFinite(n) && n > 0 ? n : 0
  }
  const total = Math.round(parse(h) * 60 + parse(min))
  return total > 0 ? Math.min(total, 24 * 60) : null
}

/**
 * Metros nadados nos blocos marcados como feitos (distância × séries, só piscina). O checklist de natação tem um item
 * por bloco, na mesma ordem de `modalidade_detalhes.blocos`. Retorna 0 se não houver blocos com distância.
 */
export function distanciaNatacaoFeita(detalhes: ModalidadeDetalhes, feitos: boolean[]): number {
  const nat = dadosNatacaoDe(detalhes as Record<string, unknown>)
  if (!nat) return 0
  return nat.blocos.reduce((a, b, i) => (feitos[i] ? a + (b.parametros.distancia ?? 0) * (b.parametros.series || 1) : a), 0)
}

/** Monta o `detalhes_execucao` (modalidades sem lista de exercícios do app) a partir do que foi preenchido. */
export function detalhesDoResultado(modalidade: Outra, detalhes: ModalidadeDetalhes, e: EstadoResultado): DetalhesExecucao {
  const resultado: Record<string, string | number> = {}
  for (const c of RESULTADO_CAMPOS[modalidade]) {
    const bruto = (e.valores[c.key] ?? '').trim()
    if (!bruto) continue
    if (c.type === 'number' || c.type === 'rpe') {
      const n = Number(bruto.replace(',', '.'))
      if (Number.isFinite(n) && n >= 0) resultado[c.key] = n
    } else resultado[c.key] = bruto
  }
  // Volume calculado: se o aluno não digitou a distância da natação, vale a soma dos blocos marcados.
  if (modalidade === 'natacao' && resultado.distancia_total_m === undefined) {
    const metros = distanciaNatacaoFeita(detalhes, e.feitos)
    if (metros > 0) resultado.distancia_total_m = metros
  }
  Object.assign(resultado, camposPrePosDoResultado(e))
  const minutos = duracaoEmMinutos(e.duracaoH, e.duracaoMin)
  if (minutos !== null) {
    resultado.duracao_minutos = minutos
    for (const chave of CAMPOS_TEMPO_SUBSTITUIDOS) {
      if (RESULTADO_CAMPOS[modalidade].some((c) => c.key === chave) && resultado[chave] === undefined) resultado[chave] = minutos
    }
  }
  return {
    resultado,
    exercicios_livres: itensChecklist(modalidade, detalhes).map((l, i) => ({ nome: l.nome, feito: !!e.feitos[i] })),
  }
}
