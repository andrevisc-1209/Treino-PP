// Edge Function: mp-webhook  (deploy com --no-verify-jwt: quem chama é o Mercado Pago)
//
// O MP só manda o ID do recurso no webhook (type + data.id). O estado real vem
// de GET na API do MP com o nosso token — é isso que torna o webhook seguro: um
// POST forjado só consegue fazer a gente re-sincronizar um ID que o MP confirma.
// Se MP_WEBHOOK_SECRET estiver configurado, a assinatura x-signature também é validada.
//
// Eventos tratados:
//   subscription_preapproval       -> sincroniza o preapproval (data.id)
//   subscription_authorized_payment -> cobrança recorrente: acha o preapproval e sincroniza
// Resposta: 200 pra o que não é nosso/ignorado; 401 assinatura inválida;
// 500 em falha nossa (MP/DB) — o MP reenvia nesses casos.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { assinaturaValida, fimDoPeriodo, planoPorFrequencia, statusDoMP } from '../_shared/mp.ts'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ok = (msg = 'ok') => new Response(msg, { status: 200 })

async function mpGet(path: string, token: string) {
  const r = await fetch(`https://api.mercadopago.com${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error(`MP ${path} -> ${r.status}`)
  return await r.json()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })

  const token = Deno.env.get('MP_ACCESS_TOKEN') ?? Deno.env.get('MP_ACCESS_TOKEN_TEST')
  if (!token) return new Response('sem token', { status: 500 })

  const url = new URL(req.url)
  const corpo = await req.json().catch(() => ({}))
  const tipo: string | undefined = corpo.type ?? url.searchParams.get('type') ?? undefined
  const dataId: string | undefined = corpo?.data?.id ?? url.searchParams.get('data.id') ?? undefined
  if (!tipo || !dataId) return ok('ignorado')

  const segredo = Deno.env.get('MP_WEBHOOK_SECRET')
  if (segredo) {
    const valida = await assinaturaValida({
      secret: segredo,
      xSignature: req.headers.get('x-signature'),
      xRequestId: req.headers.get('x-request-id'),
      dataId: url.searchParams.get('data.id') ?? String(dataId),
    })
    if (!valida) return new Response('assinatura inválida', { status: 401 })
  }

  try {
    let preapprovalId: string
    if (tipo === 'subscription_preapproval') {
      preapprovalId = String(dataId)
    } else if (tipo === 'subscription_authorized_payment') {
      const pagamento = await mpGet(`/authorized_payments/${dataId}`, token)
      if (!pagamento.preapproval_id) return ok('sem preapproval')
      preapprovalId = String(pagamento.preapproval_id)
    } else {
      return ok('evento ignorado')
    }

    const pre = await mpGet(`/preapproval/${preapprovalId}`, token)
    const status = statusDoMP(pre.status)
    const professionalId: string | undefined = pre.external_reference
    if (!status || !professionalId || !UUID.test(professionalId)) return ok('nada a atualizar')

    const atualizacao: Record<string, unknown> = { status, mp_subscription_id: String(pre.id) }
    if (status === 'ativa') {
      atualizacao.plano = planoPorFrequencia(pre.auto_recurring?.frequency)
      atualizacao.assinatura_fim = fimDoPeriodo(pre.next_payment_date)
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
    const { data, error } = await supabase.from('assinaturas').update(atualizacao).eq('professional_id', professionalId).select('professional_id')
    if (error) throw error
    if (!data?.length) console.warn('mp-webhook: nenhuma assinatura para', professionalId)
    return ok()
  } catch (e) {
    console.error('mp-webhook:', e)
    return new Response('erro', { status: 500 })
  }
})
