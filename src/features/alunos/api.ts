import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type Aluno = {
  id: string
  professional_id: string
  name: string
  birth_date: string | null
  sex: 'M' | 'F' | 'outro' | null
  height_cm: number | null
  phone: string | null
  email: string | null
  active: boolean
  injury: boolean
  injury_notes: string | null
  practices_sport: boolean
  sport_name: string | null
  medications: string | null
}

export type Peso = {
  id: string
  aluno_id: string
  weight_kg: number
  measured_at: string
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

export function useAluno(id: string | undefined) {
  return useQuery({
    queryKey: ['aluno', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('alunos').select('*').eq('id', id!).single()
      if (error) throw error
      return data as Aluno
    },
    enabled: !!id,
  })
}

export function useConsentimentoAtivo(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['consentimento-ativo', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consentimentos')
        .select('id')
        .eq('aluno_id', alunoId!)
        .is('revoked_at', null)
        .order('consented_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return !!data
    },
    enabled: !!alunoId,
  })
}

export function usePesos(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['pesos', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pesos')
        .select('*')
        .eq('aluno_id', alunoId!)
        .order('measured_at', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Peso[]
    },
    enabled: !!alunoId,
  })
}

export type SalvarAlunoInput = {
  id?: string
  name: string
  birth_date?: string
  sex?: 'M' | 'F' | 'outro'
  height_cm?: number
  phone?: string
  email?: string
  weight_kg?: number
  injury: boolean
  injury_notes?: string
  practices_sport: boolean
  sport_name?: string
  medications?: string
  lgpd_consent: boolean
  hadActiveConsent: boolean
}

export function useSalvarAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: SalvarAlunoInput) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const professional_id = u.user.id

      const alunoPayload = {
        professional_id,
        name: input.name,
        birth_date: input.birth_date || null,
        sex: input.sex || null,
        height_cm: input.height_cm ?? null,
        phone: input.phone || null,
        email: input.email || null,
        injury: input.injury,
        injury_notes: input.injury ? input.injury_notes || null : null,
        practices_sport: input.practices_sport,
        sport_name: input.practices_sport ? input.sport_name || null : null,
        medications: input.medications || null,
      }

      let alunoId = input.id
      if (alunoId) {
        const { error } = await supabase.from('alunos').update(alunoPayload).eq('id', alunoId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('alunos').insert(alunoPayload).select('id').single()
        if (error) throw error
        alunoId = data.id as string
      }

      if (!input.id && input.weight_kg) {
        const { error } = await supabase.from('pesos').insert({ aluno_id: alunoId, weight_kg: input.weight_kg })
        if (error) throw error
      }

      if (input.lgpd_consent && !input.hadActiveConsent) {
        const { error } = await supabase.from('consentimentos').insert({
          aluno_id: alunoId,
          professional_id,
          method: 'app',
          consent_version: '1.0',
        })
        if (error) throw error
      }

      return alunoId as string
    },
    onSuccess: (alunoId) => {
      qc.invalidateQueries({ queryKey: ['alunos'] })
      qc.invalidateQueries({ queryKey: ['aluno', alunoId] })
      qc.invalidateQueries({ queryKey: ['consentimento-ativo', alunoId] })
      qc.invalidateQueries({ queryKey: ['pesos', alunoId] })
    },
  })
}

export function useRegistrarPeso(alunoId: string | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { weight_kg: number; measured_at: string }) => {
      if (!alunoId) throw new Error('Aluno inválido')
      const { error } = await supabase.from('pesos').insert({ aluno_id: alunoId, ...input })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pesos', alunoId] })
      qc.invalidateQueries({ queryKey: ['aluno', alunoId] })
    },
  })
}

export function useArquivarAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alunos').update({ active: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alunos'] })
      qc.invalidateQueries({ queryKey: ['aluno'] })
    },
  })
}
