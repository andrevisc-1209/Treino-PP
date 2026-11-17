import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { mostrarInfoGlobal } from '@/components/Toast'
import { lerCupomGuardado, limparCupomGuardado, textoDoResultado, type MeuCupom, type RespostaCupom } from './cupom'

/** O cupom que a própria pessoa já usou (dias e data); nunca o nome do parceiro. */
export function useMeuCupom() {
  return useQuery({
    queryKey: ['meu-cupom'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('meu_cupom')
      if (error) throw error
      return data as MeuCupom
    },
    staleTime: 60_000,
  })
}

/** Resgata um código digitado. O servidor decide (conta nova, período, limite, uma vez só). */
export function useResgatarCupom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (codigo: string) => {
      const { data, error } = await supabase.rpc('resgatar_cupom', { p_codigo: codigo })
      if (error) throw error
      return data as RespostaCupom
    },
    onSuccess: (r) => {
      if (r.resultado === 'ok') {
        qc.invalidateQueries({ queryKey: ['assinatura'] })
        qc.invalidateQueries({ queryKey: ['meu-cupom'] })
        qc.invalidateQueries({ queryKey: ['indicacoes'] })
      }
    },
  })
}

/**
 * Logo depois de entrar: se a pessoa digitou/abriu um cupom no cadastro, resgata uma vez e esquece.
 * Sem rede, mantém o código para a próxima abertura. Com resposta do servidor (certa ou não), mostra o resultado e limpa.
 */
export function useAplicarCupomGuardado(userId: string) {
  const resgatar = useResgatarCupom()
  const { mutate } = resgatar
  useEffect(() => {
    const codigo = lerCupomGuardado()
    if (!codigo) return
    mutate(codigo, {
      onSuccess: (r) => {
        limparCupomGuardado()
        mostrarInfoGlobal(textoDoResultado(r).texto)
      },
    })
  }, [userId, mutate])
}
