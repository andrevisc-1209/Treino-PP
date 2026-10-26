import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ErroAmigavel, mensagemDaFuncao } from '@/lib/erroAmigavel'
import { supabase } from '@/lib/supabase'
import type { StatusAssinatura, Plano } from '@/features/assinatura/useAssinatura'
import type { StatusRelato, TipoRelato } from '@/features/ajuda/relatos'
import type { MetricasPersonal } from './personais'

export type ResumoAdmin = { total_personais: number; total_alunos: number; regioes_ativas: number }

export type PersonalAdmin = {
  id: string
  name: string
  email: string | null
  cidade: string | null
  status: StatusAssinatura | null
  trial_fim: string | null
  assinatura_fim: string | null
  plano: Plano | null
  qtd_alunos: number
}

export type RegiaoAdmin = { cidade: string; qtd: number }

export function useAdminResumo() {
  return useQuery({
    queryKey: ['admin', 'resumo'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_resumo').single()
      if (error) throw error
      return data as ResumoAdmin
    },
  })
}

export function useAdminPersonais() {
  return useQuery({
    queryKey: ['admin', 'personais'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_listar_personais')
      if (error) throw error
      return (data ?? []) as PersonalAdmin[]
    },
  })
}

export function useAdminPersonaisMetricas() {
  return useQuery({
    queryKey: ['admin', 'personais-metricas'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_personais_metricas')
      if (error) throw error
      // BIGINT chega como número (ou string em contagens enormes): normaliza
      const mapa = new Map<string, MetricasPersonal>()
      for (const l of (data ?? []) as Record<string, unknown>[]) {
        mapa.set(String(l.professional_id), {
          treinos_presencial: Number(l.treinos_presencial),
          treinos_distancia: Number(l.treinos_distancia),
          exec_presencial: Number(l.exec_presencial),
          exec_distancia: Number(l.exec_distancia),
          exec_30d: Number(l.exec_30d),
        })
      }
      return mapa
    },
  })
}

export function useAdminRegioes() {
  return useQuery({
    queryKey: ['admin', 'regioes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_regioes')
      if (error) throw error
      return (data ?? []) as RegiaoAdmin[]
    },
  })
}

export function useAdminAlterarTrial() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ professionalId, novoFim }: { professionalId: string; novoFim: string }) => {
      const { error } = await supabase.rpc('admin_alterar_trial', { p_professional_id: professionalId, p_novo_fim: novoFim })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'personais'] }),
  })
}

export function useAdminAlterarPlano() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ professionalId, assinaturaFim, plano }: { professionalId: string; assinaturaFim: string; plano: Plano }) => {
      const { error } = await supabase.rpc('admin_alterar_plano', { p_professional_id: professionalId, p_assinatura_fim: assinaturaFim, p_plano: plano })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'personais'] }),
  })
}

export function useAdminAlterarCpf() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ professionalId, cpf }: { professionalId: string; cpf: string }) => {
      const { error } = await supabase.rpc('admin_alterar_cpf', { p_professional_id: professionalId, p_novo_cpf: cpf.replace(/\D/g, '') })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'personais'] }),
  })
}

export function useAdminResetSenha() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.functions.invoke<{ success: boolean; email: string }>('admin-actions', {
        body: { acao: 'reset_senha', email },
      })
      // mostra o motivo REAL que a função devolveu (ex.: "Personal não encontrado.", "Confirme o segundo fator…") em vez do genérico
      if (error) throw new ErroAmigavel(await mensagemDaFuncao(error, 'Não foi possível enviar o e-mail de redefinição.'))
      return data
    },
  })
}

export type ConsentimentosPersonal = {
  professional_id: string
  nome: string
  email: string | null
  total_alunos: number
  confirmados: number
  pendentes: number
  negados: number
  nao_solicitados: number
}

/** Contagens de consentimento LGPD por personal. Agregado de propósito: o admin não vê dados de alunos. */
export function useAdminConsentimentos() {
  return useQuery({
    queryKey: ['admin', 'consentimentos'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_consentimentos_saude')
      if (error) throw error
      // BIGINT chega como número (ou string em contagens enormes): normaliza
      return ((data ?? []) as Record<string, unknown>[]).map((l) => ({
        professional_id: String(l.professional_id),
        nome: String(l.nome ?? ''),
        email: (l.email as string | null) ?? null,
        total_alunos: Number(l.total_alunos),
        confirmados: Number(l.confirmados),
        pendentes: Number(l.pendentes),
        negados: Number(l.negados),
        nao_solicitados: Number(l.nao_solicitados),
      })) as ConsentimentosPersonal[]
    },
  })
}

export type RelatoAdmin = {
  id: string
  criado_em: string
  tipo: TipoRelato
  mensagem: string
  dispositivo: string | null
  status: StatusRelato
  professional_id: string
  nome: string
  email: string | null
  telefone: string | null
}

export function useAdminRelatos() {
  return useQuery({
    queryKey: ['admin', 'relatos'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_relatos')
      if (error) throw error
      return (data ?? []) as RelatoAdmin[]
    },
  })
}

export function useAdminRelatoStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: StatusRelato }) => {
      const { error } = await supabase.rpc('admin_relato_status', { p_id: id, p_status: status })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'relatos'] }),
  })
}
