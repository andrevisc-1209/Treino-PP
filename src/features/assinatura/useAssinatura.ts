import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type StatusAssinatura = 'trial' | 'ativa' | 'expirada' | 'cancelada'
export type Plano = 'mensal' | 'trimestral' | 'semestral'

export type Assinatura = {
  status: StatusAssinatura
  diasRestantesTrial: number | null
  plano: Plano | null
  assinaturaFim: Date | null
  estaAtivo: boolean
}

type LinhaAssinatura = {
  status: StatusAssinatura
  plano: Plano | null
  trial_fim: string
  assinatura_fim: string | null
}

function diasRestantes(ate: string): number {
  const ms = new Date(ate).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function useAssinatura() {
  return useQuery({
    queryKey: ['assinatura'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('assinaturas')
        .select('status, plano, trial_fim, assinatura_fim')
        .single()
      if (error) throw error
      return data as LinhaAssinatura
    },
    select: (linha): Assinatura => {
      const trialValido = linha.status === 'trial' && diasRestantes(linha.trial_fim) > 0
      const assinaturaValida = linha.status === 'ativa' && (!linha.assinatura_fim || diasRestantes(linha.assinatura_fim) > 0)
      return {
        status: linha.status,
        diasRestantesTrial: linha.status === 'trial' ? diasRestantes(linha.trial_fim) : null,
        plano: linha.plano,
        assinaturaFim: linha.assinatura_fim ? new Date(linha.assinatura_fim) : null,
        estaAtivo: trialValido || assinaturaValida,
      }
    },
    // Enquanto a assinatura não carrega (ou dá erro), não bloqueia o app —
    // deixa passar. Bloquear por falha de rede seria pior que o risco de um
    // trial vencido escapar por alguns segundos.
    staleTime: 60_000,
  })
}
