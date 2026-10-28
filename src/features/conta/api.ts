import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ErroAmigavel, mensagemDaFuncao } from '@/lib/erroAmigavel'
import type { ExclusaoPendente } from './exclusao'

/** Pedido de exclusão em andamento (null = nenhum). Falha em silêncio: o servidor já barra as gravações de uma conta em exclusão. */
export function useMinhaExclusao(userId: string | undefined) {
  return useQuery({
    queryKey: ['minha-exclusao', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('minha_exclusao')
      if (error) throw error
      return (data as ExclusaoPendente | null) ?? null
    },
    staleTime: 0,
    retry: false,
  })
}

export type ResultadoSolicitacao = { protocolo: string; prevista_em: string; email_enviado: boolean }

/** Pede a exclusão pela Edge Function (registra, manda o e-mail e encerra as sessões em todos os aparelhos). */
export function useSolicitarExclusao() {
  return useMutation({
    mutationFn: async (confirmacao: string): Promise<ResultadoSolicitacao> => {
      const { data, error } = await supabase.functions.invoke<ResultadoSolicitacao>('excluir-conta', { body: { confirmacao } })
      if (error) throw new ErroAmigavel(await mensagemDaFuncao(error, 'Não foi possível registrar o pedido agora. Tente de novo.'))
      if (!data?.protocolo) throw new ErroAmigavel('Não foi possível registrar o pedido agora. Tente de novo.')
      return data
    },
  })
}

/** Cancela a exclusão enquanto a carência não acabou: a conta volta ao normal. */
export function useCancelarExclusao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('cancelar_exclusao_conta')
      if (error) throw error
      return data === true
    },
    onSuccess: () => {
      qc.invalidateQueries()
    },
  })
}
