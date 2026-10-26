export type TipoRelato = 'problema' | 'duvida' | 'sugestao'
export type StatusRelato = 'novo' | 'em_andamento' | 'resolvido'

export const TIPOS_RELATO: { valor: TipoRelato; rotulo: string }[] = [
  { valor: 'problema', rotulo: 'Problema' },
  { valor: 'duvida', rotulo: 'Dúvida' },
  { valor: 'sugestao', rotulo: 'Sugestão' },
]

export const ROTULO_STATUS_RELATO: Record<StatusRelato, string> = { novo: 'Novo', em_andamento: 'Em andamento', resolvido: 'Resolvido' }

export const RELATO_MIN = 10
export const RELATO_MAX = 1500

/** Mensagem pronta para o formulário: texto aparado; erro em português se curto/longo demais. */
export function validarRelato(texto: string): { ok: true; mensagem: string } | { ok: false; erro: string } {
  const mensagem = texto.trim()
  if (mensagem.length < RELATO_MIN) return { ok: false, erro: `Conte um pouco mais (mínimo de ${RELATO_MIN} caracteres).` }
  if (mensagem.length > RELATO_MAX) return { ok: false, erro: `O texto passou de ${RELATO_MAX} caracteres. Resuma um pouco.` }
  return { ok: true, mensagem }
}

/** Aparelho/navegador, cortado no limite do banco (200). Sem nada além do user agent. */
export function dispositivoDoNavegador(ua: string | undefined): string | null {
  const t = (ua ?? '').trim().slice(0, 200)
  return t || null
}
