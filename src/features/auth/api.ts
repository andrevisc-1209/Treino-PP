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
