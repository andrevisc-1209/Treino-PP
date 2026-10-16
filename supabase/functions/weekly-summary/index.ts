// Edge Function: weekly-summary  (pg_cron, domingo 21h de Brasília; verify_jwt = false, protegida por CRON_SECRET)
// Resumo da semana (segunda a hoje) ao personal: treinos, receita das faturas pagas e alunos parados há 10+ dias.
// Sem nenhuma atividade na semana → não envia.

import { createClient } from 'npm:@supabase/supabase-js@2'
import { alunosInativos, dataSP, inicioDaSemana, limitesDoDiaSP, montarResumoSemanal, segredoCronValido, somarDias } from '../_shared/notificacoes.ts'
import { ultimosTreinos } from '../_shared/atividade.ts'
import { enviarAoPersonal } from '../_shared/whatsappPersonal.ts'

type LinhaAula = { professional_id: string; aula_participantes: { status: string }[] }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })
  if (!segredoCronValido(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) return new Response('Não autorizado', { status: 401 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
  const hoje = dataSP(new Date())
  const segunda = inicioDaSemana(hoje)
  const inicio = limitesDoDiaSP(segunda).inicio.toISOString()
  const fim = limitesDoDiaSP(hoje).fim.toISOString() // até o fim de hoje

  const { data: personais } = await admin.from('professionals').select('id, name').eq('whatsapp_opt_in', true).not('phone', 'is', null)
  const ids = (personais ?? []).map((p) => p.id as string)
  const nomes = new Map((personais ?? []).map((p) => [p.id as string, p.name as string]))
  if (ids.length === 0) return Response.json({ enviados: 0, pulados: 0, falhas: 0 })

  const [{ data: aulas }, { data: faturas }, { data: alunos }, ultimos] = await Promise.all([
    admin.from('aulas').select('professional_id, aula_participantes(status)').in('professional_id', ids).gte('starts_at', inicio).lt('starts_at', fim).neq('status', 'cancelada'),
    admin.from('faturas').select('professional_id, total').in('professional_id', ids).eq('status', 'paga').gte('paga_em', segunda).lte('paga_em', hoje),
    admin.from('alunos').select('id, name, professional_id').in('professional_id', ids).eq('active', true),
    ultimosTreinos(admin, ids, hoje),
  ])

  const contagem = { enviados: 0, pulados: 0, falhas: 0 }
  for (const id of ids) {
    const participacoes = ((aulas ?? []) as unknown as LinhaAula[]).filter((a) => a.professional_id === id).flatMap((a) => a.aula_participantes)
    const meus = (alunos ?? []).filter((a) => a.professional_id === id).map((a) => ({ id: a.id as string, nome: a.name as string }))
    const texto = montarResumoSemanal({
      nome: nomes.get(id) ?? null,
      realizados: participacoes.filter((p) => p.status === 'presente').length,
      agendados: participacoes.filter((p) => ['previsto', 'presente', 'falta'].includes(p.status)).length,
      receita: (faturas ?? []).filter((f) => f.professional_id === id).reduce((soma, f) => soma + Number(f.total), 0),
      inativos: alunosInativos(meus, ultimos, hoje, 10, false).map((i) => ({ nome: i.nome, dias: i.dias })),
    })
    if (!texto) {
      contagem.pulados++
      continue
    }
    const r = await enviarAoPersonal(admin, id, 'resumo_semanal', texto)
    contagem[r === 'enviado' ? 'enviados' : r === 'pulado' ? 'pulados' : 'falhas']++
  }
  return Response.json(contagem)
})
