/** CREF no formato padrão: 6 dígitos, hífen, G (graduado) ou P (provisionado), barra e a UF. Ex.: 012345-G/RJ. */

/** Aplica a máscara enquanto a pessoa digita: 012345-G/RJ. Aceita colar com ou sem pontuação e ignora o que não encaixa. */
export function mascararCref(texto: string): string {
  const t = texto.toUpperCase().replace(/^\s*CREF\s*/, '')
  const digitos = t.replace(/\D/g, '').slice(0, 6)
  let resto = t.replace(/[^A-Z]/g, '') // só as letras, na ordem: categoria e UF
  // só a primeira letra após os dígitos pode ser G ou P; as demais formam a UF
  let saida = digitos
  if (digitos.length === 6) {
    const cat = resto[0]
    if (cat === 'G' || cat === 'P') {
      saida += `-${cat}`
      resto = resto.slice(1)
      const uf = resto.slice(0, 2)
      if (uf) saida += `/${uf}`
    } else if (resto.length > 0) {
      // letra inválida na categoria: não aceita
      return saida
    } else {
      // ainda sem categoria; o hífen aparece quando a pessoa digitar G ou P
      return saida
    }
  }
  return saida
}

export const CREF_COMPLETO = /^\d{6}-[GP]\/[A-Z]{2}$/

/** Vazio é permitido (campo opcional); preenchido, precisa estar no padrão completo. Devolve a mensagem do erro ou null. */
export function erroDoCref(cref: string): string | null {
  const t = cref.trim()
  if (t === '') return null
  return CREF_COMPLETO.test(t) ? null : 'Use o formato do CREF: 012345-G/RJ (6 números, G ou P e a sigla do estado).'
}
