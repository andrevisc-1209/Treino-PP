// Máscara e validação de CPF — dígito verificador (módulo 11), sem libs externas.

/** Digita livre, formata como 000.000.000-00 conforme os dígitos chegam. */
export function mascararCPF(valor: string): string {
  const d = valor.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

function digitoVerificador(base: string, peso: number): number {
  const soma = base.split('').reduce((acc, d, i) => acc + Number(d) * (peso - i), 0)
  const resto = (soma * 10) % 11
  return resto === 10 ? 0 : resto
}

/** Valida os 2 dígitos verificadores. Rejeita sequências repetidas (ex.: 111.111.111-11). */
export function validarCPF(valor: string): boolean {
  const d = valor.replace(/\D/g, '')
  if (d.length !== 11) return false
  if (/^(\d)\1{10}$/.test(d)) return false
  const dv1 = digitoVerificador(d.slice(0, 9), 10)
  if (dv1 !== Number(d[9])) return false
  const dv2 = digitoVerificador(d.slice(0, 10), 11)
  return dv2 === Number(d[10])
}
