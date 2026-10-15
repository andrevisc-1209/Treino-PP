// Edge Function: daily-briefing  (chamada pelo pg_cron; verify_jwt = false, protegida pelo segredo CRON_SECRET no header x-cron-secret)
// Manda ao personal (opt-in + telefone) a agenda de hoje e a previsão do tempo. Sem aulas no dia → não envia.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { dataSP, horaSP, limitesDoDiaSP, montarBriefing, segredoCronValido, type AulaDoDia } from '../_shared/notificacoes.ts'
import { previsaoDoDia } from '../_shared/previsaoDoDia.ts'
import { enviarAoPersonal } from '../_shared/whatsappPersonal.ts'

type LinhaAula = { professional_id: string; starts_at: string; local: string | null; aula_participantes: { status: string; aluno: { name: string } | null }[] }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })
  if (!segredoCronValido(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) return new Response('Não autorizado', { status: 401 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
  const { inicio, fim } = limitesDoDiaSP(dataSP(new Date()))
  const { data: aulas, error } = await admin
    .from('aulas')
    .select('professional_id, starts_at, local, aula_participantes(status, aluno:alunos(name))')
    .gte('starts_at', inicio.toISOString())
    .lt('starts_at', fim.toISOString())
    .neq('status', 'cancelada')
  if (error) {
    console.error('daily-briefing: falha ao ler a agenda', error.message)
    return new Response('erro', { status: 500 })
  }

  const porPersonal = new Map<string, AulaDoDia[]>()
  for (const a of (aulas ?? []) as unknown as LinhaAula[]) {
    for (const p of a.aula_participantes) {
      if (p.status !== 'previsto' && p.status !== 'presente') continue
      porPersonal.set(a.professional_id, [...(porPersonal.get(a.professional_id) ?? []), { horario: horaSP(a.starts_at), aluno: p.aluno?.name ?? 'Aluno', local: a.local }])
    }
  }
  const ids = [...porPersonal.keys()]
  if (ids.length === 0) return Response.json({ enviados: 0, pulados: 0, falhas: 0 })

  const { data: personais } = await admin.from('professionals').select('id, name, cidade, uf').in('id', ids).eq('whatsapp_opt_in', true).not('phone', 'is', null)
  const climaPorCidade = new Map<string, Awaited<ReturnType<typeof previsaoDoDia>>>()
  const contagem = { enviados: 0, pulados: 0, falhas: 0 }
  for (const p of personais ?? []) {
    const chave = `${p.cidade}|${p.uf}`
    if (!climaPorCidade.has(chave)) climaPorCidade.set(chave, await previsaoDoDia(p.cidade, p.uf))
    const texto = montarBriefing({ nome: p.name, aulas: porPersonal.get(p.id) ?? [], clima: climaPorCidade.get(chave) ?? null })
    if (!texto) {
      contagem.pulados++
      continue
    }
    const r = await enviarAoPersonal(admin, p.id, 'briefing_diario', texto)
    contagem[r === 'enviado' ? 'enviados' : r === 'pulado' ? 'pulados' : 'falhas']++
  }
  return Response.json(contagem)
})
