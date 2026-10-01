import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/features/auth/AuthProvider'

/** Usado tanto pelo guard do /admin quanto pelo redirecionamento automático em RequireAuth. */
export function useIsAdmin() {
  const { session, loading: authLoading } = useAuth()
  const query = useQuery({
    queryKey: ['admin', 'sou-admin', session?.user.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('professionals').select('is_admin').eq('id', session!.user.id).single()
      if (error) throw error
      return data.is_admin as boolean
    },
    enabled: !!session,
  })
  return { isAdmin: query.data ?? false, loading: authLoading || (!!session && query.isLoading) }
}
