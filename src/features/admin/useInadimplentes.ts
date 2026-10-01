import { useMemo } from 'react'
import { useAdminPersonais, type PersonalAdmin } from './api'

export type Inadimplente = {
  personal: PersonalAdmin
  dataExpiracao: string
  diasVencido: number
  cor: 'amarelo' | 'laranja' | 'vermelho'
}

function corPorDiasVencido(dias: number): Inadimplente['cor'] {
  if (dias <= 3) return 'amarelo'
  if (dias <= 7) return 'laranja'
  return 'vermelho'
}

/**
 * Deriva a lista de inadimplentes a partir dos dados que
 * useAdminPersonais() já busca (não é uma query nova — status='expirada'
 * já vem junto de treino.admin_listar_personais(), não precisa de JOIN
 * nem de migration à parte).
 */
export function useInadimplentes() {
  const personais = useAdminPersonais()

  const inadimplentes = useMemo<Inadimplente[]>(() => {
    const agora = Date.now()
    return (personais.data ?? [])
      .filter((p) => p.status === 'expirada')
      .map((p) => {
        // Quem chegou a assinar um plano pago expira pela data do plano;
        // quem nunca assinou, pelo fim do trial.
        const dataExpiracao = p.assinatura_fim ?? p.trial_fim
        const diasVencido = dataExpiracao ? Math.max(0, Math.floor((agora - new Date(dataExpiracao).getTime()) / 86_400_000)) : 0
        return { personal: p, dataExpiracao: dataExpiracao ?? '', diasVencido, cor: corPorDiasVencido(diasVencido) }
      })
      .sort((a, b) => b.diasVencido - a.diasVencido)
  }, [personais.data])

  return { inadimplentes, isLoading: personais.isLoading, error: personais.error }
}
