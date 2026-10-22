import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { camposClinicos, camposGerais, semDadoClinico } from './payloadAluno'
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
  /** objetivo esportivo: ver MODALIDADES_FOCO (provaAlvo.ts) */
  modalidade_foco: string | null
  prova_alvo: string | null
  nome_prova: string | null
  data_prova: string | null
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
  gordura_pct: number | null
  cintura_cm: number | null
  quadril_cm: number | null
  peito_cm: number | null
  braco_dir_cm: number | null
  coxa_dir_cm: number | null
}

export type NovaAvaliacaoInput = {
  weight_kg: number
  measured_at: string
  gordura_pct?: number
  cintura_cm?: number
  quadril_cm?: number
  peito_cm?: number
  braco_dir_cm?: number
  coxa_dir_cm?: number
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

export type ConsentimentoSaude = {
  status: 'pendente' | 'confirmado' | 'negado' | null
  enviadoAt: string | null
  confirmadoAt: string | null
  email: string | null
}

/** Estado do consentimento por e-mail. Consulta à parte do `useAluno` de propósito: a tela de edição reinicia o formulário quando o aluno recarrega. */
export function useConsentimentoSaude(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['consentimento-saude', alunoId],
    queryFn: async (): Promise<ConsentimentoSaude> => {
      const { data, error } = await supabase
        .from('alunos')
        .select('email, saude_consentimento_status, saude_consentimento_enviado_at, saude_consentimento_confirmado_at')
        .eq('id', alunoId!)
        .single()
      if (error) throw error
      return {
        status: data.saude_consentimento_status,
        enviadoAt: data.saude_consentimento_enviado_at,
        confirmadoAt: data.saude_consentimento_confirmado_at,
        email: data.email,
      }
    },
    enabled: !!alunoId,
    // enquanto aguarda o aluno clicar no e-mail, consulta de tempos em tempos
    refetchInterval: (q) => (q.state.data?.status === 'pendente' ? 15_000 : false),
  })
}

/** Mensagem em português que a Edge Function devolve em { error } (status não-2xx). */
async function mensagemDoErroFuncao(error: unknown): Promise<string> {
  const contexto = (error as { context?: Response })?.context
  if (contexto && typeof contexto.json === 'function') {
    try {
      const corpo = await contexto.json()
      if (typeof corpo?.error === 'string') return corpo.error
    } catch {
      // corpo ausente ou não-JSON
    }
  }
  return 'Não foi possível enviar a solicitação. Tente novamente.'
}

export type EnvioConsentimento = {
  canal: 'email' | 'whatsapp'
  email?: string
  /** obrigatório em reenvio (status pendente/negado) */
  motivo?: string
  motivoLivre?: string
}

export type ResultadoEnvioConsentimento = { ok: true; link?: string; nome_aluno?: string; nome_personal?: string }

export async function enviarConsentimentoSaude(alunoId: string, envio: EnvioConsentimento): Promise<ResultadoEnvioConsentimento> {
  const { data, error } = await supabase.functions.invoke<ResultadoEnvioConsentimento>('enviar-consentimento-saude', {
    body: {
      aluno_id: alunoId,
      canal: envio.canal,
      email: envio.email?.trim() || undefined,
      motivo_reenvio: envio.motivo,
      motivo_reenvio_livre: envio.motivoLivre?.trim() || undefined,
    },
  })
  if (error || !data) throw new Error(await mensagemDoErroFuncao(error))
  return data
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
    // RPC atômica (migration 20261052): revoga, limpa TODOS os campos clínicos e volta o status ao zero, mesmo com a assinatura vencida
    // (direito do titular); o peso já registrado é mantido.
    mutationFn: async (consentimentoId: string) => {
      const { error } = await supabase.rpc('revogar_consentimento', { p_consentimento_id: consentimentoId })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['consentimento-ativo', alunoId] })
      qc.invalidateQueries({ queryKey: ['consentimento-detalhado', alunoId] })
      qc.invalidateQueries({ queryKey: ['consentimento-saude', alunoId] })
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
  modalidade_foco?: string
  prova_alvo?: string
  nome_prova?: string
  data_prova?: string
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

      // ORDEM (o banco exige — migration 20261051): 1) aluno sem dado clínico, 2) consentimento, 3) dados clínicos, 4) peso.
      // Lesão, cirurgia, medicamentos, altura e peso só são aceitos com consentimento ativo do aluno.
      const geral = camposGerais(input, professional_id)
      const clinico = camposClinicos(input)

      let alunoId = input.id
      if (alunoId) {
        const { error } = await supabase.from('alunos').update(geral).eq('id', alunoId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('alunos').insert(geral).select('id').single()
        if (error) throw error
        alunoId = data.id as string
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

      if (input.id || !semDadoClinico(clinico)) {
        const { error } = await supabase.from('alunos').update(clinico).eq('id', alunoId)
        if (error) throw error
      }

      if (input.weight_kg && input.lgpd_consent) {
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
    mutationFn: async (input: NovaAvaliacaoInput) => {
      if (!alunoId) throw new Error('Aluno inválido')
      const { data: ativo } = await supabase.from('consentimentos').select('id').eq('aluno_id', alunoId).is('revoked_at', null).limit(1).maybeSingle()
      if (!ativo) throw new Error('O aluno ainda não autorizou o registro de medidas corporais.')
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

export function useAlunosArquivados() {
  return useQuery({
    queryKey: ['alunos', 'arquivados'],
    queryFn: async () => {
      const { data, error } = await supabase.from('alunos').select('*').eq('active', false).order('name')
      if (error) throw error
      return data as Aluno[]
    },
  })
}

/** Hard delete — plano/sessões/séries/pesos/consentimentos somem em cascata (ON DELETE CASCADE). Irreversível. */
export function useApagarAluno() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('alunos').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alunos'] })
      qc.invalidateQueries({ queryKey: ['aluno'] })
    },
  })
}

export const LOCAIS_TREINO_MAX = 5

export type LocalTreino = { id: string; aluno_id: string; nome: string; endereco: string; maps_link: string }

export function useLocaisTreino(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['locais_treino', alunoId],
    queryFn: async () => {
      const { data, error } = await supabase.from('aluno_locais_treino').select('*').eq('aluno_id', alunoId!).order('created_at')
      if (error) throw error
      return data as LocalTreino[]
    },
    enabled: !!alunoId,
  })
}

export function useAdicionarLocalTreino(alunoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (local: { nome: string; endereco: string; mapsLink: string }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('aluno_locais_treino').insert({
        aluno_id: alunoId,
        professional_id: auth.user!.id,
        nome: local.nome,
        endereco: local.endereco,
        maps_link: local.mapsLink,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locais_treino', alunoId] }),
  })
}

export function useRemoverLocalTreino(alunoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('aluno_locais_treino').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['locais_treino', alunoId] }),
  })
}
