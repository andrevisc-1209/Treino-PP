// Edge Function: avisos-diarios  (pg_cron; verify_jwt = false, protegida por CRON_SECRET)
//  1) plano do personal vencendo em 3 dias  →  WhatsApp ao próprio personal
//  2) alunos com o último treino há exatamente 10 dias  →  uma mensagem só com a lista

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { alunosInativos, dataSP, montarAlunosInativos, montarPlanoExpirando, segredoCronValido } from '../_shared/notificacoes.ts'
import { diasParaVencer, fimEfetivoDoAcesso, lembretesDoDia, montarEmailRenovacao } from '../_shared/renovacao.ts'
import { ultimosTreinos } from '../_shared/atividade.ts'
import { enviarAoPersonal } from '../_shared/whatsappPersonal.ts'

const NOME_PLANO: Record<string, string> = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral' }
const APP_URL = 'https://treino.personalperto.com.br'
const FROM = 'Treino PP <noreply@personalperto.com.br>'

/** E-mail de renovação via Resend, no endereço do cadastro. A chave de idempotência evita e-mail repetido se o job rodar duas vezes no dia. Nunca loga e-mail nem nome. */
async function enviarEmailRenovacao(
  admin: SupabaseClient,
  resendKey: string | undefined,
  a: { professionalId: string; nome: string | null; plano: string | null; fimIso: string; dias: 5 | 1 | 0; hoje: string },
): Promise<'enviado' | 'pulado' | 'falhou'> {
  if (!resendKey) return 'pulado'
  try {
    const { data } = await admin.auth.admin.getUserById(a.professionalId)
    const email = data.user?.email
    if (!email) return 'pulado'
    const msg = montarEmailRenovacao({ nome: a.nome, plano: a.plano, fimIso: a.fimIso, dias: a.dias, appUrl: APP_URL })
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `renovacao-${a.professionalId}-${a.dias}-${a.hoje}` },
      body: JSON.stringify({ from: FROM, to: [email], subject: msg.assunto, html: msg.html, text: msg.texto }),
    })
    if (!resp.ok) console.error('avisos-diarios: Resend recusou o lembrete de renovação', resp.status)
    return resp.ok ? 'enviado' : 'falhou'
  } catch {
    console.error('avisos-diarios: falha ao enviar o lembrete de renovação por e-mail')
    return 'falhou'
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Método não permitido', { status: 405 })
  if (!segredoCronValido(req.headers.get('x-cron-secret'), Deno.env.get('CRON_SECRET'))) return new Response('Não autorizado', { status: 401 })

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'treino' } })
  const hoje = dataSP(new Date())
  const contagem = { plano_expirando: { enviados: 0, pulados: 0, falhas: 0 }, plano_expirando_email: { enviados: 0, pulados: 0, falhas: 0 }, aluno_inativo: { enviados: 0, pulados: 0, falhas: 0 } }
  const contar = (grupo: keyof typeof contagem, r: Awaited<ReturnType<typeof enviarAoPersonal>>) => contagem[grupo][r === 'enviado' ? 'enviados' : r === 'pulado' ? 'pulados' : 'falhas']++

  // 1) lembretes de renovação do plano pago: WhatsApp 3 e 1 dia antes; e-mail 5 e 1 dia antes e no dia (ver _shared/renovacao.ts).
  //    O fim real do acesso inclui o mês grátis de indicação (bonus_ate), se for depois do fim da assinatura.
  const { data: ativas } = await admin
    .from('assinaturas')
    .select('professional_id, plano, assinatura_fim, bonus_ate, professional:professionals(name)')
    .eq('status', 'ativa')
    .not('assinatura_fim', 'is', null)
  const resendKey = Deno.env.get('RESEND_API_KEY')
  for (const a of (ativas ?? []) as unknown as { professional_id: string; plano: string | null; assinatura_fim: string; bonus_ate: string | null; professional: { name: string } | null }[]) {
    const fim = fimEfetivoDoAcesso(a.assinatura_fim, a.bonus_ate)
    if (!fim) continue
    const dias = diasParaVencer(fim, hoje)
    const lembrete = lembretesDoDia(dias)
    const nome = a.professional?.name ?? null
    const plano = a.plano ? (NOME_PLANO[a.plano] ?? null) : null
    if (lembrete.whatsapp) {
      const texto = montarPlanoExpirando({ nome, plano, ate: dataSP(fim), dias: lembrete.whatsapp })
      contar('plano_expirando', await enviarAoPersonal(admin, a.professional_id, 'plano_expirando', texto))
    }
    if (lembrete.email !== null) {
      const r = await enviarEmailRenovacao(admin, resendKey, { professionalId: a.professional_id, nome, plano, fimIso: fim, dias: lembrete.email, hoje })
      contagem.plano_expirando_email[r === 'enviado' ? 'enviados' : r === 'pulado' ? 'pulados' : 'falhas']++
    }
  }

  // 2) alunos inativos há exatamente 10 dias, por personal
  const { data: personais } = await admin.from('professionals').select('id, name').eq('whatsapp_opt_in', true).not('phone', 'is', null).not('phone_verified_at', 'is', null)
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
