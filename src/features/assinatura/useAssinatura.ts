import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ERROS } from '@/lib/mensagens'

export type StatusAssinatura = 'trial' | 'ativa' | 'expirada' | 'cancelada'
export type Plano = 'mensal' | 'trimestral' | 'semestral'

export type Assinatura = {
  status: StatusAssinatura
  diasRestantesTrial: number | null
  trialFim: Date | null
  plano: Plano | null
  assinaturaFim: Date | null
  /** fim do mês grátis ganho por indicação (acréscimo depois do trial/assinatura); null = não tem */
  bonusAte: Date | null
  estaAtivo: boolean
}

export type LinhaAssinatura = {
  status: StatusAssinatura
  plano: Plano | null
  trial_fim: string
  assinatura_fim: string | null
  bonus_ate?: string | null
}

/** O que a query guarda: a linha da assinatura + o veredito do SERVIDOR (null = a função não respondeu). */
export type DadosAssinatura = { linha: LinhaAssinatura; ativoNoServidor: boolean | null }

function diasRestantes(ate: string, agora: number): number {
  const ms = new Date(ate).getTime() - agora
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

/**
 * Monta a assinatura exibida. `estaAtivo` vem do SERVIDOR (treino.assinatura_ativa, relógio do servidor — o mesmo que impõe o modo
 * leitura no banco); só se a função não responder cai no cálculo local (relógio do aparelho), que serve apenas para a tela.
 */
export function calcularAssinatura({ linha, ativoNoServidor }: DadosAssinatura, agora: number = Date.now()): Assinatura {
  const trialValido = linha.status === 'trial' && diasRestantes(linha.trial_fim, agora) > 0
  const assinaturaValida = linha.status === 'ativa' && (!linha.assinatura_fim || diasRestantes(linha.assinatura_fim, agora) > 0)
  const bonusValido = !!linha.bonus_ate && diasRestantes(linha.bonus_ate, agora) > 0
  return {
    status: linha.status,
    diasRestantesTrial: linha.status === 'trial' ? diasRestantes(linha.trial_fim, agora) : null,
    trialFim: linha.trial_fim ? new Date(linha.trial_fim) : null,
    plano: linha.plano,
    assinaturaFim: linha.assinatura_fim ? new Date(linha.assinatura_fim) : null,
    bonusAte: linha.bonus_ate ? new Date(linha.bonus_ate) : null,
    estaAtivo: ativoNoServidor ?? (trialValido || assinaturaValida || bonusValido),
  }
}

export function useAssinatura() {
  return useQuery({
    queryKey: ['assinatura'],
    queryFn: async (): Promise<DadosAssinatura> => {
      const [{ data, error }, { data: ativo, error: erroAtivo }] = await Promise.all([
        supabase.from('assinaturas').select('status, plano, trial_fim, assinatura_fim, bonus_ate').single(),
        supabase.rpc('assinatura_ativa'),
      ])
      if (error) throw error
      return { linha: data as LinhaAssinatura, ativoNoServidor: erroAtivo || typeof ativo !== 'boolean' ? null : ativo }
    },
    select: (dados): Assinatura => calcularAssinatura(dados),
    staleTime: 60_000,
  })
}

/** Texto da tela e do toast quando uma gravação é barrada por falta de assinatura (modo leitura). */
export const MSG_MODO_LEITURA = ERROS.ASSINATURA.modoLeitura

/** Modo leitura = já sabemos que a assinatura venceu (sem dado ainda, não bloqueia: o servidor é quem barra as gravações). */
export const emModoLeitura = (assinatura: Assinatura | undefined): boolean => !!assinatura && !assinatura.estaAtivo

export function useModoLeitura(): boolean {
  const { data } = useAssinatura()
  return emModoLeitura(data)
}

/**
 * Esta falha de gravação é por falta de assinatura? Só se o erro for de permissão/RLS E a assinatura já constar como inativa no cache
 * (veredito do servidor). Dado cru do cache da query `['assinatura']`.
 */
export function erroPorModoLeitura(erro: unknown, dados: DadosAssinatura | undefined): boolean {
  if (!dados || dados.ativoNoServidor !== false) return false
  const e = (typeof erro === 'object' && erro !== null ? erro : {}) as { code?: unknown; message?: unknown }
  const msg = typeof e.message === 'string' ? e.message.toLowerCase() : ''
  return e.code === '42501' || msg.includes('row-level security') || msg.includes('permission denied')
}
