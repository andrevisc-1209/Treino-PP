import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { ErroAmigavel } from '@/lib/erroAmigavel'

/** Mensagem em português que a Edge Function devolve em { error } (status não-2xx). */
async function mensagemDoErro(error: unknown, padrao: string): Promise<string> {
  const contexto = (error as { context?: Response })?.context
  if (contexto && typeof contexto.json === 'function') {
    try {
      const corpo = await contexto.json()
      if (typeof corpo?.error === 'string') return corpo.error
    } catch {
      // corpo ausente ou não-JSON: cai na mensagem padrão
    }
  }
  return padrao
}

/** Pede um código por WhatsApp para o telefone (celular brasileiro). */
export async function solicitarCodigoTelefone(phone: string): Promise<void> {
  const { error } = await supabase.functions.invoke('solicitar-verificacao-phone', { body: { phone } })
  if (error) throw new ErroAmigavel(await mensagemDoErro(error, 'Não foi possível enviar o código. Tente de novo.'))
}

/** Confere o código de 6 dígitos; se certo, o telefone passa a constar como verificado. */
export async function confirmarCodigoTelefone(code: string): Promise<void> {
  const { error } = await supabase.functions.invoke('confirmar-verificacao-phone', { body: { code } })
  if (error) throw new ErroAmigavel(await mensagemDoErro(error, 'Não foi possível confirmar o código. Tente de novo.'))
}

/**
 * Data em que o telefone do personal foi verificado (null = não verificado). Consulta à parte do perfil: se a coluna ainda
 * não existir no banco (migration 20261046 não rodou), devolve null em vez de quebrar a tela de Configurações.
 */
export function useTelefoneVerificadoEm(userId: string | undefined) {
  return useQuery({
    queryKey: ['telefone-verificado', userId],
    enabled: !!userId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.from('professionals').select('phone_verified_at').eq('id', userId!).maybeSingle()
      if (error) return null
      return (data?.phone_verified_at as string | null) ?? null
    },
  })
}
