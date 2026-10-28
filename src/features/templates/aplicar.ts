import type { TemplateTreino } from './api'
import { templateNatacaoDe } from '@/features/natacao/templates'
import type { DadosNatacao } from '@/types/natacao'
import { estruturadosDe, type DadosEstruturados } from '@/types/estruturado'
import type { ModalidadeDetalhes, ModalidadeTipo } from '@/types/modalidades'

export const MODALIDADES_COM_TEMPLATE_DO_SISTEMA: ModalidadeTipo[] = ['musculacao', 'corrida', 'ciclismo', 'brick']

/** Modalidades do atalho "Usar um modelo pronto": as de cima mais a natação, que tem seu próprio "Começar de um modelo" dentro do formulário (por isso fica fora da lista acima). */
export const MODALIDADES_NO_ATALHO_DE_MODELO: ModalidadeTipo[] = ['musculacao', 'natacao', 'corrida', 'ciclismo', 'brick']

/** As abas do atalho "Usar um modelo pronto": modalidades habilitadas no app que têm modelo do sistema, na ordem de MODALIDADES_NO_ATALHO_DE_MODELO. */
export const modalidadesDoAtalhoDeModelo = (ativas: ModalidadeTipo[]): ModalidadeTipo[] => MODALIDADES_NO_ATALHO_DE_MODELO.filter((m) => ativas.includes(m))

/** Dados do formulário de natação a partir de um modelo pronto (ids novos nos blocos); null se o modelo não tem o formato esperado. */
export function natacaoDoTemplate(t: { nome: string; descricao?: string | null; slug: string; modalidade_detalhes: ModalidadeDetalhes }): DadosNatacao | null {
  const m = templateNatacaoDe(t as TemplateTreino)
  if (!m) return null
  return { ambiente: m.ambiente, blocos: m.blocos.map((b) => ({ ...b, id: crypto.randomUUID(), parametros: { ...b.parametros } })) }
}

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

/** Exercício de um modelo de musculação (modalidade_detalhes.exercicios), já com o id real da biblioteca. */
export type ItemTemplateMusculacao = { exercicio_id: string; nome: string; sets: number; reps: string; rest_seconds: number | null }

export function itensMusculacaoDe(detalhes: ModalidadeDetalhes | null | undefined): ItemTemplateMusculacao[] {
  const lista = (detalhes as Record<string, unknown> | null | undefined)?.exercicios
  if (!Array.isArray(lista)) return []
  return lista
    .filter((x): x is ItemTemplateMusculacao => !!x && typeof x.exercicio_id === 'string' && typeof x.nome === 'string' && typeof x.sets === 'number' && typeof x.reps === 'string')
    .map((x) => ({ ...x, rest_seconds: typeof x.rest_seconds === 'number' ? x.rest_seconds : null }))
}
