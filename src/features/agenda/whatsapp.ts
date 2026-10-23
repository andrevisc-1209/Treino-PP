import { supabase } from '@/lib/supabase'
import { ErroAmigavel } from '@/lib/erroAmigavel'

/** Extrai a mensagem em português que a Edge Function devolve em { error } (status não-2xx). */
async function mensagemDoErro(error: unknown): Promise<string> {
  const contexto = (error as { context?: Response })?.context
  if (contexto && typeof contexto.json === 'function') {
    try {
      const corpo = await contexto.json()
      if (typeof corpo?.error === 'string') return corpo.error
    } catch {
      // corpo ausente ou não-JSON: cai na mensagem genérica
    }
  }
  return 'Não foi possível enviar a mensagem de teste. Tente de novo.'
}

/** Pede à function send-whatsapp uma mensagem de teste para o WhatsApp do próprio personal (o número vem do cadastro, nunca daqui). */
export async function enviarTesteWhatsapp(): Promise<void> {
  const { error } = await supabase.functions.invoke('send-whatsapp', { body: { tipo: 'teste' } })
  if (error) throw new ErroAmigavel(await mensagemDoErro(error))
}
