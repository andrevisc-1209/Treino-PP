import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type Clima =
  | { semCidade: true }
  | {
      semCidade?: false
      cidade: string
      uf: string
      atual: { temp: number; sensacao: number; vento: number; texto: string; emoji: string }
      hoje: { min: number; max: number; chuvaProb: number; chuvaMm?: number; uv: number }
      dica: string
    }

/** Previsão de hoje para a cidade do personal (Edge Function `clima`). Falha em silêncio: o card só some. */
export function useClima() {
  return useQuery({
    queryKey: ['clima'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<Clima>('clima')
      if (error || !data) throw new Error('Previsão indisponível')
      return data
    },
    staleTime: 30 * 60_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
