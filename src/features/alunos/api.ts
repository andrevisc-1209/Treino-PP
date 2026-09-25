import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { TERMO_VERSAO } from './termo'

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
  objetivos: string[]
  objetivo_notes: string | null
  injury: boolean
  injury_regions: string[]
  injury_notes: string | null
  surgery: boolean
  surgery_regions: string[]
  surgery_notes: string | null
  practices_sport: boolean
  sports: string[]
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

export type ConsentimentoAtivo = { id: string; consented_at: string; consent_version: string }

export function useConsentimentoDetalhado(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['consentimento-detalhado', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('consentimentos')
        .select('id, consented_at, consent_version')
        .eq('aluno_id', alunoId!)
        .is('revoked_at', null)
        .order('consented_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (error) throw error
      return data as ConsentimentoAtivo | null
    },
    enabled: !!alunoId,
  })
}

export function useRevogarConsentimento(alunoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (consentimentoId: string) => {
      const { error: e1 } = await supabase
        .from('consentimentos')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', consentimentoId)
      if (e1) throw e1
      const { error: e2 } = await supabase
        .from('alunos')
        .update({ injury: false, injury_notes: null, medications: null })
        .eq('id', alunoId)
      if (e2) throw e2
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consentimento-ativo', alunoId] })
      qc.invalidateQueries({ queryKey: ['consentimento-detalhado', alunoId] })
      qc.invalidateQueries({ queryKey: ['aluno', alunoId] })
    },
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
  objetivos: string[]
  objetivo_notes?: string
  injury: boolean
  injury_regions: string[]
  injury_notes?: string
  surgery: boolean
  surgery_regions: string[]
  surgery_notes?: string
  practices_sport: boolean
  sports: string[]
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
        objetivos: input.objetivos,
        objetivo_notes: input.objetivos.includes('Outros') ? input.objetivo_notes || null : null,
        injury: input.injury,
        injury_regions: input.injury ? input.injury_regions : [],
        injury_notes: input.injury ? input.injury_notes || null : null,
        surgery: input.surgery,
        surgery_regions: input.surgery ? input.surgery_regions : [],
        surgery_notes: input.surgery ? input.surgery_notes || null : null,
        practices_sport: input.practices_sport,
        sports: input.practices_sport ? input.sports : [],
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

      if (input.weight_kg) {
        let deveRegistrar = !input.id
        if (input.id) {
          const { data: ultimo } = await supabase
            .from('pesos')
            .select('weight_kg')
            .eq('aluno_id', alunoId)
            .order('measured_at', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          deveRegistrar = ultimo?.weight_kg !== input.weight_kg
        }
        if (deveRegistrar) {
          const { error } = await supabase.from('pesos').insert({ aluno_id: alunoId, weight_kg: input.weight_kg })
          if (error) throw error
        }
      }

      if (input.lgpd_consent && !input.hadActiveConsent) {
        const { error } = await supabase.from('consentimentos').insert({
          aluno_id: alunoId,
          professional_id,
          method: 'app',
          consent_version: TERMO_VERSAO,
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

/** Desfaz um arquivamento (ver useArquivarAluno + toast "Desfazer"). */
export function useDesarquivarAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alunos').update({ active: true }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alunos'] })
      qc.invalidateQueries({ queryKey: ['aluno'] })
    },
  })
}
