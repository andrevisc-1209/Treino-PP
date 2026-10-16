// Rate limiting por janela fixa (padrão 60 s), via RPC treino.upsert_rate_limit (service_role).
// `limiteExcedido` falha ABERTA (se o banco errar, a requisição segue) — serve às rotas públicas de baixo risco.
// `verificarLimite` devolve 'erro' separado de 'excedido': rotas sensíveis (webhook, envio de e-mail) falham FECHADAS.

import { createClient } from 'npm:@supabase/supabase-js@2'

export type ResultadoLimite = 'ok' | 'excedido' | 'erro'

type ChamadaRpc = (args: { p_key: string; p_max: number; p_window_seconds: number }) => PromiseLike<{ data: unknown; error: { message: string } | null }>

/** Núcleo testável: recebe a chamada ao banco já pronta. Chave limitada a 120 caracteres (evita linhas gigantes). */
export async function consultarLimite(rpc: ChamadaRpc, chave: string, max: number, janelaSeg = 60): Promise<ResultadoLimite> {
  try {
    const { data, error } = await rpc({ p_key: chave.slice(0, 120), p_max: max, p_window_seconds: janelaSeg })
    if (error) {
      console.error('rateLimit: falha ao consultar limite', error.message)
      return 'erro'
    }
    return data === false ? 'excedido' : 'ok'
  } catch (e) {
    console.error('rateLimit: erro inesperado', e instanceof Error ? e.message : 'desconhecido')
    return 'erro'
  }
}

/** Para rotas sensíveis: quem chama decide o que fazer com 'erro' (falha fechada). */
export async function verificarLimite(chave: string, max: number, janelaSeg = 60): Promise<ResultadoLimite> {
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
  return consultarLimite((a) => admin.rpc('upsert_rate_limit', a), chave, max, janelaSeg)
}

/** true = bloqueado (excedeu `max` na janela). Se o banco falhar, deixa passar (falha aberta). */
export async function limiteExcedido(chave: string, max: number, janelaSeg = 60): Promise<boolean> {
  return (await verificarLimite(chave, max, janelaSeg)) === 'excedido'
}

export function resposta429(headersExtras: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '60', ...headersExtras },
  })
}

/** Falha fechada: o banco do limite não respondeu. Quem reenvia (ex.: Mercado Pago) tenta de novo. */
export function resposta503(headersExtras: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: 'Serviço temporariamente indisponível' }), {
    status: 503,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '60', ...headersExtras },
  })
}
