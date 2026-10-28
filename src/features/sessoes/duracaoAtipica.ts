import { confirmarAcao } from '@/components/ConfirmSheet'

/** Abaixo disto (min) o tempo informado provavelmente é engano (ou treino interrompido). */
export const DURACAO_MINIMA_MIN = 20
/** A partir disto (min) o tempo informado provavelmente é engano (cronômetro esquecido, horas no campo de minutos). */
export const DURACAO_MAXIMA_MIN = 180

export type DuracaoAtipica = 'curta' | 'longa'

/** O tempo foge do usual? `null`/inválido/zero não é avaliado (campo em branco nunca gera alerta). */
export function duracaoAtipica(min: number | null | undefined): DuracaoAtipica | null {
  if (min == null || !Number.isFinite(min) || min <= 0) return null
  if (min < DURACAO_MINIMA_MIN) return 'curta'
  if (min >= DURACAO_MAXIMA_MIN) return 'longa'
  return null
}

/** 45 → "45 min"; 75 → "1 h 15 min"; 180 → "3 h". */
export function textoDuracao(min: number): string {
  const total = Math.round(min)
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export function mensagemDuracaoAtipica(min: number, o: 'treino' | 'aula' = 'treino'): string {
  const tipo = duracaoAtipica(min)
  const quando = tipo === 'curta' ? 'bem curto' : 'bem longo'
  const motivo = o === 'treino' ? 'O tempo entra no histórico e na Performance do aluno.' : 'A duração define o espaço que a aula ocupa na agenda.'
  return `Você informou ${textoDuracao(min)}, um tempo ${quando} para ${o === 'treino' ? 'um treino' : 'uma aula'}. ${motivo} Está correto?`
}

/**
 * Pergunta se o tempo está certo quando ele foge do usual. Resolve `true` para seguir (tempo normal ou confirmado) e
 * `false` para voltar e corrigir. Nunca bloqueia: o personal sempre pode confirmar e seguir.
 */
export async function confirmarDuracaoSeAtipica(min: number | null | undefined, o: 'treino' | 'aula' = 'treino'): Promise<boolean> {
  if (!duracaoAtipica(min)) return true
  return confirmarAcao({
    titulo: 'O tempo está correto?',
    mensagem: mensagemDuracaoAtipica(min as number, o),
    textoConfirmar: 'Está certo, continuar',
    textoCancelar: 'Corrigir',
  })
}
