/** Disponibilidade semanal do personal (janelas por dia da semana) e os parâmetros das vagas. Puro, sem I/O. */
import { ORDEM_SEMANA_SEG_DOM } from '@/lib/datas'

export type Intervalo = { inicio: string; fim: string }
export type DiaDisponibilidade = { weekday: number; ativo: boolean; intervalos: Intervalo[] }
/** Linha do banco: horários vêm como "07:00:00". */
export type JanelaSemanal = { weekday: number; start_time: string; end_time: string }

export type ParametrosAgenda = { duracaoMin: number; intervaloMin: number; antecedenciaHoras: number; horizonteSemanas: number }
export const PARAMETROS_PADRAO: ParametrosAgenda = { duracaoMin: 60, intervaloMin: 0, antecedenciaHoras: 3, horizonteSemanas: 4 }
export const MAX_INTERVALOS_POR_DIA = 4

const NOMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
export const nomeDia = (weekday: number): string => NOMES[weekday]

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/
const hhmm = (t: string): string => t.slice(0, 5)
const minutos = (t: string): number => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))

export const intervaloVazio = (): Intervalo => ({ inicio: '07:00', fim: '12:00' })

/** Os 7 dias na ordem de exibição (segunda a domingo), com os intervalos vindos do banco. */
export function diasDasJanelas(janelas: JanelaSemanal[]): DiaDisponibilidade[] {
  return ORDEM_SEMANA_SEG_DOM.map((weekday) => {
    const intervalos = janelas
      .filter((j) => j.weekday === weekday)
      .map((j) => ({ inicio: hhmm(j.start_time), fim: hhmm(j.end_time) }))
      .sort((a, b) => a.inicio.localeCompare(b.inicio))
    return { weekday, ativo: intervalos.length > 0, intervalos }
  })
}

/** O que vai para o banco: só os dias ligados, com seus intervalos. */
export function janelasDosDias(dias: DiaDisponibilidade[]): { weekday: number; start_time: string; end_time: string }[] {
  return dias.filter((d) => d.ativo).flatMap((d) => d.intervalos.map((i) => ({ weekday: d.weekday, start_time: i.inicio, end_time: i.fim })))
}

/** Erros por dia (texto pronto para mostrar); vazio = tudo certo. Dia ligado precisa de ao menos um intervalo. */
export function validarDias(dias: DiaDisponibilidade[]): string[] {
  const erros: string[] = []
  for (const d of dias.filter((x) => x.ativo)) {
    const nome = nomeDia(d.weekday)
    if (d.intervalos.length === 0) {
      erros.push(`${nome}: adicione um horário ou desligue o dia.`)
      continue
    }
    if (d.intervalos.length > MAX_INTERVALOS_POR_DIA) erros.push(`${nome}: no máximo ${MAX_INTERVALOS_POR_DIA} horários por dia.`)
    for (const i of d.intervalos) {
      if (!HORA.test(i.inicio) || !HORA.test(i.fim)) erros.push(`${nome}: informe início e fim.`)
      else if (minutos(i.fim) <= minutos(i.inicio)) erros.push(`${nome}: o fim precisa ser depois do início (${i.inicio} a ${i.fim}).`)
    }
    const validos = d.intervalos.filter((i) => HORA.test(i.inicio) && HORA.test(i.fim) && minutos(i.fim) > minutos(i.inicio)).sort((a, b) => minutos(a.inicio) - minutos(b.inicio))
    for (let k = 1; k < validos.length; k++) {
      if (minutos(validos[k].inicio) < minutos(validos[k - 1].fim)) {
        erros.push(`${nome}: os horários ${validos[k - 1].inicio}–${validos[k - 1].fim} e ${validos[k].inicio}–${validos[k].fim} se sobrepõem.`)
        break
      }
    }
  }
  return erros
}

/** Avisos que não impedem: intervalo curto demais para caber uma aula. */
export function avisosDias(dias: DiaDisponibilidade[], duracaoMin: number): string[] {
  const avisos: string[] = []
  for (const d of dias.filter((x) => x.ativo)) {
    for (const i of d.intervalos) {
      if (HORA.test(i.inicio) && HORA.test(i.fim) && minutos(i.fim) > minutos(i.inicio) && minutos(i.fim) - minutos(i.inicio) < duracaoMin) {
        avisos.push(`${nomeDia(d.weekday)}: ${i.inicio}–${i.fim} é mais curto que uma aula de ${duracaoMin} min e não gera vaga.`)
      }
    }
  }
  return avisos
}

