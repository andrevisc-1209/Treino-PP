import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { hojeSP, limitesDoDiaSP } from '@/lib/datas'
import type { HorarioFixoLinha } from './horarioGrupo'

// ============================================================
// Tipos
// ============================================================

export type ParticipanteStatus = 'previsto' | 'presente' | 'falta' | 'cancelou'
export type AulaStatus = 'agendada' | 'realizada' | 'cancelada'

export type AulaParticipante = {
  id: string
  aula_id: string
  aluno_id: string
  status: ParticipanteStatus
  cobrar: boolean | null
  valor: number | null
  cancelado_em: string | null
  sessao_id: string | null
  fatura_id: string | null
  aluno: { name: string } | null
}

export type Aula = {
  id: string
  professional_id: string
  horario_id: string | null
  starts_at: string
  original_starts_at: string | null
  duration_min: number
  local: string | null
  status: AulaStatus
  cancelada_por: 'aluno' | 'personal' | null
  notes: string | null
  aula_participantes: AulaParticipante[]
}

export type ProfessionalConfig = {
  professional_id: string
  cobrar_falta_padrao: boolean
  cobrar_cancel_padrao: boolean
  duracao_padrao_min: number
  pix_chave: string | null
  pix_tipo: string | null
  pix_nome: string | null
  pix_cidade: string | null
}

const AULA_SELECT = '*, aula_participantes(*, aluno:alunos(name))'

// ============================================================
// Geração diária de aulas (gerar_aulas via RPC, no máx. 1x/dia/aparelho)
// ============================================================

const CHAVE_GERAR_AULAS = 'treino:gerar-aulas-em'

export function useGerarAulasDiarias() {
  const qc = useQueryClient()
  useEffect(() => {
    const hoje = hojeSP()
    try {
      if (localStorage.getItem(CHAVE_GERAR_AULAS) === hoje) return
    } catch {
      // sem acesso ao localStorage (modo privado etc.) — segue e tenta gerar mesmo assim
    }
    supabase.rpc('gerar_aulas').then(({ error }) => {
      if (!error) {
        try {
          localStorage.setItem(CHAVE_GERAR_AULAS, hoje)
        } catch {
          // ignora — só significa que vai tentar gerar de novo na próxima abertura
        }
        qc.invalidateQueries({ queryKey: ['aulas'] })
      }
    })
  }, [qc])
}

// ============================================================
// Aulas
// ============================================================

export function useAulasNoIntervalo(inicio: Date | undefined, fim: Date | undefined) {
  return useQuery({
    queryKey: ['aulas', inicio?.toISOString(), fim?.toISOString()],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('aulas')
        .select(AULA_SELECT)
        .gte('starts_at', inicio!.toISOString())
        .lte('starts_at', fim!.toISOString())
        .order('starts_at')
      if (error) throw error
      return data as unknown as Aula[]
    },
    enabled: !!inicio && !!fim,
  })
}

export function useAulasDoDia(dataISO: string) {
  const { inicio, fim } = limitesDoDiaSP(dataISO)
  return useAulasNoIntervalo(inicio, fim)
}

export function useAula(aulaId: string | undefined) {
  return useQuery({
    queryKey: ['aula', aulaId],
    queryFn: async () => {
      const { data, error } = await supabase.from('aulas').select(AULA_SELECT).eq('id', aulaId!).single()
      if (error) throw error
      return data as unknown as Aula
    },
    enabled: !!aulaId,
  })
}

export function useCriarAulaAvulsa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { alunoIds: string[]; startsAt: Date; durationMin: number; local: string | null }) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const { data: aula, error } = await supabase
        .from('aulas')
        .insert({
          professional_id: u.user.id,
          horario_id: null,
          starts_at: input.startsAt.toISOString(),
          original_starts_at: null,
          duration_min: input.durationMin,
          local: input.local,
        })
        .select('id')
        .single()
      if (error) throw error

      const { error: errPart } = await supabase
        .from('aula_participantes')
        .insert(input.alunoIds.map((aluno_id) => ({ aula_id: aula.id, aluno_id })))
      if (errPart) throw errPart

      return aula.id as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aulas'] }),
  })
}

export function useRemarcarAula() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ aulaId, startsAt }: { aulaId: string; startsAt: Date }) => {
      const { error } = await supabase.from('aulas').update({ starts_at: startsAt.toISOString() }).eq('id', aulaId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aulas'] }),
  })
}

