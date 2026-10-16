// Edge Function: avisos-diarios  (pg_cron; verify_jwt = false, protegida por CRON_SECRET)
//  1) plano do personal vencendo em 3 dias  →  WhatsApp ao próprio personal
//  2) alunos com o último treino há exatamente 10 dias  →  uma mensagem só com a lista

import { createClient } from 'npm:@supabase/supabase-js@2'
import { alunosInativos, dataSP, limitesDoDiaSP, montarAlunosInativos, montarPlanoExpirando, segredoCronValido, somarDias } from '../_shared/notificacoes.ts'
import { ultimosTreinos } from '../_shared/atividade.ts'
import { enviarAoPersonal } from '../_shared/whatsappPersonal.ts'

const NOME_PLANO: Record<string, string> = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral' }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })
  if (!segredoCronValido(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) return new Response('Não autorizado', { status: 401 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
  const hoje = dataSP(new Date())
  const contagem = { plano_expirando: { enviados: 0, pulados: 0, falhas: 0 }, aluno_inativo: { enviados: 0, pulados: 0, falhas: 0 } }
  const contar = (grupo: keyof typeof contagem, r: Awaited<ReturnType<typeof enviarAoPersonal>>) => contagem[grupo][r === 'enviado' ? 'enviados' : r === 'pulado' ? 'pulados' : 'falhas']++

  // 1) plano vencendo em exatamente 3 dias (dia de São Paulo)
  const alvo = limitesDoDiaSP(somarDias(hoje, 3))
  const { data: vencendo } = await admin
    .from('assinaturas')
    .select('professional_id, plano, assinatura_fim, professional:professionals(name)')
    .eq('status', 'ativa')
    .gte('assinatura_fim', alvo.inicio.toISOString())
    .lt('assinatura_fim', alvo.fim.toISOString())
  for (const a of (vencendo ?? []) as unknown as { professional_id: string; plano: string | null; assinatura_fim: string; professional: { name: string } | null }[]) {
    const texto = montarPlanoExpirando({ nome: a.professional?.name ?? null, plano: a.plano ? (NOME_PLANO[a.plano] ?? null) : null, ate: dataSP(a.assinatura_fim) })
    contar('plano_expirando', await enviarAoPersonal(admin, a.professional_id, 'plano_expirando', texto))
  }

  // 2) alunos inativos há exatamente 10 dias, por personal
  const { data: personais } = await admin.from('professionals').select('id, name').eq('whatsapp_opt_in', true).not('phone', 'is', null)
  const ids = (personais ?? []).map((p) => p.id as string)
  const nomes = new Map((personais ?? []).map((p) => [p.id as string, p.name as string]))
  if (ids.length > 0) {
    const [{ data: alunos }, ultimos] = await Promise.all([
      admin.from('alunos').select('id, name, professional_id').in('professional_id', ids).eq('active', true),
      ultimosTreinos(admin, ids, hoje),
    ])
    for (const id of ids) {
      const meus = (alunos ?? []).filter((a) => a.professional_id === id).map((a) => ({ id: a.id as string, nome: a.name as string }))
      const texto = montarAlunosInativos(nomes.get(id) ?? null, alunosInativos(meus, ultimos, hoje, 10, true))
      if (texto) contar('aluno_inativo', await enviarAoPersonal(admin, id, 'aluno_inativo', texto))
    }
  }
  return Response.json(contagem)
})
