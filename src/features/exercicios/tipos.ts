import { GRUPOS_NATACAO } from '@/data/natacao-exercicios'
import { TIPOS_CORRIDA } from '@/data/corrida-tipos'
import { TIPOS_CICLISMO_INDOOR, TIPOS_CICLISMO_OUTDOOR } from '@/data/ciclismo-tipos'
import { MODALIDADES_ATIVAS, type ModalidadeTipo } from '@/types/modalidades'

export type ParametroPrincipal = 'distancia' | 'tempo'
export type TipoOpcao = { id: string; rotulo: string; descricao?: string }

/** Modalidades que têm biblioteca de exercícios (as ativas no app). */
export const modalidadesDeExercicio = (): ModalidadeTipo[] => MODALIDADES_ATIVAS

const GRUPOS_MUSCULARES = ['Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Pernas', 'Core', 'Reabilitação / Prep Física']

/** Tipos de uma modalidade (nível "Tipo" de Modalidade > Tipo > Exercício). Musculação: grupo muscular, somando os que já existem na biblioteca. */
export function tiposDaModalidade(modalidade: ModalidadeTipo, gruposExistentes: string[] = []): TipoOpcao[] {
  switch (modalidade) {
    case 'musculacao': {
      const todos = [...new Set([...GRUPOS_MUSCULARES, ...gruposExistentes.filter(Boolean)])]
      return todos.sort((a, b) => a.localeCompare(b, 'pt-BR')).map((g) => ({ id: g, rotulo: g }))
    }
    case 'natacao':
      return GRUPOS_NATACAO.map((g) => ({ id: g.key, rotulo: g.label }))
    case 'corrida':
      return TIPOS_CORRIDA.map((t) => ({ id: t.id, rotulo: t.nome, descricao: t.descricao }))
    case 'ciclismo': {
      const vistos = new Map<string, TipoOpcao>()
      for (const t of [...TIPOS_CICLISMO_OUTDOOR, ...TIPOS_CICLISMO_INDOOR]) if (!vistos.has(t.id)) vistos.set(t.id, { id: t.id, rotulo: t.nome, descricao: t.descricao })
      return [...vistos.values()]
    }
    case 'brick':
      return [
        { id: 'bike', rotulo: 'Bike', descricao: 'Parte de ciclismo do brick.' },
        { id: 'corrida', rotulo: 'Corrida', descricao: 'Parte de corrida do brick.' },
      ]
    default:
      return []
  }
}

export const rotuloTipo = (modalidade: ModalidadeTipo, tipoId: string | null | undefined, gruposExistentes: string[] = []): string | null =>
  tipoId ? (tiposDaModalidade(modalidade, gruposExistentes).find((t) => t.id === tipoId)?.rotulo ?? tipoId) : null

/** Parâmetro principal sugerido ao criar (musculação não usa). */
export function parametroPadrao(modalidade: ModalidadeTipo, tipoId?: string | null): ParametroPrincipal | null {
  if (modalidade === 'musculacao') return null
  if (modalidade === 'corrida') return TIPOS_CORRIDA.find((t) => t.id === tipoId)?.parametroPrincipal ?? 'distancia'
  if (modalidade === 'ciclismo') return [...TIPOS_CICLISMO_OUTDOOR, ...TIPOS_CICLISMO_INDOOR].find((t) => t.id === tipoId)?.parametroPrincipal ?? 'tempo'
  if (modalidade === 'natacao') return tipoId === 'mar' ? 'tempo' : 'distancia'
  return 'tempo'
}

/** Modalidade e tipo iniciais do "Novo exercício": vêm do contexto (filtro ativo / seletor aberto), e o tipo só vale se pertence à modalidade. */
export function prefillNovoExercicio(contexto: { modalidade?: ModalidadeTipo | null; tipo?: string | null }, gruposExistentes: string[] = []): { modalidade: ModalidadeTipo; tipo: string } {
  const modalidade = contexto.modalidade && MODALIDADES_ATIVAS.includes(contexto.modalidade) ? contexto.modalidade : 'musculacao'
  const tipo = contexto.tipo && tiposDaModalidade(modalidade, gruposExistentes).some((t) => t.id === contexto.tipo) ? contexto.tipo : ''
  return { modalidade, tipo }
}

/** Ao trocar a modalidade no formulário o tipo anterior deixa de valer. */
export const tipoAoTrocarModalidade = (): string => ''