/** Valor a cobrar de um aluno pela presença numa aula avulsa, se ele tiver cobrança configurada como 'por_aula'. */
async function valorPorAulaDoAluno(alunoId: string): Promise<number | null> {
  const { data } = await supabase.from('aluno_cobranca').select('modelo, valor_aula').eq('aluno_id', alunoId).maybeSingle()
  if (!data || data.modelo !== 'por_aula') return null
  return data.valor_aula
}

async function atualizarStatusAulaSeCompleta(aulaId: string) {
  const { data: aula } = await supabase.from('aulas').select('status').eq('id', aulaId).single()
  if (!aula || aula.status !== 'agendada') return
  const { data: pendentes } = await supabase.from('aula_participantes').select('id').eq('aula_id', aulaId).eq('status', 'previsto')
  if (pendentes && pendentes.length === 0) {
    await supabase.from('aulas').update({ status: 'realizada' }).eq('id', aulaId)
  }
}

export function useCheckIn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ aulaId, alunoIds }: { aulaId: string; alunoIds?: string[] }) => {
      let query = supabase.from('aula_participantes').select('id, aluno_id').eq('aula_id', aulaId).eq('status', 'previsto')
      if (alunoIds) query = query.in('aluno_id', alunoIds)
      const { data: alvos, error: errSel } = await query
      if (errSel) throw errSel

      for (const p of alvos) {
        const valor = await valorPorAulaDoAluno(p.aluno_id)
        const { error } = await supabase.from('aula_participantes').update({ status: 'presente', cobrar: true, valor }).eq('id', p.id)
        if (error) throw error
      }
      await atualizarStatusAulaSeCompleta(aulaId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aulas'] }),
  })
}

export function useMarcarFalta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ aulaId, alunoId, cobrar }: { aulaId: string; alunoId: string; cobrar: boolean }) => {
      const valor = cobrar ? await valorPorAulaDoAluno(alunoId) : null
      const { data: p, error: errSel } = await supabase
        .from('aula_participantes')
        .select('id')
        .eq('aula_id', aulaId)
        .eq('aluno_id', alunoId)
        .single()
      if (errSel) throw errSel
      const { error } = await supabase.from('aula_participantes').update({ status: 'falta', cobrar, valor }).eq('id', p.id)
      if (error) throw error
      await atualizarStatusAulaSeCompleta(aulaId)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aulas'] }),
  })
}

/** Cancela a aula inteira: quem cancelou (aluno/personal) e, se foi o aluno, se cobra. Cancelamento do personal nunca cobra. */
export function useCancelarAula() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      aulaId,
      canceladoPor,
      cobrar,
    }: {
      aulaId: string
      canceladoPor: 'aluno' | 'personal'
      cobrar: boolean
    }) => {
      const cobraEfetivo = canceladoPor === 'personal' ? false : cobrar
      const { data: participantes, error: errSel } = await supabase
        .from('aula_participantes')
        .select('id, aluno_id, status')
        .eq('aula_id', aulaId)
      if (errSel) throw errSel

      for (const p of participantes) {
        if (p.status !== 'previsto') continue
        const valor = cobraEfetivo ? await valorPorAulaDoAluno(p.aluno_id) : null
        const { error } = await supabase
          .from('aula_participantes')
          .update({ status: 'cancelou', cancelado_em: new Date().toISOString(), cobrar: cobraEfetivo, valor })
          .eq('id', p.id)
        if (error) throw error
      }

      const { error: errAula } = await supabase.from('aulas').update({ status: 'cancelada', cancelada_por: canceladoPor }).eq('id', aulaId)
      if (errAula) throw errAula
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['aulas'] }),
  })
}

// ============================================================
// Integração com sessão de treino (chamadas imperativas, sem hook —
// usadas dentro do onSuccess da mutation que conclui o treino)
// ============================================================

async function marcarPresencaDaSessao(aulaId: string, alunoId: string, sessaoId: string) {
  const valor = await valorPorAulaDoAluno(alunoId)
  const { data: p, error: errSel } = await supabase
    .from('aula_participantes')
    .select('id')
    .eq('aula_id', aulaId)
    .eq('aluno_id', alunoId)
    .single()
  if (errSel) throw errSel
  const { error } = await supabase
    .from('aula_participantes')
    .update({ status: 'presente', cobrar: true, valor, sessao_id: sessaoId })
    .eq('id', p.id)
  if (error) throw error
  await atualizarStatusAulaSeCompleta(aulaId)
}

