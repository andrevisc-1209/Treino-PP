import type { TemplateTreino } from '@/features/templates/api'
import type { AmbienteNatacao, BlocoNatacao } from '@/types/natacao'

/** Modelo de natação da plataforma (treino.templates_treino): ponto de partida editável. NÃO é copiado para a biblioteca do personal. */
export interface TemplateNatacao {
  id: string
  nome: string
  nivel: 'iniciante' | 'intermediario' | 'avancado'
  ambiente: AmbienteNatacao
  descricao: string
  blocos: Omit<BlocoNatacao, 'id'>[]
}

export const ROTULO_NIVEL: Record<TemplateNatacao['nivel'], string> = { iniciante: 'Iniciante', intermediario: 'Intermediário', avancado: 'Avançado' }

const NIVEIS = Object.keys(ROTULO_NIVEL)

/** Linha de treino.templates_treino → modelo de natação; null se o JSON não tem o formato esperado. */
export function templateNatacaoDe(t: TemplateTreino): TemplateNatacao | null {
  const d = t.modalidade_detalhes as Record<string, unknown>
  const blocos = d.blocos
  if (!Array.isArray(blocos) || blocos.length === 0) return null
  return {
    id: t.slug,
    nome: t.nome,
    nivel: NIVEIS.includes(d.nivel as string) ? (d.nivel as TemplateNatacao['nivel']) : 'intermediario',
    ambiente: d.ambiente === 'mar' ? 'mar' : 'piscina',
    descricao: t.descricao ?? '',
    blocos: blocos as TemplateNatacao['blocos'],
  }
}
