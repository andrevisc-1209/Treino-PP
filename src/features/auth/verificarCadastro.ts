import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type CampoCadastro = 'cpf' | 'email'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const emailParecido = (v: string): boolean => EMAIL.test(v.trim())

/**
 * "Esse CPF/e-mail já tem conta?" — a função só devolve sim/não (nunca dado da conta). null = não deu para saber (rede, limite):
 * o cadastro segue normalmente e o banco continua sendo a barreira final.
 */
export async function cadastroExiste(campo: CampoCadastro, valor: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.functions.invoke('verificar-cadastro', { body: { campo, valor } })
    if (error || typeof (data as { existe?: unknown } | null)?.existe !== 'boolean') return null
    return (data as { existe: boolean }).existe
  } catch {
    return null
  }
}

/** Valor só depois de parar de digitar (evita uma consulta por tecla no e-mail). */
export function useAtrasado(valor: string, ms = 500): string {
  const [atrasado, setAtrasado] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setAtrasado(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return atrasado
}

/** Consulta quando o valor está completo e válido; devolve true/false/null (null = desconhecido ou ainda não consultado). */
export function useCadastroExistente(campo: CampoCadastro, valor: string, valido: boolean): boolean | null {
  const v = useAtrasado(valor.trim())
  const { data } = useQuery({
    queryKey: ['cadastro-existe', campo, v],
    queryFn: () => cadastroExiste(campo, v),
    enabled: valido && v === valor.trim() && v.length > 0,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return valido && v === valor.trim() ? (data ?? null) : null
}
