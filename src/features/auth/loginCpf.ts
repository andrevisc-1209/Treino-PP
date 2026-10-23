import { supabase } from '@/lib/supabase'
import { ErroAmigavel, mensagemDaFuncao } from '@/lib/erroAmigavel'

/**
 * Entra com CPF e senha pela Edge Function `login-cpf` (o CPF é resolvido para o e-mail no servidor; o e-mail não chega aqui).
 * Falha com ErroAmigavel (mensagem pronta) e, se der certo, ativa a sessão devolvida.
 */
export async function entrarComCpf(cpf: string, password: string, captchaToken: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('login-cpf', { body: { cpf: cpf.replace(/\D/g, ''), password, captchaToken: captchaToken || undefined } })
  if (error) throw new ErroAmigavel(await mensagemDaFuncao(error, 'Não foi possível entrar agora. Tente de novo.'))
  const sessao = data?.session as { access_token?: string; refresh_token?: string } | undefined
  if (!sessao?.access_token || !sessao.refresh_token) throw new ErroAmigavel('Não foi possível entrar agora. Tente de novo.')
  const { error: erroSessao } = await supabase.auth.setSession({ access_token: sessao.access_token, refresh_token: sessao.refresh_token })
  if (erroSessao) throw new ErroAmigavel('Não foi possível entrar agora. Tente de novo.')
}
