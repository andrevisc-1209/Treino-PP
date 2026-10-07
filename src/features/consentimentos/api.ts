import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { normalizarStatus, type CanalEnvio, type LinhaConsentimento } from './utils'

type LinhaBanco = {
  aluno_id: string
  nome: string
  status: string | null
  canal: string | null
  enviado_at: string | null
  respondido_at: string | null
}

/** Um registro por aluno ativo: status, canal e data do envio mais recente e data da resposta. */
export function useConsentimentosPainel() {
  return useQuery({
    queryKey: ['consentimentos-painel'],
    queryFn: async (): Promise<LinhaConsentimento[]> => {
      const { data, error } = await supabase.rpc('consentimentos_saude_painel')
      if (error) throw error
      return ((data ?? []) as LinhaBanco[]).map((l) => ({
        aluno_id: l.aluno_id,
        nome: l.nome,
        status: normalizarStatus(l.status),
        canal: l.canal === 'email' || l.canal === 'whatsapp' ? l.canal : null,
        enviado_at: l.enviado_at,
        respondido_at: l.respondido_at,
      }))
    },
  })
}

export type EnvioHistorico = {
  id: string
  canal: CanalEnvio
  motivo: string
  motivo_livre: string | null
  criado_at: string
}

/** Envios do aluno (primeiro envio e reenvios), do mais antigo ao mais recente, + nome de quem enviou. */
export function useHistoricoConsentimento(alunoId: string | null) {
  return useQuery({
    queryKey: ['consentimento-historico', alunoId],
    enabled: !!alunoId,
    queryFn: async () => {
      const [envios, personal] = await Promise.all([
        supabase
          .from('consentimento_reenvios')
          .select('id, canal, motivo, motivo_livre, criado_at')
          .eq('aluno_id', alunoId!)
          .order('criado_at', { ascending: true }),
        supabase.from('professionals').select('name').maybeSingle(),
      ])
      if (envios.error) throw envios.error
      return { envios: (envios.data ?? []) as EnvioHistorico[], enviadoPor: personal.data?.name?.trim() || 'Você' }
    },
  })
}