/**
 * Ao concluir um treino: se a sessão já veio de uma aula, faz o check-in
 * automático nela. Senão, procura uma aula hoje com esse aluno 'previsto'
 * para vincular. Se não achar nenhuma, devolve 'sem-aula-hoje' para a tela
 * perguntar se cria uma aula avulsa (useCriarAulaAvulsaRealizada).
 */
export async function finalizarAgendaAoConcluir(input: {
  sessaoId: string
  alunoId: string
  aulaId: string | null
}): Promise<'vinculada' | 'sem-aula-hoje'> {
  if (input.aulaId) {
    await marcarPresencaDaSessao(input.aulaId, input.alunoId, input.sessaoId)
    return 'vinculada'
  }

  const { inicio, fim } = limitesDoDiaSP(hojeSP())
  const { data: candidatas, error } = await supabase
    .from('aulas')
    .select('id, aula_participantes!inner(aluno_id, status)')
    .gte('starts_at', inicio.toISOString())
    .lte('starts_at', fim.toISOString())
    .eq('aula_participantes.aluno_id', input.alunoId)
    .eq('aula_participantes.status', 'previsto')
    .limit(1)
  if (error) throw error

  if (candidatas.length > 0) {
    const aulaId = candidatas[0].id as string
    const { error: errLink } = await supabase.from('sessoes').update({ aula_id: aulaId }).eq('id', input.sessaoId)
    if (errLink) throw errLink
    await marcarPresencaDaSessao(aulaId, input.alunoId, input.sessaoId)
    return 'vinculada'
  }

  return 'sem-aula-hoje'
}

/** Cria a aula avulsa já realizada, com o aluno presente, para registrar a cobrança de um treino fora da agenda. */
export async function criarAulaAvulsaRealizada(input: { alunoId: string; sessaoId: string; durationMin: number }): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('Sessão expirada')

  const valor = await valorPorAulaDoAluno(input.alunoId)
  const { data: aula, error } = await supabase
    .from('aulas')
    .insert({
      professional_id: u.user.id,
      horario_id: null,
      starts_at: new Date().toISOString(),
      original_starts_at: null,
      duration_min: input.durationMin,
      local: null,
      status: 'realizada',
    })
    .select('id')
    .single()
  if (error) throw error

  const { error: errPart } = await supabase.from('aula_participantes').insert({
    aula_id: aula.id,
    aluno_id: input.alunoId,
    status: 'presente',
    cobrar: true,
    valor,
    sessao_id: input.sessaoId,
  })
  if (errPart) throw errPart

  const { error: errLink } = await supabase.from('sessoes').update({ aula_id: aula.id }).eq('id', input.sessaoId)
  if (errLink) throw errLink
}

// ============================================================
// Horários fixos
// ============================================================

export function useHorariosFixos() {
  return useQuery({
    queryKey: ['horarios-fixos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('horarios_fixos')
        .select('*, horario_alunos(aluno_id, aluno:alunos(name))')
        .order('weekday')
        .order('start_time')
      if (error) throw error
      return (data as HorarioFixoRaw[]).map(paraLinha)
    },
  })
}

export function useHorariosDoAluno(alunoId: string | undefined) {
  return useQuery({
    queryKey: ['horarios-aluno', alunoId],
    queryFn: async () => {
      const { data: ids, error: errIds } = await supabase.from('horario_alunos').select('horario_id').eq('aluno_id', alunoId!)
      if (errIds) throw errIds
      const horarioIds = ids.map((r) => r.horario_id)
      if (horarioIds.length === 0) return []
      const { data, error } = await supabase
        .from('horarios_fixos')
        .select('*, horario_alunos(aluno_id, aluno:alunos(name))')
        .in('id', horarioIds)
        .order('weekday')
        .order('start_time')
      if (error) throw error
      return (data as HorarioFixoRaw[]).map(paraLinha)
    },
    enabled: !!alunoId,
  })
}

type HorarioFixoRaw = {
  id: string
  weekday: number
  start_time: string
  duration_min: number
  local: string | null
  valid_from: string
  valid_until: string | null
  active: boolean
  horario_alunos: { aluno_id: string; aluno: { name: string } | null }[]
}

