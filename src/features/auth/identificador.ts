import { z } from 'zod'
import { mascararCPF, validarCPF } from '@/lib/cpf'

/** O campo único do login aceita e-mail ou CPF: com "@" é e-mail; só dígitos e pontuação é CPF. */
export type TipoIdentificador = 'email' | 'cpf' | 'invalido'

export function tipoIdentificador(valor: string): TipoIdentificador {
  const v = valor.trim()
  if (v.includes('@')) return 'email'
  if (/^[\d.\-\s]+$/.test(v)) return 'cpf'
  return 'invalido'
}

/** Enquanto a pessoa digita só números, formata como CPF; assim que aparece uma letra ou "@", deixa como está (e-mail). */
export function formatarIdentificador(valor: string): string {
  return /^[\d.\-\s]*$/.test(valor) ? mascararCPF(valor) : valor
}

export function identificadorValido(valor: string): boolean {
  const tipo = tipoIdentificador(valor)
  if (tipo === 'email') return z.string().email().safeParse(valor.trim()).success
  if (tipo === 'cpf') return validarCPF(valor)
  return false
}
