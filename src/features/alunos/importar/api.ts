import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { evento } from '@/features/analytics/analytics'
import type { AlunoImportavel } from './importarAlunos'

/** Grava os alunos escolhidos em UMA chamada (tudo ou nada). Só dados básicos: nada clínico, cobrança nem horário. Devolve os ids criados. */
export function useImportarAlunos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (alunos: AlunoImportavel[]): Promise<string[]> => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) throw new Error('Sessão expirada')
      const linhas = alunos.map((a) => ({
        professional_id: u.user.id,
        name: a.name,
        phone: a.phone,
        email: a.email,
        birth_date: a.birth_date,
        sex: a.sex,
        objetivos: a.objetivos,
      }))
      const { data, error } = await supabase.from('alunos').insert(linhas).select('id')
      if (error) throw error
      return (data ?? []).map((d) => d.id as string)
    },
    onSuccess: () => {
      evento('aluno_cadastrado') // ativação do funil: só o nome do evento, nunca dado de aluno
      qc.invalidateQueries({ queryKey: ['alunos'] })
    },
  })
}

/**
 * Desfaz uma importação logo depois dela: arquiva, manda para a lixeira e apaga de vez só os ids que acabaram de ser criados
 * (o banco só apaga de quem está na lixeira). Recém-importados não têm treino, cobrança nem consentimento.
 */
export function useDesfazerImportacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const a = await supabase.from('alunos').update({ active: false }).in('id', ids)
      if (a.error) throw a.error
      const l = await supabase.from('alunos').update({ apagado_em: new Date().toISOString() }).in('id', ids)
      if (l.error) throw l.error
      const d = await supabase.from('alunos').delete().in('id', ids).not('apagado_em', 'is', null)
      if (d.error) throw d.error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alunos'] })
      qc.invalidateQueries({ queryKey: ['aluno'] })
    },
  })
}
