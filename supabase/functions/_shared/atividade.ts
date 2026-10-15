// Último treino de cada aluno (sessão de musculação concluída ou treino registrado/feito à distância), em 'aaaa-mm-dd' de São Paulo.

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import { dataSP, somarDias } from './notificacoes.ts'

/** `admin` = cliente service_role com schema "treino". Olha só os últimos `janelaDias` dias (quem passou disso fica fora do mapa = sem dado). */
export async function ultimosTreinos(admin: SupabaseClient, professionalIds: string[], hoje: string, janelaDias = 60): Promise<Map<string, string>> {
  const mapa = new Map<string, string>()
  if (professionalIds.length === 0) return mapa
  const desde = somarDias(hoje, -janelaDias)
  const [{ data: sessoes }, { data: execucoes }] = await Promise.all([
    admin.from('sessoes').select('aluno_id, session_date').in('professional_id', professionalIds).eq('status', 'concluida').gte('session_date', desde),
    admin.from('execucoes_assincrono').select('aluno_id, concluido_em').in('professional_id', professionalIds).eq('status', 'concluido').gte('concluido_em', `${desde}T00:00:00-03:00`),
  ])
  const considerar = (alunoId: string, dia: string) => {
    if (dia > (mapa.get(alunoId) ?? '')) mapa.set(alunoId, dia)
  }
  for (const s of sessoes ?? []) considerar(s.aluno_id, s.session_date)
  for (const e of execucoes ?? []) if (e.concluido_em) considerar(e.aluno_id, dataSP(e.concluido_em))
  return mapa
}
