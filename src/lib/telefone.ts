// Máscara de telefone BR: (00) 00000-0000 (celular) ou (00) 0000-0000 (fixo).

/** Digita livre, formata como (00) 00000-0000 conforme os dígitos chegam. */
export function mascararTelefone(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

/** 10 dígitos (fixo) ou 11 (celular) — só o tamanho, sem validar DDD. */
export function validarTelefone(valor: string): boolean {
  const d = valor.replace(/\D/g, '')
  return d.length === 10 || d.length === 11
}
