import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { lerOrigemGuardada, limparOrigemGuardada } from './origem'

/**
 * Registra, uma vez, a origem guardada (UTM) logo depois de entrar. O servidor decide se vale (conta criada nas últimas 48 h e ainda sem origem);
 * em qualquer resposta a origem guardada é descartada, para não ser reaplicada. Sem rede, mantém para a próxima abertura.
 */
export function useRegistrarOrigemGuardada(userId: string) {
  const registrar = useMutation({
    mutationFn: async (o: { source: string; medium: string | null; campaign: string | null }) => {
      const { data, error } = await supabase.rpc('registrar_origem_cadastro', { p_source: o.source, p_medium: o.medium, p_campaign: o.campaign })
      if (error) throw error
      return data as 'registrado' | 'ignorado'
    },
    onSuccess: () => limparOrigemGuardada(),
  })
  const { mutate } = registrar
  useEffect(() => {
    const guardada = lerOrigemGuardada()
    if (guardada) mutate(guardada)
  }, [userId, mutate])
}
