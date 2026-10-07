/** Link do WhatsApp (sem texto) para um telefone brasileiro em qualquer formato. null se inválido. */
export function linkWhatsApp(telefone: string | null | undefined): string | null {
  if (!telefone) return null
  let digitos = telefone.replace(/\D/g, '')
  if (digitos.length === 10 || digitos.length === 11) digitos = `55${digitos}`
  if (digitos.length !== 12 && digitos.length !== 13) return null
  return `https://wa.me/${digitos}`
}

/** Link do WhatsApp com a mensagem pronta: abre a conversa do telefone (se válido) ou deixa escolher o contato. */
export function linkWhatsAppComTexto(telefone: string | null | undefined, texto: string): string {
  return `${linkWhatsApp(telefone) ?? 'https://wa.me/'}?text=${encodeURIComponent(texto)}`
}
