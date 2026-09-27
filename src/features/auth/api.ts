import { supabase } from '@/lib/supabase'

export async function buscarNomeProfissional(userId: string): Promise<string> {
  const { data, error } = await supabase.from('professionals').select('name').eq('id', userId).single()
  if (error) throw error
  return data.name ?? ''
}

export async function salvarNomeProfissional(userId: string, name: string): Promise<void> {
  const { error } = await supabase.from('professionals').update({ name }).eq('id', userId)
  if (error) throw error
}

export type PerfilProfissional = { name: string; cpf: string | null; phone: string | null; whatsappOptIn: boolean }

/** Nome/CPF/telefone — quando algum está vazio, o app pede pra completar o cadastro (DefinirSenhaPage/AuthCallbackPage). */
export async function buscarPerfilProfissional(userId: string): Promise<PerfilProfissional> {
  const { data, error } = await supabase.from('professionals').select('name, cpf, phone, whatsapp_opt_in').eq('id', userId).single()
  if (error) throw error
  return { name: data.name ?? '', cpf: data.cpf, phone: data.phone, whatsappOptIn: data.whatsapp_opt_in ?? false }
}

export async function salvarPerfilProfissional(
  userId: string,
  perfil: { name: string; cpf: string; phone: string; whatsappOptIn: boolean },
): Promise<void> {
  const { error } = await supabase
    .from('professionals')
    .update({ name: perfil.name, cpf: perfil.cpf, phone: perfil.phone, whatsapp_opt_in: perfil.whatsappOptIn })
    .eq('id', userId)
  if (error) throw error
}
