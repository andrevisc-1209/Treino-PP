/**
 * Só devolve o endereço se for um link https:// válido. Dado digitado ou gravado pela API (ex.: `maps_link`) nunca vira `href`
 * sem passar por aqui: `javascript:`, `data:` e afins viram null.
 */
export function linkHttps(valor: unknown): string | null {
  if (typeof valor !== 'string') return null
  try {
    const url = new URL(valor.trim())
    return url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

/** Link de busca no Google Maps para um endereço em texto (usado quando o link do local não é um https válido). */
export function linkMapsDoEndereco(endereco: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`
}
