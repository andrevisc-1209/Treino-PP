import { useMemo, useState, type ReactNode } from 'react'
import { PlanoModal } from '@/components/PlanoModal'
import { ExigirAssinaturaContext } from './useExigirAssinatura'
import { useModoLeitura } from './useAssinatura'

/** Um único modal de planos para o app logado: botões que gravam usam `exigir` e, em modo leitura, caem aqui. */
export function ExigirAssinaturaProvider({ children }: { children: ReactNode }) {
  const somenteLeitura = useModoLeitura()
  const [aberto, setAberto] = useState(false)

  const valor = useMemo(
    () => ({
      somenteLeitura,
      abrirPlanos: () => setAberto(true),
      exigir: (acao: () => void) => () => (somenteLeitura ? setAberto(true) : acao()),
    }),
    [somenteLeitura],
  )

  return (
    <ExigirAssinaturaContext.Provider value={valor}>
      {children}
      <PlanoModal open={aberto} onClose={() => setAberto(false)} />
    </ExigirAssinaturaContext.Provider>
  )
}
