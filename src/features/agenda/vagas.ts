/** Vagas livres: a disponibilidade do personal menos as aulas marcadas e os bloqueios (puro, sem I/O). */
import { dataSP, diaSemanaISO, formatarDataCompleta, horaSP, montarDataHoraSP, somarDias } from '@/lib/datas'
import type { JanelaSemanal, ParametrosAgenda } from './disponibilidade'

export type Vaga = { dataISO: string; inicio: string; fim: string }
export type AulaOcupada = { starts_at: string; duration_min: number; status: string }
export type Bloqueio = { data_inicio: string; data_fim: string }

const minutos = (t: string): number => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const hhmm = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** Tira de [a, b] os trechos ocupados (já com o intervalo somado); devolve os pedaços livres, em ordem. */
function trechosLivres(a: number, b: number, ocupados: [number, number][]): [number, number][] {
  const livres: [number, number][] = []
  let cursor = a
  for (const [oi, of] of [...ocupados].sort((x, y) => x[0] - y[0])) {
    if (of <= cursor) continue
    if (oi >= b) break
    if (oi > cursor) livres.push([cursor, oi])
    cursor = Math.max(cursor, of)
  }
  if (cursor < b) livres.push([cursor, b])
  return livres
}

export type EntradaVagas = {
  janelas: JanelaSemanal[]
  aulas: AulaOcupada[]
  bloqueios: Bloqueio[]
  parametros: ParametrosAgenda
  agora: Date
  /** primeiro e último dia (AAAA-MM-DD, fuso de São Paulo), inclusive */
  de: string
  ate: string
  /** vagas que começam antes de agora + estas horas não entram (0 = qualquer horário futuro) */
  antecedenciaHoras?: number
}

/**
 * Para cada dia, cada janela vira pedaços livres (descontadas as aulas não canceladas, com o intervalo entre aulas de cada lado)
 * e cada pedaço é fatiado em aulas da duração padrão, uma depois da outra com o intervalo entre elas.
 */
export function calcularVagas(e: EntradaVagas): Vaga[] {
  const { duracaoMin, intervaloMin } = e.parametros
  const limite = e.agora.getTime() + (e.antecedenciaHoras ?? 0) * 3_600_000
  const vagas: Vaga[] = []
  if (duracaoMin <= 0) return vagas
  for (let dia = e.de; dia <= e.ate; dia = somarDias(dia, 1)) {
    if (e.bloqueios.some((b) => b.data_inicio <= dia && dia <= b.data_fim)) continue
    const weekday = diaSemanaISO(dia)
    const ocupados: [number, number][] = e.aulas
      .filter((a) => a.status !== 'cancelada' && dataSP(a.starts_at) === dia)
      .map((a) => {
        const ini = minutos(horaSP(a.starts_at))
        return [ini - intervaloMin, ini + a.duration_min + intervaloMin]
      })
    for (const j of e.janelas.filter((x) => x.weekday === weekday).sort((x, y) => x.start_time.localeCompare(y.start_time))) {
      for (const [a, b] of trechosLivres(minutos(j.start_time), minutos(j.end_time), ocupados)) {
        for (let t = a; t + duracaoMin <= b; t += duracaoMin + intervaloMin) {
          if (montarDataHoraSP(dia, hhmm(t)).getTime() < limite) continue
          vagas.push({ dataISO: dia, inicio: hhmm(t), fim: hhmm(t + duracaoMin) })
        }
      }
    }
  }
  return vagas
}

/** Mensagem de WhatsApp para oferecer a vaga a um aluno (só o primeiro nome dele; nada de dado de saúde). */
export function mensagemDaVaga(o: { alunoNome: string; personalNome: string; vaga: Pick<Vaga, 'dataISO' | 'inicio'> }): string {
  const primeiro = o.alunoNome.trim().split(/\s+/)[0] || 'tudo bem'
  const dia = formatarDataCompleta(o.vaga.dataISO).toLowerCase()
  const assinatura = o.personalNome.trim() ? ` — ${o.personalNome.trim()}` : ''
  return `Oi, ${primeiro}! Abriu uma vaga na minha agenda: ${dia}, às ${o.vaga.inicio}. Se quiser, me responda aqui que eu confirmo.${assinatura}`
}

/** "Sexta, 30 de outubro" para o título da vaga. */
export const rotuloDaVaga = (v: Pick<Vaga, 'dataISO' | 'inicio' | 'fim'>): string => `${formatarDataCompleta(v.dataISO)}, ${v.inicio} às ${v.fim}`
