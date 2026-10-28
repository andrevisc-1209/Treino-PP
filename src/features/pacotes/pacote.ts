// Regras do pacote de aulas (sem I/O): quanto já foi usado, quanto falta, quando vence e qual aviso mostrar.
// O pacote é vendido por N aulas e um prazo; as aulas contam a partir do dia de início (presenças da agenda) mais as que o
// personal já considerava feitas ("esta é a 2/10" → 1 aula anterior).

import { diasEntre, somarDias } from '@/lib/datas'
import { formatarDataBR } from '@/lib/format'

export type Pacote = {
  id: string
  aluno_id: string
  qtd_aulas: number
  valor: number
  validade_dias: number
  inicio: string
  aulas_anteriores: number
  status: 'ativo' | 'encerrado'
}

/** Faltando este tanto de aulas (ou menos) o app já avisa: 3, 2 e 1. */
export const AVISO_AULAS_RESTANTES = 3
/** Faltando este tanto de dias para o prazo (ou menos) o app avisa que o pacote vai vencer. */
export const AVISO_DIAS_PARA_VENCER = 7

export const LIMITE_AULAS_PACOTE = 500
export const LIMITE_VALIDADE_DIAS = 730

/** Aulas usadas: as que o personal já considerava feitas + as presenças da agenda desde o início do pacote. */
export function aulasUsadas(p: Pick<Pacote, 'aulas_anteriores'>, presencasNoApp: number): number {
  return p.aulas_anteriores + Math.max(0, presencasNoApp)
}

export function aulasRestantes(p: Pick<Pacote, 'qtd_aulas' | 'aulas_anteriores'>, presencasNoApp: number): number {
  return Math.max(0, p.qtd_aulas - aulasUsadas(p, presencasNoApp))
}

/** Último dia em que o pacote vale (o dia de início conta como o dia 1). */
export function fimDoPacote(p: Pick<Pacote, 'inicio' | 'validade_dias'>): string {
  return somarDias(p.inicio, p.validade_dias - 1)
}

/** Dias que faltam até o fim do prazo (0 = vence hoje; negativo = já venceu). */
export function diasParaVencer(p: Pick<Pacote, 'inicio' | 'validade_dias'>, hoje: string): number {
  return diasEntre(hoje, fimDoPacote(p))
}

export type NivelPacote = 'ok' | 'atencao' | 'esgotado'

export type SituacaoPacote = {
  usadas: number
  total: number
  restantes: number
  /** "2/10" */
  contador: string
  fim: string
  diasParaVencer: number
  nivel: NivelPacote
  /** texto do aviso ("Faltam 3 aulas"); null quando está tudo certo */
  aviso: string | null
}

function pluralAulas(n: number): string {
  return n === 1 ? '1 aula' : `${n} aulas`
}

/**
 * Situação do pacote hoje. Prioridade do aviso: acabou > venceu > faltam poucas aulas > prazo perto.
 * Passou das aulas (ex.: "12/10")? Segue como "acabou": o app não apaga nada, só avisa.
 */
export function situacaoDoPacote(p: Pacote, presencasNoApp: number, hoje: string): SituacaoPacote {
  const usadas = aulasUsadas(p, presencasNoApp)
  const restantes = aulasRestantes(p, presencasNoApp)
  const dias = diasParaVencer(p, hoje)
  const fim = fimDoPacote(p)

  let aviso: string | null = null
  let nivel: NivelPacote = 'ok'
  if (restantes === 0) {
    aviso = 'Pacote acabou'
    nivel = 'esgotado'
  } else if (dias < 0) {
    aviso = 'Pacote vencido'
    nivel = 'esgotado'
  } else if (restantes <= AVISO_AULAS_RESTANTES) {
    aviso = restantes === 1 ? 'Falta 1 aula' : `Faltam ${restantes} aulas`
    nivel = 'atencao'
  } else if (dias <= AVISO_DIAS_PARA_VENCER) {
    aviso = dias === 0 ? 'Pacote vence hoje' : dias === 1 ? 'Pacote vence amanhã' : `Pacote vence em ${dias} dias`
    nivel = 'atencao'
  }

  return { usadas, total: p.qtd_aulas, restantes, contador: `${usadas}/${p.qtd_aulas}`, fim, diasParaVencer: dias, nivel, aviso }
}

/** Resumo de uma linha para a ficha: "10 aulas · vence em 27/12/2026". */
export function resumoDoPacote(p: Pacote): string {
  return `${pluralAulas(p.qtd_aulas)} · vale até ${formatarDataBR(fimDoPacote(p))}`
}

export type PacoteFormValor = { qtdTexto: string; validadeTexto: string; feitasTexto: string }

const inteiro = (t: string): number => (t.trim() === '' ? NaN : Number(t))

/** Valida os campos do pacote com os mesmos limites do banco. `minimoFeitas` = presenças já registradas no app (não dá para dizer que foram menos). */
export function validarPacote(v: PacoteFormValor, minimoFeitas = 0): string | null {
  const qtd = inteiro(v.qtdTexto)
  if (!Number.isInteger(qtd) || qtd < 1 || qtd > LIMITE_AULAS_PACOTE) return `Quantidade de aulas deve ser de 1 a ${LIMITE_AULAS_PACOTE}`
  const dias = inteiro(v.validadeTexto)
  if (!Number.isInteger(dias) || dias < 1 || dias > LIMITE_VALIDADE_DIAS) return `Prazo deve ser de 1 a ${LIMITE_VALIDADE_DIAS} dias`
  const feitas = v.feitasTexto.trim() === '' ? 0 : Number(v.feitasTexto)
  if (!Number.isInteger(feitas) || feitas < 0) return 'Aulas já feitas deve ser 0 ou mais'
  if (feitas > qtd) return 'Aulas já feitas não pode passar da quantidade do pacote'
  if (feitas < minimoFeitas) return `O app já registrou ${pluralAulas(minimoFeitas)} neste pacote; não dá para informar menos`
  return null
}

/** Quantas aulas "anteriores" gravar para que o contador mostre `feitas` (o que o app já registrou entra por cima). */
export function aulasAnterioresParaContador(feitas: number, presencasNoApp: number): number {
  return Math.max(0, feitas - Math.max(0, presencasNoApp))
}
