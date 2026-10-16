// Envio de WhatsApp ao PERSONAL com as regras da plataforma: opt-in ligado, telefone válido do cadastro, no máximo uma mensagem
// por tipo por dia e registro em treino.whatsapp_log (sem o texto nem o número). Usado pelas Edge Functions de aviso.
// Nunca derruba quem chama: devolve 'enviado' | 'pulado' | 'falhou'.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { configEvolution, enviarTexto } from './whatsapp.ts'
import { dataSP, decidirEnvio, type TipoNotificacao } from './notificacoes.ts'

export type ResultadoEnvio = 'enviado' | 'pulado' | 'falhou'

/** `admin` = cliente service_role com schema "treino". */
export async function enviarAoPersonal(admin: SupabaseClient, professionalId: string, tipo: TipoNotificacao, texto: string): Promise<ResultadoEnvio> {
  const cfg = configEvolution(Deno.env)
  if (!cfg) {
    console.error('whatsapp: faltam segredos EVOLUTION_API_URL / EVOLUTION_API_KEY / EVOLUTION_INSTANCE')
    return 'falhou'
  }
  const dia = dataSP(new Date())
  const [{ data: perfil }, { data: jaEnviado }] = await Promise.all([
    admin.from('professionals').select('whatsapp_opt_in, phone').eq('id', professionalId).maybeSingle(),
    admin.from('whatsapp_log').select('id').eq('professional_id', professionalId).eq('tipo', tipo).eq('dia', dia).eq('status', 'enviado').limit(1),
  ])
  const decisao = decidirEnvio({ optIn: perfil?.whatsapp_opt_in, phone: perfil?.phone, jaEnviadoHoje: (jaEnviado?.length ?? 0) > 0 })
  if (!decisao.enviar) return 'pulado'

  try {
    await enviarTexto(cfg, decisao.numero, texto)
  } catch (e) {
    const motivo = (e as Error).message.slice(0, 200) // só "evolution:<status>", nunca telefone nem corpo da resposta
    console.error('whatsapp: falha ao enviar', tipo, motivo)
    await admin.from('whatsapp_log').insert({ professional_id: professionalId, tipo, status: 'falhou', dia, error_message: motivo })
    return 'falhou'
  }
  const { error } = await admin.from('whatsapp_log').insert({ professional_id: professionalId, tipo, status: 'enviado', dia })
  if (error && error.code !== '23505') console.error('whatsapp: enviado, mas o log falhou', error.message)
  return 'enviado'
}
