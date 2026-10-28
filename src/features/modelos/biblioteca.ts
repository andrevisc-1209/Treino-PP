import type { ModalidadeTipo } from '@/types/modalidades'

/** Mínimo de um treino planejado para a busca, o filtro e o rascunho. */
export interface ModeloParaBiblioteca {
  name: string
  modalidade: ModalidadeTipo | null
  modelo_exercicios: { exercicio: { name: string } | null }[]
}

/** Com poucos treinos a lista cabe na tela: busca e filtros só aparecem a partir daqui. */
export const MINIMO_PARA_BUSCA = 6

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

export const modalidadeDe = (m: ModeloParaBiblioteca): ModalidadeTipo => m.modalidade ?? 'musculacao'

/** Rascunho: treino de musculação ainda sem nenhum exercício (as outras modalidades guardam os detalhes fora da lista de exercícios). */
export const ehRascunho = (m: ModeloParaBiblioteca): boolean => modalidadeDe(m) === 'musculacao' && m.modelo_exercicios.length === 0

/** Busca por nome ou por exercício (sem diferenciar acento e maiúscula) e filtro por modalidade; `null` = todas. */
export function filtrarModelos<T extends ModeloParaBiblioteca>(modelos: T[], busca: string, modalidade: ModalidadeTipo | null): T[] {
  const termo = semAcento(busca)
  return modelos.filter((m) => {
    if (modalidade && modalidadeDe(m) !== modalidade) return false
    if (!termo) return true
    return semAcento(m.name).includes(termo) || m.modelo_exercicios.some((i) => i.exercicio && semAcento(i.exercicio.name).includes(termo))
  })
}

/** Modalidades que existem na biblioteca, com quantos treinos cada uma tem (na ordem em que aparecem). */
export function modalidadesDaBiblioteca(modelos: ModeloParaBiblioteca[]): { modalidade: ModalidadeTipo; qtd: number }[] {
  const contagem = new Map<ModalidadeTipo, number>()
  for (const m of modelos) contagem.set(modalidadeDe(m), (contagem.get(modalidadeDe(m)) ?? 0) + 1)
  return [...contagem].map(([modalidade, qtd]) => ({ modalidade, qtd }))
}
