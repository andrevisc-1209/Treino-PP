import { normalizarBIv1, normalizarListaAcao, type FiltrosBI } from './biV1'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ErroAmigavel, mensagemDaFuncao } from '@/lib/erroAmigavel'
import { supabase } from '@/lib/supabase'
import type { StatusAssinatura, Plano } from '@/features/assinatura/useAssinatura'
import type { StatusRelato, TipoRelato } from '@/features/ajuda/relatos'
import type { MetricasPersonal } from './personais'
import { normalizarFinanceiro } from './financeiro'
import { normalizarBI, type PeriodoBI } from './bi'
import { normalizarIndicacoes } from './indicacoes'

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

export type AcaoAdmin = 'reset_senha' | 'alterar_trial' | 'alterar_plano' | 'alterar_cpf'

export type HistoricoAdmin = {
  id: string
  criado_em: string
  acao: AcaoAdmin
  admin_nome: string | null
  personal_nome: string | null
  personal_email: string | null
}

export function useAdminHistorico() {
  return useQuery({
    queryKey: ['admin', 'historico'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_historico_acoes')
      if (error) throw error
      return (data ?? []) as HistoricoAdmin[]
    },
  })
}

export function useAdminFinanceiro() {
  return useQuery({
    queryKey: ['admin', 'financeiro'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_financeiro').single()
      if (error) throw error
      return normalizarFinanceiro(data as Record<string, unknown>)
    },
  })
}

export function useAdminBI(dias: PeriodoBI) {
  return useQuery({
    queryKey: ['admin', 'bi', dias],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_bi', { p_dias: dias })
      if (error) throw error
      return normalizarBI(data)
    },
  })
}

/** BI v1: meta, funil, cidades e origens (filtros vazios = sem filtro). Só agregados. */
export function useAdminBIv1(dias: number, filtros: FiltrosBI) {
  return useQuery({
    queryKey: ['admin', 'bi-v1', dias, filtros.cidade, filtros.situacao, filtros.origem],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_bi_v1', {
        p_dias: dias,
        p_cidade: filtros.cidade || null,
        p_situacao: filtros.situacao || null,
        p_origem: filtros.origem || null,
      })
      if (error) throw error
      return normalizarBIv1(data)
    },
  })
}

/** Personais que pedem uma ação sua agora (teste acabando sem 3 alunos, pagante sem uso, plano vencendo). */
export function useAdminListaAcao() {
  return useQuery({
    queryKey: ['admin', 'lista-acao'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_lista_acao')
      if (error) throw error
      return normalizarListaAcao(data)
    },
  })
}

/** Quem tem mês grátis (indicação) vigente: professional_id → fim do bônus. Só o admin consegue chamar. */
export function useAdminBonus() {
  return useQuery({
    queryKey: ['admin', 'bonus'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_bonus_personais')
      if (error) throw error
      return new Map(((data ?? []) as { professional_id: string; bonus_ate: string }[]).map((l) => [l.professional_id, l.bonus_ate]))
    },
  })
}

/** Painel de indicações: totais, ranking de indicadores e as mais recentes, com sinais de abuso. Só nomes de personais e números. */
export function useAdminIndicacoes() {
  return useQuery({
    queryKey: ['admin', 'indicacoes'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('admin_indicacoes')
      if (error) throw error
      return normalizarIndicacoes(data)
    },
  })
}

export function useAdminRevogarIndicacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('admin_revogar_indicacao', { p_indicacao_id: id })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'indicacoes'] })
      qc.invalidateQueries({ queryKey: ['admin', 'bonus'] })
      qc.invalidateQueries({ queryKey: ['admin', 'historico'] })
    },
  })
}
