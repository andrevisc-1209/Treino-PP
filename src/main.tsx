import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { mostrarErroGlobal, ToastHost } from '@/components/Toast'
import { mapearErroSupabase } from '@/lib/erros'
import { ConfirmHost } from '@/components/ConfirmSheet'
import { UndoToastHost } from '@/components/UndoToast'
import { OfflineBanner, marcarFalhaDeRede } from '@/components/OfflineBanner'
import App from './App'
import { ajustarTecladoVirtual } from '@/lib/teclado'
import { erroPorModoLeitura, MSG_MODO_LEITURA, type DadosAssinatura } from '@/features/assinatura/useAssinatura'
import { iniciarSeAceito } from '@/features/analytics/analytics'
import './index.css'

iniciarSeAceito() // só liga a análise de uso se a pessoa já aceitou (na página inicial ou aqui)

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  // Rede de segurança: nenhuma mutation falha em silêncio, mesmo as que não
  // tratam onError localmente (fire-and-forget: duplicar, excluir, reordenar...).
  mutationCache: new MutationCache({
    onError: (error) => {
      const msg = (error as Error).message?.toLowerCase() ?? ''
      if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('load failed')) marcarFalhaDeRede()
      // gravação barrada porque a assinatura venceu (modo leitura, imposto pelo banco): explica o motivo em vez do genérico
      const assinatura = queryClient.getQueryData<DadosAssinatura>(['assinatura'])
      mostrarErroGlobal(erroPorModoLeitura(error, assinatura) ? MSG_MODO_LEITURA : mapearErroSupabase(error))
    },
  }),
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
      <OfflineBanner />
      <ToastHost />
      <ConfirmHost />
      <UndoToastHost />
    </QueryClientProvider>
  </StrictMode>,
)

ajustarTecladoVirtual()

document.getElementById('splash')?.remove()
