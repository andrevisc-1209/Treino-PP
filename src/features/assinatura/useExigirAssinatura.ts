import { createContext, useContext } from 'react'

type ExigirAssinatura = {
  /** Assinatura vencida (modo leitura): o servidor recusa qualquer gravação. */
  somenteLeitura: boolean
  /** Abre a escolha do plano. */
  abrirPlanos: () => void
  /** Envolve uma ação que grava: em modo leitura abre os planos em vez de começar um fluxo que vai falhar no fim. */
  exigir: (acao: () => void) => () => void
}

export const ExigirAssinaturaContext = createContext<ExigirAssinatura>({
  somenteLeitura: false,
  abrirPlanos: () => {},
  exigir: (acao) => acao,
})

export const useExigirAssinatura = () => useContext(ExigirAssinaturaContext)
