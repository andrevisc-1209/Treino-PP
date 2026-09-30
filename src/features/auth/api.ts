import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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

export function usePerfilProfissional(userId: string | undefined) {
  return useQuery({
    queryKey: ['perfil-profissional', userId],
    queryFn: () => buscarPerfilProfissional(userId!),
    enabled: !!userId,
  })
}

/** Só o toggle de WhatsApp — salva na hora, sem passar pelo formulário completo. Nunca mexe no CPF (ver migration de imutabilidade). */
export function useAtualizarWhatsappOptIn(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (valor: boolean) => {
      const { error } = await supabase.from('professionals').update({ whatsapp_opt_in: valor }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['perfil-profissional', userId] }),
  })
}