const textoIntervalos = (d: DiaDisponibilidade): string =>
  d.ativo && d.intervalos.length > 0 ? [...d.intervalos].sort((a, b) => a.inicio.localeCompare(b.inicio)).map((i) => `${i.inicio}–${i.fim}`).join(' e ') : 'indisponível'

function rotuloFaixa(dias: DiaDisponibilidade[]): string {
  const nomes = dias.map((d) => nomeDia(d.weekday))
  if (nomes.length === 1) return nomes[0]
  if (nomes.length === 2) return `${nomes[0]} e ${nomes[1].toLowerCase()}`
  return `${nomes[0]} a ${nomes[nomes.length - 1].toLowerCase()}`
}

/** "Segunda: 07:00–09:00 e 14:00–18:00", "Terça a sábado: 07:00–18:00", "Domingo: indisponível" (dias seguidos iguais são agrupados). */
export function resumoDisponibilidade(dias: DiaDisponibilidade[]): string[] {
  const linhas: string[] = []
  let grupo: DiaDisponibilidade[] = []
  const fechar = () => {
    if (grupo.length > 0) linhas.push(`${rotuloFaixa(grupo)}: ${textoIntervalos(grupo[0])}`)
    grupo = []
  }
  for (const d of dias) {
    if (grupo.length > 0 && textoIntervalos(grupo[0]) !== textoIntervalos(d)) fechar()
    grupo.push(d)
  }
  fechar()
  return linhas
}

const clonar = (i: Intervalo[]): Intervalo[] => i.map((x) => ({ ...x }))

/** Copia os horários de um dia para os outros dias (todos ou só segunda a sexta). */
export function copiarDia(dias: DiaDisponibilidade[], origem: number, destino: 'uteis' | 'todos'): DiaDisponibilidade[] {
  const fonte = dias.find((d) => d.weekday === origem)
  if (!fonte) return dias
  return dias.map((d) => {
    const alvo = destino === 'todos' || (d.weekday >= 1 && d.weekday <= 5)
    return d.weekday === origem || !alvo ? d : { ...d, ativo: fonte.ativo, intervalos: clonar(fonte.intervalos) }
  })
}

/** Modelo para começar: segunda a sexta, manhã e tarde. */
export function modeloManhaETarde(): DiaDisponibilidade[] {
  return ORDEM_SEMANA_SEG_DOM.map((weekday) => {
    const util = weekday >= 1 && weekday <= 5
    return { weekday, ativo: util, intervalos: util ? [{ inicio: '07:00', fim: '12:00' }, { inicio: '14:00', fim: '18:00' }] : [] }
  })
}

export function validarParametros(p: ParametrosAgenda): string[] {
  const e: string[] = []
  if (!Number.isInteger(p.duracaoMin) || p.duracaoMin < 15 || p.duracaoMin > 240) e.push('A duração da aula vai de 15 a 240 minutos.')
  if (!Number.isInteger(p.intervaloMin) || p.intervaloMin < 0 || p.intervaloMin > 120) e.push('O intervalo entre aulas vai de 0 a 120 minutos.')
  if (!Number.isInteger(p.antecedenciaHoras) || p.antecedenciaHoras < 0 || p.antecedenciaHoras > 168) e.push('A antecedência vai de 0 a 168 horas.')
  if (!Number.isInteger(p.horizonteSemanas) || p.horizonteSemanas < 1 || p.horizonteSemanas > 12) e.push('Mostrar vagas de 1 a 12 semanas à frente.')
  return e
}

/** Parâmetros vindos da configuração do banco (colunas ainda ausentes ou nulas usam o padrão). */
export function parametrosDaConfig(c: { duracao_padrao_min?: number | null; intervalo_min?: number | null; antecedencia_horas?: number | null; horizonte_semanas?: number | null } | null | undefined): ParametrosAgenda {
  return {
    duracaoMin: c?.duracao_padrao_min ?? PARAMETROS_PADRAO.duracaoMin,
    intervaloMin: c?.intervalo_min ?? PARAMETROS_PADRAO.intervaloMin,
    antecedenciaHoras: c?.antecedencia_horas ?? PARAMETROS_PADRAO.antecedenciaHoras,
    horizonteSemanas: c?.horizonte_semanas ?? PARAMETROS_PADRAO.horizonteSemanas,
  }
}