function paraLinha(h: HorarioFixoRaw): HorarioFixoLinha {
  return {
    id: h.id,
    weekday: h.weekday,
    start_time: h.start_time.slice(0, 5),
    duration_min: h.duration_min,
    local: h.local,
    valid_from: h.valid_from,
    valid_until: h.valid_until,
    active: h.active,
    aluno_ids: h.horario_alunos.map((ha) => ha.aluno_id),
    aluno_nomes: h.horario_alunos.map((ha) => ha.aluno?.name).filter((n): n is string => !!n),
  }
}

export type NovoHorarioInput = {
  weekdays: number[]
  start_time: string
  duration_min: number
  local: string | null
  alunoIds: string[]
}

/** Cria um horário fixo (uma linha por dia da semana) + participantes. Usada tanto pela mutation quanto no fim do cadastro do aluno. */
export async function criarHorariosFixos(input: NovoHorarioInput): Promise<void> {
  const { data: u } = await supabase.auth.getUser()
  if (!u.user) throw new Error('Sessão expirada')

  for (const weekday of input.weekdays) {
    const { data: horario, error } = await supabase
      .from('horarios_fixos')
      .insert({
        professional_id: u.user.id,
        weekday,
        start_time: input.start_time,
        duration_min: input.duration_min,
        local: input.local,
      })
      .select('id')
      .single()
    if (error) throw error

    const { error: errPart } = await supabase
      .from('horario_alunos')
      .insert(input.alunoIds.map((aluno_id) => ({ horario_id: horario.id, aluno_id })))
    if (errPart) throw errPart
  }

  const { error: errGerar } = await supabase.rpc('gerar_aulas')
  if (errGerar) throw errGerar
}

export function useCriarHorario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: criarHorariosFixos,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horarios-fixos'] })
      qc.invalidateQueries({ queryKey: ['horarios-aluno'] })
      qc.invalidateQueries({ queryKey: ['aulas'] })
    },
  })
}

export type EditarGrupoInput = {
  ids: string[]
  start_time: string
  duration_min: number
  local: string | null
  alunoIds: string[]
}

export function useAtualizarGrupoHorario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: EditarGrupoInput) => {
      for (const id of input.ids) {
        const { error } = await supabase
          .from('horarios_fixos')
          .update({ start_time: input.start_time, duration_min: input.duration_min, local: input.local })
          .eq('id', id)
        if (error) throw error

        const { error: errDel } = await supabase.from('horario_alunos').delete().eq('horario_id', id)
        if (errDel) throw errDel
        const { error: errIns } = await supabase
          .from('horario_alunos')
          .insert(input.alunoIds.map((aluno_id) => ({ horario_id: id, aluno_id })))
        if (errIns) throw errIns

        const { error: errRegerar } = await supabase.rpc('regerar_horario', { p_horario_id: id })
        if (errRegerar) throw errRegerar
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horarios-fixos'] })
      qc.invalidateQueries({ queryKey: ['horarios-aluno'] })
      qc.invalidateQueries({ queryKey: ['aulas'] })
    },
  })
}

export function usePausarGrupoHorario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids, active }: { ids: string[]; active: boolean }) => {
      const { error } = await supabase.from('horarios_fixos').update({ active }).in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horarios-fixos'] })
      qc.invalidateQueries({ queryKey: ['horarios-aluno'] })
    },
  })
}

export function useEncerrarGrupoHorario() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ids }: { ids: string[] }) => {
      const { error } = await supabase.from('horarios_fixos').update({ valid_until: hojeSP() }).in('id', ids)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['horarios-fixos'] })
      qc.invalidateQueries({ queryKey: ['horarios-aluno'] })
    },
  })
}

// ============================================================
// Configuração do personal
// ============================================================

export function useProfessionalConfig() {
  return useQuery({
    queryKey: ['professional-config'],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const { data, error } = await supabase.from('professional_config').select('*').eq('professional_id', u.user.id).maybeSingle()
      if (error) throw error
      return data as ProfessionalConfig | null
    },
  })
}

export function useSalvarProfessionalConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { cobrar_falta_padrao: boolean; cobrar_cancel_padrao: boolean; duracao_padrao_min: number }) => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const { error } = await supabase.from('professional_config').upsert({ professional_id: u.user.id, ...input })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['professional-config'] }),
  })
}
