// Edge Function: avisar-relato  (chamada por trigger do banco via pg_net; verify_jwt = false, protegida por CRON_SECRET)
// Quando um personal envia um relato na central de ajuda, avisa o(s) admin(s) por WhatsApp: só o tipo e o nome do personal.
// O texto do relato NÃO vai na mensagem (fica no painel /admin). Nunca derruba quem chama.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { montarRelatoNovo, segredoCronValido } from '../_shared/notificacoes.ts'
import { enviarAoPersonal } from '../_shared/whatsappPersonal.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })
  if (!segredoCronValido(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) return new Response('Não autorizado', { status: 401 })

  const corpo = (await req.json().catch(() => null)) as { relato_id?: string } | null
  const relatoId = corpo?.relato_id
  if (!relatoId || !/^[0-9a-f-]{36}$/i.test(relatoId)) return new Response('relato_id inválido', { status: 400 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
  const { data: relato, error } = await admin
    .from('relatos')
    .select('tipo, professional:professionals(name)')
    .eq('id', relatoId)
    .maybeSingle()
  if (error || !relato) {
    console.error('avisar-relato: relato não encontrado', error?.message ?? '')
    return new Response('não encontrado', { status: 404 })
  }

  const { data: admins } = await admin.from('professionals').select('id').eq('is_admin', true)
  const texto = montarRelatoNovo(relato.tipo, (relato.professional as unknown as { name: string | null } | null)?.name ?? null)
  const contagem = { enviados: 0, pulados: 0, falhas: 0 }
  for (const a of admins ?? []) {
    const r = await enviarAoPersonal(admin, a.id, 'relato_novo', texto, { umPorDia: false })
    contagem[r === 'enviado' ? 'enviados' : r === 'pulado' ? 'pulados' : 'falhas']++
  }
  return Response.json(contagem)
})
