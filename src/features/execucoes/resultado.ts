import { exerciciosLivresDe, RESULTADO_CAMPOS, type DetalhesExecucao, type ModalidadeDetalhes, type ModalidadeTipo } from '@/types/modalidades'

type Outra = Exclude<ModalidadeTipo, 'musculacao'>

export type EstadoResultado = { valores: Record<string, string>; feitos: boolean[]; notas: string }

export const RESULTADO_VAZIO: EstadoResultado = { valores: {}, feitos: [], notas: '' }

/** Monta o `detalhes_execucao` (modalidades sem lista de exercícios do app) a partir do que foi preenchido. */
export function detalhesDoResultado(modalidade: Outra, detalhes: ModalidadeDetalhes, e: EstadoResultado): DetalhesExecucao {
  const resultado: Record<string, string | number> = {}
  for (const c of RESULTADO_CAMPOS[modalidade]) {
    const bruto = (e.valores[c.key] ?? '').trim()
    if (!bruto) continue
    if (c.type === 'number') {
      const n = Number(bruto.replace(',', '.'))
      if (Number.isFinite(n) && n >= 0) resultado[c.key] = n
    } else resultado[c.key] = bruto
  }
  return {
    resultado,
    exercicios_livres: exerciciosLivresDe(detalhes).map((l, i) => ({ nome: l.nome, feito: !!e.feitos[i] })),
  }
}

