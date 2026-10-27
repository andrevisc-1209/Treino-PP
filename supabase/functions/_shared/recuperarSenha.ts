// Regras puras da recuperação de senha pelo CPF (sem I/O, testáveis no vitest). O index.ts da função recuperar-senha-cpf só orquestra.
// O CPF é resolvido para o e-mail NO SERVIDOR: o e-mail nunca volta ao navegador e a resposta é a mesma exista a conta ou não.

import { cpfValido, normalizarCpf } from './loginCpf.ts'

export const MSG_RECUPERACAO = 'Se houver uma conta com esse CPF, enviamos o link para redefinir a senha ao e-mail do cadastro.'
export const MSG_LIMITE_RECUPERACAO = 'Muitos pedidos. Aguarde alguns minutos e tente de novo.'

/** Por CPF o limite é baixo: evita encher a caixa de e-mail de alguém só sabendo o CPF. Por IP é folgado (Wi-Fi de academia, CGNAT). */
export const LIMITE_RECUPERACAO_CPF = { max: 3, janelaSeg: 3600 }
export const LIMITE_RECUPERACAO_IP = { max: 30, janelaSeg: 3600 }
export const LIMITE_RECUPERACAO_SEM_IP = { max: 200, janelaSeg: 3600 }

/** Tempo mínimo de resposta: quem tem conta e quem não tem levam o mesmo tempo. */
export const PISO_RECUPERACAO_MS = 1500

export type PedidoRecuperacao = { cpf: string; captchaToken: string | undefined }

export function lerPedidoRecuperacao(corpo: unknown): PedidoRecuperacao | null {
  if (!corpo || typeof corpo !== 'object') return null
  const { cpf, captchaToken } = corpo as Record<string, unknown>
  const digitos = normalizarCpf(cpf)
  if (!cpfValido(digitos)) return null
  if (captchaToken !== undefined && (typeof captchaToken !== 'string' || captchaToken.length > 4096)) return null
  return { cpf: digitos, captchaToken: captchaToken || undefined }
}
