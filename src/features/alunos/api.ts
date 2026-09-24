import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type Aluno = {
  id: string
  professional_id: string
  name: string
  birth_date: string | null
  sex: 'M' | 'F' | 'outro' | null
  height_cm: number | null
  active: boolean
  injury: boolean
  injury_notes: string | null
  practices_sport: boolean
  sport_name: string | null
  medications: string | null
}

export function useAlunos() {
  return useQuery({
    queryKey: ['alunos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .eq('active', true)
        .order('name')
      if (error) throw error
      return data as Aluno[]
    },
  })
}

export function useCriarAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (nome: string) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const { error } = await supabase.from('alunos').insert({ name: nome, professional_id: u.user.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['alunos'] }),
  })
}
