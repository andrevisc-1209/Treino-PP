// Edge Function: avisos-financeiros  (pg_cron, todo dia 9h de Brasília; verify_jwt = false, protegida por CRON_SECRET)
// Cobranças (faturas) de alunos que venceram há exatamente 1, 3 ou 7 dias e ainda não foram pagas → uma mensagem por personal.
// Alunos não têm "plano" no app: o que vence para eles é a fatura gerada ao fechar o ciclo (treino.faturas.vencimento).
// (O vencimento do plano do PRÓPRIO personal é outro aviso: avisos-diarios.)

import { createClient } from 'npm:@supabase/supabase-js@2'
import { dataSP, diasEntre, montarFaturasVencidas, segredoCronValido, somarDias, type FaturaVencida } from '../_shared/notificacoes.ts'
import { enviarAoPersonal } from '../_shared/whatsappPersonal.ts'

const DIAS_DE_AVISO = [1, 3, 7]

type LinhaFatura = { professional_id: string; vencimento: string; total: number; aluno: { name: string } | null; professional: { name: string } | null }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })
  if (!segredoCronValido(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) return new Response('Não autorizado', { status: 401 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
  const hoje = dataSP(new Date())
  const { data, error } = await admin
    .from('faturas')
    .select('professional_id, vencimento, total, aluno:alunos!inner(name, apagado_em), professional:professionals(name)')
    .is('aluno.apagado_em', null) // aluno na lixeira não gera aviso de cobrança
    .in('status', ['aberta', 'enviada'])
    .in('vencimento', DIAS_DE_AVISO.map((d) => somarDias(hoje, -d)))
  if (error) {
    console.error('avisos-financeiros: falha ao ler faturas', error.message)
    return new Response('erro', { status: 500 })
  }

  const porPersonal = new Map<string, { nome: string | null; faturas: FaturaVencida[] }>()
  for (const f of (data ?? []) as unknown as LinhaFatura[]) {
    const atual = porPersonal.get(f.professional_id) ?? { nome: f.professional?.name ?? null, faturas: [] }
    atual.faturas.push({ nome: f.aluno?.name ?? 'Aluno', dias: diasEntre(f.vencimento, hoje), valor: Number(f.total) })
    porPersonal.set(f.professional_id, atual)
  }

  const contagem = { enviados: 0, pulados: 0, falhas: 0 }
  for (const [id, { nome, faturas }] of porPersonal) {
    const texto = montarFaturasVencidas(nome, faturas)
    if (!texto) continue
    const r = await enviarAoPersonal(admin, id, 'plano_vencido', texto)
    contagem[r === 'enviado' ? 'enviados' : r === 'pulado' ? 'pulados' : 'falhas']++
  }
  return Response.json(contagem)
})
