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

export type PerfilProfissional = {
  name: string
  cpf: string | null
  phone: string | null
  whatsappOptIn: boolean
  uf: string | null
  cidade: string | null
  bairro: string | null
}

/** Nome/CPF/telefone (+ UF/cidade, só pra exibir/editar) — quando nome/CPF/telefone está vazio, o app pede pra completar o cadastro (DefinirSenhaPage/AuthCallbackPage). */
/** Coluna `bairro` ainda não existe (migration 20261034 não rodou): o app segue funcionando sem ela. */
const colunaBairroAusente = (e: { code?: string; message?: string } | null): boolean => !!e && (e.code === '42703' || e.code === 'PGRST204' || /bairro/i.test(e.message ?? ''))

export async function buscarPerfilProfissional(userId: string): Promise<PerfilProfissional> {
  let { data, error } = await supabase.from('professionals').select('name, cpf, phone, whatsapp_opt_in, uf, cidade, bairro').eq('id', userId).single()
  if (colunaBairroAusente(error)) {
    const r = await supabase.from('professionals').select('name, cpf, phone, whatsapp_opt_in, uf, cidade').eq('id', userId).single()
    data = r.data ? { ...r.data, bairro: null } : null
    error = r.error
  }
  if (error || !data) throw error
  return { name: data.name ?? '', cpf: data.cpf, phone: data.phone, whatsappOptIn: data.whatsapp_opt_in ?? false, uf: data.uf ?? null, cidade: data.cidade ?? null, bairro: data.bairro ?? null }
}

export async function salvarPerfilProfissional(
  userId: string,
  perfil: { name: string; cpf: string; phone: string; whatsappOptIn: boolean; uf: string; cidade: string; bairro?: string },
): Promise<void> {
  // CPF só pela RPC atualizar_cpf (valida no servidor, limita 5 tentativas/dia e não confirma se o CPF já existe em outra conta);
  // o UPDATE direto de `cpf` foi revogado do cliente (migration 20261048). Vem primeiro: se falhar, nada mais é salvo.
  const { error: errCpf } = await supabase.rpc('atualizar_cpf', { p_cpf: perfil.cpf })
  if (errCpf) throw errCpf

  const base = { name: perfil.name, phone: perfil.phone, whatsapp_opt_in: perfil.whatsappOptIn, uf: perfil.uf, cidade: perfil.cidade }
  let { error } = await supabase.from('professionals').update({ ...base, bairro: perfil.bairro?.trim() || null }).eq('id', userId)
  if (colunaBairroAusente(error)) ({ error } = await supabase.from('professionals').update(base).eq('id', userId))
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

/** CEP → bairro/cidade/UF do personal, editável depois do cadastro (Configurações). */
export function useSalvarLocalidade(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ uf, cidade, bairro }: { uf: string; cidade: string; bairro?: string }) => {
      let { error } = await supabase.from('professionals').update({ uf, cidade, bairro: bairro?.trim() || null }).eq('id', userId)
      if (colunaBairroAusente(error)) ({ error } = await supabase.from('professionals').update({ uf, cidade }).eq('id', userId))
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['perfil-profissional', userId] }),
  })
}

/** Nome e telefone do personal, editáveis nas Configurações (o CPF nunca muda aqui — ver migration de imutabilidade). */
export function useSalvarDadosPessoais(userId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ name, phone }: { name: string; phone: string }) => {
      const { error } = await supabase.from('professionals').update({ name, phone }).eq('id', userId)
      if (error) throw error
    },
    // trocar o telefone zera a verificação no banco (trigger): recarrega o selo também
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['perfil-profissional', userId] })
      qc.invalidateQueries({ queryKey: ['telefone-verificado', userId] })
    },
  })
}
