/** "2 dias e 3 h", "5 h 30 min", "20 min" — o que falta até o prazo. */
export function tempoRestante(ms: number): string {
  const min = Math.max(0, Math.floor(ms / 60_000))
  if (min < 60) return `${Math.max(1, min)} min`
  const h = Math.floor(min / 60)
  if (h < 24) return min % 60 ? `${h} h ${min % 60} min` : `${h} h`
  const d = Math.floor(h / 24)
  return h % 24 ? `${d} ${d === 1 ? 'dia' : 'dias'} e ${h % 24} h` : `${d} ${d === 1 ? 'dia' : 'dias'}`
}

