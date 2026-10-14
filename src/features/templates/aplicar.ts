import { estruturadosDe, type DadosEstruturados } from '@/types/estruturado'
import type { ModalidadeDetalhes, ModalidadeTipo } from '@/types/modalidades'

export const MODALIDADES_COM_TEMPLATE_DO_SISTEMA: ModalidadeTipo[] = ['corrida', 'ciclismo', 'brick']

/** Dados do formulário a partir de um modelo pronto, com ids novos nos blocos (o JSON do banco não tem ids). */
export function estruturadoDoTemplate(modalidade: ModalidadeTipo, detalhes: ModalidadeDetalhes): DadosEstruturados {
  const e = estruturadosDe(modalidade, detalhes as Record<string, unknown>)
  const novoId = <T extends { id?: string }>(b: T): T => ({ ...b, id: crypto.randomUUID() })
  return {
    ...e,
    corrida: { blocos: e.corrida.blocos.map(novoId) },
    ciclismo: { ...e.ciclismo, blocos: e.ciclismo.blocos.map(novoId) },
    brick: { ...e.brick, blocos_bike: e.brick.blocos_bike.map(novoId), blocos_corrida: e.brick.blocos_corrida.map(novoId) },
  }
}

/** O formulário da modalidade já tem blocos? (pede confirmação antes de substituir) */
export function temBlocos(modalidade: ModalidadeTipo, e: DadosEstruturados): boolean {
  if (modalidade === 'corrida') return e.corrida.blocos.length > 0
  if (modalidade === 'ciclismo') return e.ciclismo.blocos.length > 0
  if (modalidade === 'brick') return e.brick.blocos_bike.length + e.brick.blocos_corrida.length > 0
  return false
}
