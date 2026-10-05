// Edge Function: mp-webhook  (deploy com --no-verify-jwt: quem chama é o Mercado Pago)
//
// O MP só manda o ID do recurso no webhook (type + data.id). O estado real vem
// de GET na API do MP com o nosso token — é isso que torna o webhook seguro: um
// POST forjado só consegue fazer a gente re-sincronizar um ID que o MP confirma.
// Assinatura x-signature: obrigatória em produção (MP_ACCESS_TOKEN definido); em sandbox, se faltar
// ou falhar, só loga aviso e processa (ver decidirWebhook em _shared/mp.ts).
//
// Eventos tratados:
//   subscription_preapproval       -> sincroniza o preapproval (data.id)
//   subscription_authorized_payment -> cobrança recorrente: acha o preapproval e sincroniza
// Resposta: 200 pra o que não é nosso/ignorado; 401 assinatura inválida;
// 500 em falha nossa (MP/DB) — o MP reenvia nesses casos.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { assinaturaValida, atualizacaoDoPreapproval, decidirWebhook } from '../_shared/mp.ts'

const ok = (msg = 'ok') => new Response(msg, { status: 200 })

async function mpGet(path: string, token: string) {
  const r = await fetch(`https://api.mercadopago.com${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error(`MP ${path} -> ${r.status}`)
  return await r.json()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })

  const tokenProducao = Deno.env.get('MP_ACCESS_TOKEN')
  const token = tokenProducao ?? Deno.env.get('MP_ACCESS_TOKEN_TEST')
  if (!token) return new Response('sem token', { status: 500 })

  const url = new URL(req.url)
  const corpo = await req.json().catch(() => ({}))
  const acao: string | undefined = corpo.action ?? undefined
  const tipo: string | undefined = corpo.type ?? url.searchParams.get('type') ?? undefined
  const dataId: string | undefined = corpo?.data?.id ?? url.searchParams.get('data.id') ?? undefined
  console.log('mp-webhook recebido:', JSON.stringify({ action: acao, type: tipo, data_id: dataId }))
  if (!tipo || !dataId || !/^[\w-]+$/.test(String(dataId))) return ok('ignorado')

  const segredo = Deno.env.get('MP_WEBHOOK_SECRET')
  const temSegredo = !!segredo && segredo.trim() !== ''
  const xSignature = req.headers.get('x-signature')
  const assinaturaOk = temSegredo
    ? await assinaturaValida({
        secret: segredo!,
        xSignature,
        xRequestId: req.headers.get('x-request-id'),
        dataId: url.searchParams.get('data.id') ?? String(dataId),
      })
    : false
  const decisao = decidirWebhook({ producao: !!tokenProducao, temSegredo, assinaturaOk })
  if (decisao === 'rejeitar_assinatura') return new Response('assinatura inválida', { status: 401 })
  if (decisao === 'rejeitar_sem_segredo') {
    console.error('mp-webhook: produção sem MP_WEBHOOK_SECRET — rejeitando')
    return new Response('webhook sem segredo configurado', { status: 500 })
  }
  if (decisao === 'processar_com_aviso') {
    const motivo = !temSegredo ? 'MP_WEBHOOK_SECRET não configurado' : !xSignature ? 'x-signature ausente' : 'x-signature inválida'
    console.warn(`mp-webhook: [sandbox] ${motivo}; processando mesmo assim (data.id=${dataId})`)
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
    const alvo = atualizacaoDoPreapproval(pre)
    if (!alvo) return ok('nada a atualizar')

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
    const { data, error } = await supabase.from('assinaturas').update(alvo.atualizacao).eq('professional_id', alvo.professionalId).select('professional_id')
    if (error) throw error
    if (!data?.length) console.warn('mp-webhook: nenhuma assinatura para', alvo.professionalId)
    return ok()
  } catch (e) {
    console.error('mp-webhook:', e)
    return new Response('erro', { status: 500 })
  }
})
