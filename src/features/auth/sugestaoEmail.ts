/** Provedores de e-mail comuns no Brasil: se o domínio digitado é quase igual a um deles, é provável erro de digitação ("gmial.com"). */
const DOMINIOS = ['gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com', 'yahoo.com.br', 'icloud.com', 'uol.com.br', 'bol.com.br', 'live.com', 'terra.com.br', 'globo.com']

/** Distância de edição com troca de letras vizinhas contando como UM erro ("gmial" → "gmail"). */
function distancia(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 0; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1)
    }
  }
  return d[a.length][b.length]
}

/** O e-mail com o domínio corrigido ("ana@gmial.com" → "ana@gmail.com"), ou null se não há o que sugerir. */
export function sugerirEmail(email: string): string | null {
  const m = /^([^\s@]+)@([^\s@]+)$/.exec(email.trim())
  if (!m) return null
  const [, local, dominio] = m
  const d = dominio.toLowerCase()
  if (DOMINIOS.includes(d)) return null
  let melhor: { dominio: string; dist: number } | null = null
  for (const candidato of DOMINIOS) {
    const dist = distancia(d, candidato)
    // distância 1 sempre; 2 só em domínios longos (evita sugerir coisa diferente para domínios curtos)
    if ((dist === 1 || (dist === 2 && candidato.length >= 10)) && (!melhor || dist < melhor.dist)) melhor = { dominio: candidato, dist }
  }
  return melhor ? `${local}@${melhor.dominio}` : null
}
