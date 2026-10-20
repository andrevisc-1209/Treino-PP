// Edge Function: mp-webhook  (deploy com --no-verify-jwt: quem chama é o Mercado Pago)
//
// O MP só manda o ID do recurso no webhook (type + data.id). O estado real vem
// de GET na API do MP com o nosso token — é isso que torna o webhook seguro: um
// POST forjado só consegue fazer a gente re-sincronizar um ID que o MP confirma.
// Assinatura x-signature: sempre obrigatória (MP_WEBHOOK_SECRET); inválida/ausente -> 401, sem segredo -> 500
// (falha fechada; ver decidirWebhook em _shared/mp.ts). Só o token de produção (MP_ACCESS_TOKEN) é aceito.
//
// Eventos tratados:
//   payment                         -> Checkout Pro (Pix/cartão/boleto): aprovado ativa/renova o plano
//   subscription_preapproval       -> sincroniza o preapproval (data.id)
//   subscription_authorized_payment -> cobrança recorrente: acha o preapproval e sincroniza
// Resposta: 200 pra o que não é nosso/ignorado; 401 assinatura inválida;
// 500 em falha nossa (MP/DB) — o MP reenvia nesses casos.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { resposta429, resposta503, verificarLimite } from '../_shared/rateLimit.ts'
import { assinaturaValida, atualizacaoDoPreapproval, decidirWebhook, PLANOS, tokenMpValido } from '../_shared/mp.ts'
import { aplicarPagamento } from '../_shared/pagamento.ts'
import { ipDoCliente } from '../_shared/consentimento.ts'
import { dataSP, montarPagamentoPlano } from '../_shared/notificacoes.ts'
import { enviarAoPersonal } from '../_shared/whatsappPersonal.ts'

const ok = (msg = 'ok') => new Response(msg, { status: 200 })

async function mpGet(path: string, token: string) {
  const r = await fetch(`https://api.mercadopago.com${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!r.ok) throw new Error(`MP ${path} -> ${r.status}`)
  return await r.json()
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })

  // Rate limit por IP (30/min): barra rajadas de chamadas forjadas antes de qualquer processamento.
  const ipWebhook = ipDoCliente(req.headers)
  if (ipWebhook) {
    const lim = await verificarLimite(`mp-webhook:ip:${ipWebhook}`, 30)
    if (lim === 'excedido') return resposta429()
    if (lim === 'erro') return resposta503() // falha fechada: o Mercado Pago reenvia o webhook
  }

  const token = Deno.env.get('MP_ACCESS_TOKEN')
  if (!tokenMpValido(token)) {
    console.error('mp-webhook: MP_ACCESS_TOKEN ausente ou é um token de teste (TEST-)')
    return new Response('sem token', { status: 500 })
  }

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
  const decisao = decidirWebhook({ temSegredo, assinaturaOk })
  if (decisao === 'rejeitar_assinatura') return new Response('assinatura inválida', { status: 401 })
  if (decisao === 'rejeitar_sem_segredo') {
    console.error('mp-webhook: MP_WEBHOOK_SECRET não configurado — rejeitando')
    return new Response('webhook sem segredo configurado', { status: 500 })
  }

  try {
    if (tipo === 'payment') {
      const pagamento = await mpGet(`/v1/payments/${dataId}`, token)
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
      const donoId: string | undefined = pagamento.metadata?.user_id ?? pagamento.external_reference
      const { data: atual } = donoId
        ? await supabase.from('assinaturas').select('status, assinatura_fim, mp_payment_id').eq('professional_id', donoId).maybeSingle()
        : { data: null }
      // Cada pagamento só credita UMA vez (tabela pagamentos_processados), mesmo reentregue fora de ordem.
      const resultado = await aplicarPagamento(
        {
          reivindicar: async (paymentId) => {
            const { data, error } = await supabase.from('pagamentos_processados').upsert({ payment_id: paymentId }, { onConflict: 'payment_id', ignoreDuplicates: true }).select('payment_id')
            if (error) throw error
            return (data?.length ?? 0) > 0
          },
          desfazer: async (paymentId) => {
            await supabase.from('pagamentos_processados').delete().eq('payment_id', paymentId)
          },
          gravar: async (professionalId, atualizacao) => {
            const { data, error } = await supabase.from('assinaturas').update(atualizacao).eq('professional_id', professionalId).select('professional_id')
            if (error) throw error
            return data?.length ?? 0
          },
        },
        pagamento,
        atual,
      )
      if (resultado.tipo === 'ignorado') {
        console.log('mp-webhook: pagamento ignorado:', resultado.motivo, `(status ${pagamento.status})`)
        return ok('pagamento ignorado')
      }
      if (resultado.tipo === 'ja_processado') {
        console.log('mp-webhook: pagamento já processado (reentrega ignorada)', String(pagamento.id))
        return ok('pagamento já processado')
      }
      if (resultado.linhas === 0) console.warn('mp-webhook: nenhuma assinatura para', resultado.professionalId)
      // Aviso por WhatsApp ao personal (opt-in): só pagamento aprovado que ativou/renovou o plano. Nunca derruba o webhook.
      if (resultado.tipo === 'creditado' && resultado.linhas > 0) {
        try {
          const plano = PLANOS[pagamento.metadata?.plan_slug as keyof typeof PLANOS]
          const ate = (resultado.atualizacao as { assinatura_fim?: string }).assinatura_fim
          if (plano && ate) await enviarAoPersonal(supabase, resultado.professionalId, 'pagamento_plano', montarPagamentoPlano({ plano: plano.reason.replace('Treino PP ', ''), valor: plano.amount, ate: dataSP(ate) }))
        } catch (e) {
          console.error('mp-webhook: pagamento registrado, mas o aviso por WhatsApp falhou', (e as Error).message)
        }
      }
      return ok()
    }

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
