import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** Guarda no cadastro do aluno o CPF e o endereço digitados na hora do contrato (só os que vieram preenchidos). */
export function useGuardarDadosDoContrato(alunoId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (campos: { cpf?: string; endereco?: string }) => {
      if (campos.cpf === undefined && campos.endereco === undefined) return
      const { error } = await supabase.from('alunos').update(campos).eq('id', alunoId)
      if (error) throw error
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['aluno', alunoId] })
      void qc.invalidateQueries({ queryKey: ['alunos'] })
    },
  })
}
