/** Sugere um nome pra duplicata que não colida com os já existentes: "Nome (2)", "Nome (3)"... */
export function sugerirNomeDuplicado(nomeBase: string, existentes: string[]): string {
  const usados = new Set(existentes.map((n) => n.trim().toLowerCase()))
  let n = 2
  while (usados.has(`${nomeBase} (${n})`.toLowerCase())) n++
  return `${nomeBase} (${n})`
}
