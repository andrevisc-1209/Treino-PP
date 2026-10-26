// Regras puras da verificação "esse CPF/e-mail já tem conta?" (sem I/O, testáveis no vitest). O index.ts só orquestra.
// DECISÃO DE PRODUTO (risco aceito, docs/SECURITY-AUDIT.md): durante o cadastro o app avisa, assim que o CPF ou o e-mail é digitado,
// que já existe conta, para a pessoa entrar ou recuperar a senha em vez de descobrir só no fim. A troca é permitir "testar" se um
// CPF/e-mail é cliente; por isso: a resposta é só { existe: boolean } (nunca o e-mail do CPF nem o CPF do e-mail), há limite por IP
// e o valor nunca vai para log.

import { cpfValido, normalizarCpf } from './loginCpf.ts'

export const LIMITE_VERIFICACAO = { max: 40, janelaSeg: 3600 } // por IP; folgado para Wi-Fi de academia e CGNAT
export const LIMITE_VERIFICACAO_SEM_IP = { max: 300, janelaSeg: 3600 }

export type PedidoVerificacao = { campo: 'cpf'; cpf: string } | { campo: 'email'; email: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** null = pedido inválido (CPF com dígito errado, e-mail malformado ou campo desconhecido). */
export function lerPedidoVerificacao(corpo: unknown): PedidoVerificacao | null {
  if (!corpo || typeof corpo !== 'object') return null
  const { campo, valor } = corpo as Record<string, unknown>
  if (campo === 'cpf') {
    const cpf = normalizarCpf(valor)
    return cpfValido(cpf) ? { campo: 'cpf', cpf } : null
  }
  if (campo === 'email') {
    const email = typeof valor === 'string' ? valor.trim().toLowerCase() : ''
    return email.length <= 254 && EMAIL.test(email) ? { campo: 'email', email } : null
  }
  return null
}

/** Escapa % _ e \ para usar o e-mail em ILIKE como igualdade exata (sem curinga). */
export function escaparIlike(valor: string): string {
  return valor.replace(/[\\%_]/g, (c) => `\\${c}`)
}
