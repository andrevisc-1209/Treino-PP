import type { Aluno } from './api'

export function formatarLista(itens: string[], detalhe: string | null) {
  return itens.map((i) => (i === 'Outros' && detalhe ? detalhe : i)).join(', ')
}

function truncar(texto: string, max: number) {
  const t = texto.trim()
  return t.length > max ? `${t.slice(0, max)}…` : t
}

/**
 * Rótulo de um selo de saúde: regiões cadastradas têm prioridade; alunos
 * cadastrados antes das regiões existirem caem para as notas livres
 * (truncadas); sem nenhum dos dois, retorna null (selo mostra só o rótulo).
 */
export function rotuloSaude(regioes: string[], notas: string | null): string | null {
  if (regioes.length > 0) return formatarLista(regioes, notas)
  if (notas && notas.trim()) return truncar(notas, 30)
  return null
}

export function rotuloBadge(prefixo: string, regioes: string[], notas: string | null): string {
  const r = rotuloSaude(regioes, notas)
  return r ? `${prefixo}: ${r}` : prefixo
}

/** Mensagem de aviso de saúde (lesão + cirurgia) para telas de plano/execução. null se não houver nada a avisar. */
export function avisoSaude(aluno: Pick<Aluno, 'injury' | 'injury_regions' | 'injury_notes' | 'surgery' | 'surgery_regions' | 'surgery_notes'>): string | null {
  const partes: string[] = []
  if (aluno.injury) partes.push(rotuloBadge('Lesão', aluno.injury_regions, aluno.injury_notes))
  if (aluno.surgery) partes.push(rotuloBadge('Cirurgia', aluno.surgery_regions, aluno.surgery_notes))
  return partes.length > 0 ? partes.join(' · ') : null
}
