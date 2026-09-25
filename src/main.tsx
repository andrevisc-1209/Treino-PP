import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { mostrarErroGlobal, ToastHost } from '@/components/Toast'
import App from './App'
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  // Rede de segurança: nenhuma mutation falha em silêncio, mesmo as que não
  // tratam onError localmente (fire-and-forget: duplicar, excluir, reordenar...).
  mutationCache: new MutationCache({
    onError: (error) => {
      mostrarErroGlobal((error as Error).message || 'Algo deu errado. Tente novamente.')
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
      <ToastHost />
    </QueryClientProvider>
  </StrictMode>,
)
