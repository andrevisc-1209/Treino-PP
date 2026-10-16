// Rate limiting por janela fixa de 60 s, via RPC treino.upsert_rate_limit (service_role).
// Falha ABERTA: se o banco der erro, a requisição segue (não derrubar webhook/consentimento por causa do limite).

import { createClient } from 'npm:@supabase/supabase-js@2'

/** true = bloqueado (excedeu `max` na janela). */
export async function limiteExcedido(chave: string, max: number, janelaSeg = 60): Promise<boolean> {
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
    const { data, error } = await admin.rpc('upsert_rate_limit', { p_key: chave, p_max: max, p_window_seconds: janelaSeg })
    if (error) {
      console.error('rateLimit: falha ao consultar limite', error.message)
      return false
    }
    return data === false
  } catch (e) {
    console.error('rateLimit: erro inesperado', e instanceof Error ? e.message : 'desconhecido')
    return false
  }
}

export function resposta429(headersExtras: Record<string, string> = {}): Response {
  return new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
    headers: { 'Content-Type': 'application/json', 'Retry-After': '60', ...headersExtras },
  })
}
