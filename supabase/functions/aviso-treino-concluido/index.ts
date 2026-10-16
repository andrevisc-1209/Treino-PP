// Edge Function: aviso-treino-concluido  (pg_cron a cada 15 min; verify_jwt = false, protegida por CRON_SECRET)
// Avisa o personal (WhatsApp) dos treinos que o aluno concluiu À DISTÂNCIA (pelo link). Idempotência: cada execução é marcada em
// execucoes_assincrono.whatsapp_avisado_em depois de tratada (enviada, ou pulada por falta de opt-in/telefone); se o envio FALHAR,
// fica sem marca e a próxima rodada tenta de novo (só execuções das últimas 24 h). Vários treinos do mesmo personal viram uma mensagem só.
// Só nome do aluno e modalidade — nunca resultado, PSE, observações ou qualquer dado de saúde.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { ehModalidadeRotulo, montarTreinosConcluidos, segredoCronValido, type TreinoConcluido } from '../_shared/notificacoes.ts'
import { enviarAoPersonal } from '../_shared/whatsappPersonal.ts'

type LinhaExecucao = { id: string; professional_id: string; modalidade: string; aluno: { name: string } | null }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })
  if (!segredoCronValido(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) return new Response('Não autorizado', { status: 401 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
  const desde = new Date(Date.now() - 24 * 3_600_000).toISOString()
  const { data, error } = await admin
    .from('execucoes_assincrono')
    .select('id, professional_id, modalidade, aluno:alunos(name)')
    .eq('origem', 'link')
    .eq('status', 'concluido')
    .is('whatsapp_avisado_em', null)
    .gte('concluido_em', desde)
    .order('concluido_em')
  if (error) {
    console.error('aviso-treino-concluido: falha ao ler execuções', error.message)
    return new Response('erro', { status: 500 })
  }

  const porPersonal = new Map<string, { ids: string[]; treinos: TreinoConcluido[] }>()
  for (const e of (data ?? []) as unknown as LinhaExecucao[]) {
    const atual = porPersonal.get(e.professional_id) ?? { ids: [], treinos: [] }
    atual.ids.push(e.id)
    atual.treinos.push({ aluno: e.aluno?.name ?? 'Aluno', modalidade: ehModalidadeRotulo(e.modalidade) })
    porPersonal.set(e.professional_id, atual)
  }

  const contagem = { enviados: 0, pulados: 0, falhas: 0 }
  for (const [professionalId, { ids, treinos }] of porPersonal) {
    const texto = montarTreinosConcluidos(treinos)
    if (!texto) continue
    const r = await enviarAoPersonal(admin, professionalId, 'treino_concluido', texto, { umPorDia: false })
    contagem[r === 'enviado' ? 'enviados' : r === 'pulado' ? 'pulados' : 'falhas']++
    if (r !== 'falhou') {
      const { error: errMarca } = await admin.from('execucoes_assincrono').update({ whatsapp_avisado_em: new Date().toISOString() }).in('id', ids)
      if (errMarca) console.error('aviso-treino-concluido: aviso enviado, mas a marca falhou', errMarca.message)
    }
  }
  return Response.json(contagem)
})
