import { formatarBRL } from '@/lib/moeda'
import { dataSP } from '@/lib/datas'
import { formatarDataBR } from '@/lib/format'
import type { Assinatura, Plano, StatusAssinatura } from './useAssinatura'

/** Planos como o personal os vê (espelha PLANOS da function mp-subscribe e o PlanoModal). */
export const PLANOS_VALOR: Record<Plano, { nome: string; valor: number; dias: number }> = {
  mensal: { nome: 'Mensal', valor: 15, dias: 30 },
  trimestral: { nome: 'Trimestral', valor: 39, dias: 90 },
  semestral: { nome: 'Semestral', valor: 60, dias: 180 },
}

export const ROTULO_STATUS_ASSINATURA: Record<StatusAssinatura, string> = {
  trial: 'Trial',
  ativa: 'Ativo',
  expirada: 'Encerrado',
  cancelada: 'Cancelado',
}

export type ResumoAssinatura = {
  status: string
  plano: string
  /** "Trial termina em" / "Acesso até" / "Encerrou em" … */
  prazoRotulo: string
  prazo: string
  valor: string
  /** Texto de apoio (dias restantes do trial, sem renovação automática…) */
  nota: string | null
  /** Mostra "Assinar agora" (trial/encerrado) ou "Renovar" (ativo) */
  acao: 'assinar' | 'renovar'
}

const dataBR = (d: Date | null): string => (d ? formatarDataBR(dataSP(d)) : '—')

/** Dados da seção "Assinatura" das Configurações, a partir do que `useAssinatura` já lê de treino.assinaturas. */
export function resumirAssinatura(a: Assinatura): ResumoAssinatura {
  const status = ROTULO_STATUS_ASSINATURA[a.status]
  const plano = a.plano ? PLANOS_VALOR[a.plano] : null

  if (a.status === 'trial') {
    const dias = a.diasRestantesTrial ?? 0
    return {
      status,
      plano: 'Período de teste gratuito',
      prazoRotulo: dias > 0 ? 'Trial termina em' : 'Trial encerrou em',
      prazo: dataBR(a.trialFim),
      valor: 'Grátis',
      nota: dias > 0 ? `Você tem ${dias} ${dias === 1 ? 'dia' : 'dias'} de trial gratuito restantes.` : 'O período de teste terminou. Assine para continuar usando.',
      acao: 'assinar',
    }
  }
  if (a.status === 'ativa') {
    return {
      status,
      plano: plano?.nome ?? '—',
      prazoRotulo: 'Acesso até',
      prazo: dataBR(a.assinaturaFim),
      valor: plano ? formatarBRL(plano.valor) : '—',
      nota: 'Pagamento avulso, sem renovação automática: renove antes do fim do período para não perder o acesso.',
      acao: 'renovar',
    }
  }
  return {
    status,
    plano: plano?.nome ?? '—',
    prazoRotulo: a.status === 'cancelada' ? 'Cancelado — acesso até' : 'Encerrou em',
    prazo: dataBR(a.assinaturaFim ?? a.trialFim),
    valor: plano ? formatarBRL(plano.valor) : '—',
    nota: 'Assine para voltar a usar o app.',
    acao: 'assinar',
  }
}
