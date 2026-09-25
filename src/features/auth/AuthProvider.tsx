import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

type AuthState = { session: Session | null; loading: boolean }
const AuthContext = createContext<AuthState>({ session: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ session: null, loading: true })
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setState({ session: data.session, loading: false }))

    // Convite ou recuperação de senha: o link traz o token no hash da URL
    // (#access_token=...&type=invite|recovery). Supabase processa e loga o
    // usuário automaticamente; mandamos para a tela de definir senha.
    const hash = window.location.hash
    if (hash.includes('type=invite') || hash.includes('type=recovery')) {
      navigate('/definir-senha', { replace: true })
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState({ session, loading: false })
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/definir-senha', { replace: true })
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [navigate])

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
