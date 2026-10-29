// Confere no Cloudflare o token do captcha (Turnstile) que o navegador mandou. Segredo: TURNSTILE_SECRET_KEY (Supabase Secrets).
// Sem segredo configurado devolve 'sem_segredo' (quem chama FALHA FECHADO: sem como conferir, não aceita o pedido).

export type ResultadoTurnstile = 'ok' | 'invalido' | 'sem_segredo' | 'erro'
type Buscar = (url: string, init: { method: string; body: URLSearchParams }) => Promise<{ ok: boolean; json: () => Promise<unknown> }>

const URL_VERIFICACAO = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verificarTurnstile(token: unknown, ip: string | null, segredo: string | undefined, buscar: Buscar = fetch as unknown as Buscar): Promise<ResultadoTurnstile> {
  if (!segredo) return 'sem_segredo'
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) return 'invalido'
  const corpo = new URLSearchParams({ secret: segredo, response: token })
  if (ip) corpo.set('remoteip', ip)
  try {
    const r = await buscar(URL_VERIFICACAO, { method: 'POST', body: corpo })
    if (!r.ok) return 'erro'
    const j = (await r.json()) as { success?: unknown }
    return j.success === true ? 'ok' : 'invalido'
  } catch {
    return 'erro'
  }
}
