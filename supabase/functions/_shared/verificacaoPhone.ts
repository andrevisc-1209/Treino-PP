// Verificação de posse do telefone (código de 6 dígitos por WhatsApp). Lógica pura (sem APIs do Deno além de `crypto`), testável com vitest.
// O número do destino vem do corpo da requisição do personal, mas só recebe UMA mensagem de texto FIXA (sem conteúdo do usuário),
// com limite por personal e por número (entre contas).

import { numeroWhatsApp } from './whatsapp.ts'

export const EXPIRA_MIN = 10
export const MAX_TENTATIVAS = 5

/**
 * Telefone digitado → dígitos nacionais (DDD + número) como em professionals.phone; null se não for celular brasileiro.
 * Mais rígido que numeroWhatsApp (que serve de formatador): DDD válido, 11 dígitos com 9 depois do DDD (ou 10 com 6–9 nos
 * celulares antigos), e "+" só vale com +55 — para a verificação não aceitar número de outro país nem telefone fixo.
 */
export function telefoneNacional(telefone: unknown): string | null {
  if (typeof telefone !== 'string' || telefone.length > 40) return null
  const t = telefone.trim()
  if (t.startsWith('+') && !t.startsWith('+55')) return null
  const n = numeroWhatsApp(t)
  if (!n) return null
  const nacional = n.slice(2)
  if (!/^[1-9][1-9]/.test(nacional)) return null
  if (nacional.length === 11 && nacional[2] !== '9') return null
  if (nacional.length === 10 && !/[6-9]/.test(nacional[2])) return null
  return nacional
}

/** 6 dígitos, uniformes (sorteio com rejeição para não ter viés de módulo). */
export function gerarCodigo(): string {
  const buf = new Uint32Array(1)
  const limite = 4_294_967_296 - (4_294_967_296 % 1_000_000)
  do crypto.getRandomValues(buf)
  while (buf[0] >= limite)
  return String(buf[0] % 1_000_000).padStart(6, '0')
}

const hex = (buf: ArrayBuffer) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
const sha256 = async (texto: string) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto)))

/** SHA-256(código:id da linha) — o id faz o hash de cada código ser único. */
export const hashCodigo = (codigo: string, linhaId: string): Promise<string> => sha256(`${codigo}:${linhaId}`)

/** Chave do limite por número (hash: o número em si não vai para a tabela de rate limit). */
export async function chaveDoNumero(numeroNacional: string): Promise<string> {
  return (await sha256(`tel:${numeroNacional}`)).slice(0, 32)
}

/** Comparação em tempo constante de dois hashes hex. */
export function iguais(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let d = 0
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return d === 0
}

export function codigoValido(v: unknown): v is string {
  return typeof v === 'string' && /^\d{6}$/.test(v)
}

export type EstadoCodigo = 'valido' | 'expirado' | 'usado' | 'tentativas'

export function estadoDoCodigo(linha: { expires_at: string; used_at: string | null; attempts: number }, agora: Date = new Date()): EstadoCodigo {
  if (linha.used_at) return 'usado'
  if (new Date(linha.expires_at).getTime() < agora.getTime()) return 'expirado'
  if (linha.attempts >= MAX_TENTATIVAS) return 'tentativas'
  return 'valido'
}

export const expiraEm = (agora: Date = new Date()): string => new Date(agora.getTime() + EXPIRA_MIN * 60_000).toISOString()

/** Texto fixo: nenhum dado do usuário entra na mensagem. */
export function mensagemCodigo(codigo: string): string {
  return (
    '🔐 *Treino · Personal Perto*\n\n' +
    `Seu código de verificação é: *${codigo}*\n\n` +
    `Vale por ${EXPIRA_MIN} minutos. Se você não pediu este código, ignore esta mensagem.`
  )
}
