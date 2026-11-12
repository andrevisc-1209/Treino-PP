import { MODALIDADES_ATIVAS, MODALIDADES_CONFIG, type ModalidadeTipo } from '@/types/modalidades'

/** As modalidades que o personal pode marcar como "atendo" (as 5 ativas do app) e como aparecem no pedido do visitante. */
export const OPCOES_DE_MODALIDADE: { value: ModalidadeTipo; label: string }[] = MODALIDADES_ATIVAS.map((m) => ({ value: m, label: rotulo(m) }))

function rotulo(m: ModalidadeTipo): string {
  return m === 'brick' ? 'Triathlon (bike + corrida)' : MODALIDADES_CONFIG[m].label
}

export function rotuloDaModalidade(chave: string): string {
  return (MODALIDADES_ATIVAS as string[]).includes(chave) ? rotulo(chave as ModalidadeTipo) : chave
}

/** Lê o que veio do banco: só chaves das 5 ativas, sem repetir, na ordem do app. */
export function lerModalidades(bruto: unknown): ModalidadeTipo[] {
  const lista = Array.isArray(bruto) ? bruto : []
  return MODALIDADES_ATIVAS.filter((m) => lista.includes(m))
}

/** O que a página pública mostra em "Modalidades": os nomes separados por " · " (até 80 caracteres); vazio = null. */
export function resumoDasModalidades(chaves: ModalidadeTipo[]): string | null {
  const nomes = chaves.map(rotulo)
  return nomes.length > 0 ? nomes.join(' · ').slice(0, 80) : null
}
