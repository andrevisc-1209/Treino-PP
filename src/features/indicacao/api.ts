import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mostrarInfoGlobal } from '@/components/Toast'
import { avisoDoRegistro, lerCodigoGuardado, limparCodigoGuardado, type MinhasIndicacoes, type ResultadoRegistro } from './indicacao'

/** Números do programa para a tela (nunca dado de outra pessoa). */
export function useMinhasIndicacoes() {
  return useQuery({
    queryKey: ['indicacoes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('minhas_indicacoes')
      if (error) throw error
      return data as MinhasIndicacoes
    },
    staleTime: 60_000,
  })
}

/**
 * Logo depois de entrar: se a pessoa chegou por um link de indicação (?ref=), registra o código uma vez e esquece.
 * O servidor decide se vale (conta nova, não é o próprio código, uma vez só). Sem rede, mantém o código para a próxima abertura.
 */
export function useAplicarIndicacaoGuardada(userId: string) {
  const qc = useQueryClient()
  const aplicar = useMutation({
    mutationFn: async ({ codigo, segundosDesdeAbertura }: { codigo: string; segundosDesdeAbertura: number }) => {
      const { data, error } = await supabase.rpc('registrar_indicacao', { p_codigo: codigo, p_segundos_desde_abertura: segundosDesdeAbertura })
      if (error) throw error
      return data as ResultadoRegistro
    },
    onSuccess: (r) => {
      limparCodigoGuardado()
      const aviso = avisoDoRegistro(r)
      if (aviso) mostrarInfoGlobal(aviso)
      qc.invalidateQueries({ queryKey: ['indicacoes'] })
    },
  })
  const { mutate } = aplicar
  useEffect(() => {
    const guardado = lerCodigoGuardado()
    if (guardado) mutate(guardado)
  }, [userId, mutate])
}
