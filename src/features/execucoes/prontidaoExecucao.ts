import { DESCRITORES_DOR, DESCRITORES_ESTRESSE, DESCRITORES_FADIGA, DESCRITORES_SONO, type Descritor } from '@/features/sessoes/descritores'
import { calcularProntidao } from '@/features/sessoes/prontidao'

/** Respostas do pré-treino fora da musculação presencial (escala 0–10); campos em branco = a pessoa pulou aquela pergunta. */
export type ProntidaoExec = { sono?: number; estresse?: number; fadiga?: number; dor?: number }

export const PERGUNTAS_PRE: { campo: keyof ProntidaoExec; chave: string; titulo: string; polaridade: 'positiva' | 'negativa'; descritores: Descritor[] }[] = [
  { campo: 'sono', chave: 'pre_sono', titulo: 'Sono', polaridade: 'positiva', descritores: DESCRITORES_SONO },
  { campo: 'estresse', chave: 'pre_estresse', titulo: 'Nível de estresse', polaridade: 'negativa', descritores: DESCRITORES_ESTRESSE },
  { campo: 'fadiga', chave: 'pre_fadiga', titulo: 'Nível de fadiga', polaridade: 'negativa', descritores: DESCRITORES_FADIGA },
  { campo: 'dor', chave: 'pre_dor', titulo: 'Dor muscular', polaridade: 'negativa', descritores: DESCRITORES_DOR },
]

/** Mantenha igual a CHAVES_PRE_EXEC / CHAVE_PSE em supabase/functions/_shared/execucao.ts. */
export const CHAVES_PRE_EXEC = PERGUNTAS_PRE.map((p) => p.chave)
export const CHAVE_PSE = 'pse'

export const CHIPS_INTENSIDADE = [
  { valor: 1, label: 'Nenhuma' },
  { valor: 3, label: 'Leve' },
  { valor: 5, label: 'Moderada' },
  { valor: 8, label: 'Forte' },
  { valor: 10, label: 'Extrema' },
]

const inteiro0a10 = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 10

/** Campos de pré-treino e PSE respondidos, prontos para entrar no `resultado` da execução (pular = não entra nada). */
export function camposPrePosDoResultado(e: { prontidao?: ProntidaoExec; pse?: number | null }): Record<string, number> {
  const saida: Record<string, number> = {}
  for (const p of PERGUNTAS_PRE) {
    const v = e.prontidao?.[p.campo]
    if (inteiro0a10(v)) saida[p.chave] = v
  }
  if (inteiro0a10(e.pse)) saida[CHAVE_PSE] = e.pse
  return saida
}

/** Prontidão 0–10 de uma execução salva; null se faltou alguma das 4 respostas (mesma conta da musculação presencial). */
export function prontidaoDaExecucao(resultado: Record<string, string | number> | undefined): number | null {
  const n = (k: string) => (typeof resultado?.[k] === 'number' ? (resultado[k] as number) : null)
  return calcularProntidao({ pre_sleep: n('pre_sono'), pre_stress: n('pre_estresse'), pre_fatigue: n('pre_fadiga'), pre_muscle_pain: n('pre_dor') })
}
