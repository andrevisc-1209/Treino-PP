import { brickVazio, dadosBrickDe, type DadosBrick } from './brick'
import { ciclismoVazio, dadosCiclismoDe, type DadosCiclismo } from './ciclismo'
import { corridaVazia, dadosCorridaDe, type DadosCorrida } from './corrida'
import { natacaoInicial, type DadosNatacao } from './natacao'

/** Estado dos formulários estruturados (natação, corrida, ciclismo e brick) — um por modalidade. */
export interface DadosEstruturados {
  natacao: DadosNatacao
  corrida: DadosCorrida
  ciclismo: DadosCiclismo
  brick: DadosBrick
}

export const estruturadosVazios = (): DadosEstruturados => ({
  natacao: { ambiente: 'piscina', blocos: [] },
  corrida: corridaVazia(),
  ciclismo: ciclismoVazio(),
  brick: brickVazio(),
})

/** Estado inicial ao editar: o treino salvo na modalidade dele; as demais ficam vazias. Formato antigo → vazio. */
export function estruturadosDe(modalidade: string, d: Record<string, unknown> | null | undefined): DadosEstruturados {
  const e = estruturadosVazios()
  if (modalidade === 'natacao') e.natacao = natacaoInicial(d)
  if (modalidade === 'corrida') e.corrida = dadosCorridaDe(d) ?? corridaVazia()
  if (modalidade === 'ciclismo') e.ciclismo = dadosCiclismoDe(d) ?? { ambiente: d?.ambiente === 'outdoor' ? 'outdoor' : 'indoor', blocos: [] }
  if (modalidade === 'brick') e.brick = dadosBrickDe(d) ?? brickVazio()
  return e
}
