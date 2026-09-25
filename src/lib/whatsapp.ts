/** Link do WhatsApp (sem texto) para um telefone brasileiro em qualquer formato. null se inválido. */
export function linkWhatsApp(telefone: string | null | undefined): string | null {
  if (!telefone) return null
  let digitos = telefone.replace(/\D/g, '')
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`
  if (digitos.length !== 12 && digitos.length !== 13) return null
  return `https://wa.me/${digitos}`
}
