import type { Aluno } from './api'

export function formatarLista(itens: string[], detalhe: string | null) {
  return itens.map((i) => (i === 'Outros' && detalhe ? detalhe : i)).join(', ')
}

/** Mensagem de aviso de saúde (lesão + cirurgia) para telas de plano/execução. null se não houver nada a avisar. */
export function avisoSaude(aluno: Pick<Aluno, 'injury' | 'injury_regions' | 'injury_notes' | 'surgery' | 'surgery_regions' | 'surgery_notes'>): string | null {
  const partes: string[] = []
  if (aluno.injury) partes.push(`Lesão: ${formatarLista(aluno.injury_regions, aluno.injury_notes)}`)
  if (aluno.surgery) partes.push(`Cirurgia: ${formatarLista(aluno.surgery_regions, aluno.surgery_notes)}`)
  return partes.length > 0 ? partes.join(' · ') : null
}
