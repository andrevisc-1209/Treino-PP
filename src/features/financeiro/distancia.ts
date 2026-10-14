import type { CobrancaFormValor } from './CobrancaForm'

const numero = (texto: string): number => Number(texto.replace(',', '.'))

/** Cobrar treino à distância só existe no modelo "por aula"; o valor é do personal (pode ser diferente do da aula). */
export function validarDistancia(v: Pick<CobrancaFormValor, 'modelo' | 'cobrarDistancia' | 'valorDistanciaTexto'>): string | null {
  if (v.modelo !== 'por_aula' || !v.cobrarDistancia) return null
  const n = numero(v.valorDistanciaTexto)
  return !v.valorDistanciaTexto.trim() || Number.isNaN(n) || n <= 0 ? 'Informe o valor do treino à distância (maior que zero)' : null
}

export function payloadDistancia(v: Pick<CobrancaFormValor, 'modelo' | 'cobrarDistancia' | 'valorDistanciaTexto'>): { cobrar_distancia: boolean; valor_distancia: number | null } {
  if (v.modelo !== 'por_aula' || !v.cobrarDistancia) return { cobrar_distancia: false, valor_distancia: null }
  return { cobrar_distancia: true, valor_distancia: numero(v.valorDistanciaTexto) }
}
