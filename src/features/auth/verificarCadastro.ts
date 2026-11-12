import { useCallback, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type CampoCadastro = 'cpf' | 'email'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export const emailParecido = (v: string): boolean => EMAIL.test(v.trim())

/**
 * "Esse CPF/e-mail já tem conta?" — a função só devolve sim/não (nunca dado da conta). null = não deu para saber (rede, limite):
 * o cadastro segue normalmente e o banco continua sendo a barreira final.
 */
export async function cadastroExiste(campo: CampoCadastro, valor: string, captchaToken?: string): Promise<boolean | null> {
  try {
    const { data, error } = await supabase.functions.invoke('verificar-cadastro', { body: { campo, valor, captchaToken } })
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

export const CAPTCHA_ATIVO = !!import.meta.env.VITE_TURNSTILE_SITE_KEY

/**
 * Token de captcha PRÓPRIO da verificação "já tem conta?". Cada consulta gasta um token (o servidor exige captcha em toda consulta) e o
 * token do cadastro/login é de uso único e precisa continuar para o cadastro, então cada campo verificado tem o seu widget
 * (`<Turnstile onToken={c.aoReceber} reiniciar={c.vez} />`). Sem token a consulta espera; se nunca vier, o aviso simplesmente não aparece
 * e o cadastro segue (o banco continua sendo a barreira final).
 */
export function useCaptchaVerificacao() {
  const [token, setToken] = useState('')
  const [vez, setVez] = useState(0)
  const aoReceber = useCallback((t: string) => setToken(t), [])
  const gastar = useCallback(() => {
    setToken('')
    setVez((v) => v + 1)
  }, [])
  return { token, vez, aoReceber, gastar }
}
export type CaptchaVerificacao = ReturnType<typeof useCaptchaVerificacao>

/** Consulta quando o valor está completo e válido (e há token de captcha); devolve true/false/null (null = desconhecido ou ainda não consultado). */
export function useCadastroExistente(campo: CampoCadastro, valor: string, valido: boolean, captcha: CaptchaVerificacao): boolean | null {
  const v = useAtrasado(valor.trim())
  const pronto = !CAPTCHA_ATIVO || !!captcha.token
  const { data } = useQuery({
    queryKey: ['cadastro-existe', campo, v],
    queryFn: async () => {
      try {
        return await cadastroExiste(campo, v, captcha.token || undefined)
      } finally {
        if (CAPTCHA_ATIVO) captcha.gastar()
      }
    },
    enabled: valido && v === valor.trim() && v.length > 0 && pronto,
    staleTime: 5 * 60_000,
    retry: false,
  })
  return valido && v === valor.trim() ? (data ?? null) : null
}
