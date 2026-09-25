// Helpers de data/hora em America/Sao_Paulo. Todo horário exibido ou
// digitado no app é local a esse fuso; a conversão para o instante UTC
// (timestamptz) usado pelo Supabase acontece só aqui, sem concatenar
// "-03:00" nas strings (o Brasil não tem mais horário de verão, mas o
// cálculo abaixo funciona mesmo se isso mudar).

export const FUSO = 'America/Sao_Paulo'

const PARTES_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function partesSP(instante: Date): Record<string, string> {
  const partes: Record<string, string> = {}
  for (const p of PARTES_FMT.formatToParts(instante)) {
    if (p.type !== 'literal') partes[p.type] = p.value
  }
  return partes
}

function offsetMs(instante: Date): number {
  const p = partesSP(instante)
  const comoUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
  return comoUtc - instante.getTime()
}

/** Monta o instante (Date) correspondente a uma data+hora de parede em SP. */
export function montarDataHoraSP(dataISO: string, hora: string): Date {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const [h, m] = hora.split(':').map(Number)
  const chute = Date.UTC(ano, mes - 1, dia, h, m, 0)
  return new Date(chute - offsetMs(new Date(chute)))
}

/** 'YYYY-MM-DD' de um instante, na data local de SP. */
export function dataSP(instante: Date | string): string {
  const p = partesSP(typeof instante === 'string' ? new Date(instante) : instante)
  return `${p.year}-${p.month}-${p.day}`
}

/** 'HH:mm' de um instante, na hora local de SP. */
export function horaSP(instante: Date | string): string {
  const p = partesSP(typeof instante === 'string' ? new Date(instante) : instante)
  return `${p.hour}:${p.minute}`
}

/** 'YYYY-MM-DD' de hoje, na data local de SP. */
export function hojeSP(): string {
  return dataSP(new Date())
}

/**
 * 0 (domingo) a 6 (sábado) de uma data-calendário 'YYYY-MM-DD', igual ao
 * EXTRACT(DOW) do Postgres. O dia da semana de uma data-calendário não
 * depende de fuso horário, então calculamos em UTC puro (evita depender
 * do fuso do navegador de quem está usando o app).
 */
export function diaSemanaISO(dataISO: string): number {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
}

function somarDiasISO(dataISO: string, dias: number): string {
  const [ano, mes, dia] = dataISO.split('-').map(Number)
  const d = new Date(Date.UTC(ano, mes - 1, dia))
  d.setUTCDate(d.getUTCDate() + dias)
  return d.toISOString().slice(0, 10)
}

export { somarDiasISO as somarDias }

/** Início (00:00) e fim (23:59:59.999) do dia em SP, como instantes UTC. */
export function limitesDoDiaSP(dataISO: string): { inicio: Date; fim: Date } {
  const inicio = montarDataHoraSP(dataISO, '00:00')
  const fim = montarDataHoraSP(somarDiasISO(dataISO, 1), '00:00')
  return { inicio, fim: new Date(fim.getTime() - 1) }
}

/** Segunda-feira da semana (SP) que contém dataISO, como 'YYYY-MM-DD'. */
export function inicioDaSemanaSP(dataISO: string): string {
  const dow = diaSemanaISO(dataISO) // 0=dom...6=sab
  const diff = dow === 0 ? -6 : 1 - dow
  return somarDiasISO(dataISO, diff)
}

/** Início e fim (domingo 23:59:59.999) da semana em SP, como instantes UTC. */
export function limitesDaSemanaSP(inicioSemanaISO: string): { inicio: Date; fim: Date } {
  const inicio = montarDataHoraSP(inicioSemanaISO, '00:00')
  const fim = montarDataHoraSP(somarDiasISO(inicioSemanaISO, 7), '00:00')
  return { inicio, fim: new Date(fim.getTime() - 1) }
}

const NOMES_DIA_CURTO = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const
const NOMES_DIA_LONGO = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'] as const
const NOMES_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
] as const

export function nomeDiaCurto(dataISO: string): string {
  return NOMES_DIA_CURTO[diaSemanaISO(dataISO)]
}

/** weekday (0=dom..6=sáb) na ordem de exibição Seg–Dom. */
export const ORDEM_SEMANA_SEG_DOM = [1, 2, 3, 4, 5, 6, 0] as const

export function nomeDiaCurtoPorWeekday(weekday: number): string {
  return NOMES_DIA_CURTO[weekday]
}

/** "Sexta, 25 de setembro" na data-calendário informada. */
export function formatarDataCompleta(dataISO: string): string {
  const [, mes, dia] = dataISO.split('-').map(Number)
  return `${NOMES_DIA_LONGO[diaSemanaISO(dataISO)]}, ${dia} de ${NOMES_MES[mes - 1]}`
}

/** "25/09" na data-calendário informada. */
export function formatarDataCurta(dataISO: string): string {
  const [, mes, dia] = dataISO.split('-')
  return `${dia}/${mes}`
}

export function formatarHoraInicioFim(startsAt: string, durationMin: number): string {
  const inicio = new Date(startsAt)
  const fim = new Date(inicio.getTime() + durationMin * 60_000)
  return `${horaSP(inicio)}–${horaSP(fim)}`
}
