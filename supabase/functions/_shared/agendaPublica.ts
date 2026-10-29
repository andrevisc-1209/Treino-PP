// Regras da página pública de pedido de aula (/agenda/:slug), sem I/O: validação do que chega do navegador (tudo é hostil) e o cálculo
// das vagas que o visitante pode ver. O cálculo é o MESMO de src/features/agenda/vagas.ts (mantenha igual; o teste de paridade em
// src/features/agenda/vagasPublicas.paridade.test.ts compara os dois). Horário de São Paulo = UTC-3 fixo (sem horário de verão desde 2019).

export type Janela = { weekday: number; start_time: string; end_time: string }
export type AulaOcupada = { starts_at: string; duration_min: number; status: string }
export type Bloqueio = { data_inicio: string; data_fim: string }
export type Vaga = { dataISO: string; inicio: string; fim: string }
export type Parametros = { duracaoMin: number; intervaloMin: number; antecedenciaHoras: number; horizonteSemanas: number }

const TRES_HORAS = 3 * 3_600_000 // UTC-3
const minutos = (t: string): number => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5))
const hhmm = (m: number): string => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

/** AAAA-MM-DD e HH:mm de um instante, na hora de São Paulo. */
export function dataEHoraSP(instante: Date | string): { data: string; hora: string } {
  const d = new Date((typeof instante === 'string' ? new Date(instante) : instante).getTime() - TRES_HORAS)
  const p = (n: number) => String(n).padStart(2, '0')
  return { data: `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`, hora: `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` }
}

/** Instante de uma data + hora de São Paulo. */
export const instanteSP = (dataISO: string, hora: string): Date => new Date(`${dataISO}T${hora.slice(0, 5)}:00-03:00`)

export function somarDiasISO(dataISO: string, dias: number): string {
  const [a, m, d] = dataISO.split('-').map(Number)
  const x = new Date(Date.UTC(a, m - 1, d))
  x.setUTCDate(x.getUTCDate() + dias)
  return x.toISOString().slice(0, 10)
}

const weekdayDe = (dataISO: string): number => {
  const [a, m, d] = dataISO.split('-').map(Number)
  return new Date(Date.UTC(a, m - 1, d)).getUTCDay()
}

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

export type EntradaVagas = { janelas: Janela[]; aulas: AulaOcupada[]; bloqueios: Bloqueio[]; parametros: Parametros; agora: Date; de: string; ate: string; antecedenciaHoras?: number }

export function calcularVagas(e: EntradaVagas): Vaga[] {
  const { duracaoMin, intervaloMin } = e.parametros
  const limite = e.agora.getTime() + (e.antecedenciaHoras ?? 0) * 3_600_000
  const vagas: Vaga[] = []
  if (duracaoMin <= 0) return vagas
  for (let dia = e.de; dia <= e.ate; dia = somarDiasISO(dia, 1)) {
    if (e.bloqueios.some((b) => b.data_inicio <= dia && dia <= b.data_fim)) continue
    const weekday = weekdayDe(dia)
    const ocupados: [number, number][] = e.aulas
      .filter((a) => a.status !== 'cancelada' && dataEHoraSP(a.starts_at).data === dia)
      .map((a) => {
        const ini = minutos(dataEHoraSP(a.starts_at).hora)
        return [ini - intervaloMin, ini + a.duration_min + intervaloMin]
      })
    for (const j of e.janelas.filter((x) => x.weekday === weekday).sort((x, y) => x.start_time.localeCompare(y.start_time))) {
      for (const [a, b] of trechosLivres(minutos(j.start_time), minutos(j.end_time), ocupados)) {
        for (let t = a; t + duracaoMin <= b; t += duracaoMin + intervaloMin) {
          if (instanteSP(dia, hhmm(t)).getTime() < limite) continue
          vagas.push({ dataISO: dia, inicio: hhmm(t), fim: hhmm(t + duracaoMin) })
        }
      }
    }
  }
  return vagas
}

// ---------- o que o visitante pode mandar ----------
export const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const slugValido = (s: unknown): s is string => typeof s === 'string' && s.length >= 3 && s.length <= 60 && SLUG_REGEX.test(s)

/** Só dígitos, com 55 na frente se vier sem; aceita celular (11) ou fixo (10) com DDD. null se não for um telefone brasileiro plausível. */
export function normalizarTelefone(bruto: unknown): string | null {
  if (typeof bruto !== 'string') return null
  let d = bruto.replace(/\D/g, '')
  if (d.length === 12 || d.length === 13) {
    if (!d.startsWith('55')) return null
    d = d.slice(2)
  }
  if (d.length !== 10 && d.length !== 11) return null
  if (/^(\d)\1+$/.test(d)) return null
  if (d.length === 11 && d[2] !== '9') return null
  return `55${d}`
}

const limpa = (t: string): string => t.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim()

export type PedidoValido = { nome: string; telefone: string; mensagem: string | null; dataISO: string; hora: string }

/** Valida o corpo do pedido; devolve a mensagem de erro em português (genérica o bastante para não ajudar quem testa) ou o pedido limpo. */
export function validarPedido(corpo: Record<string, unknown>): { ok: true; pedido: PedidoValido } | { ok: false; erro: string } {
  const nome = typeof corpo.nome === 'string' ? limpa(corpo.nome) : ''
  if (nome.length < 2 || nome.length > 80) return { ok: false, erro: 'Informe seu nome.' }
  const telefone = normalizarTelefone(corpo.telefone)
  if (!telefone) return { ok: false, erro: 'Informe um telefone com DDD, de preferência com WhatsApp.' }
  const mensagem = typeof corpo.mensagem === 'string' ? limpa(corpo.mensagem) : ''
  if (mensagem.length > 140) return { ok: false, erro: 'A mensagem pode ter até 140 caracteres.' }
  if (corpo.consentimento !== true) return { ok: false, erro: 'Confirme que o personal pode responder pelo WhatsApp.' }
  const dataISO = corpo.data
  const hora = corpo.hora
  if (typeof dataISO !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataISO) || typeof hora !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
    return { ok: false, erro: 'Escolha um horário.' }
  }
  return { ok: true, pedido: { nome, telefone, mensagem: mensagem || null, dataISO, hora } }
}

export const TURNOS_ESPERA = ['manha', 'tarde', 'noite', 'qualquer'] as const
export type TurnoEspera = (typeof TURNOS_ESPERA)[number]
export type EsperaValida = { nome: string; telefone: string; dataISO: string; turno: TurnoEspera }
/** Quantos dias à frente o visitante pode pedir para ser avisado. */
export const MAX_DIAS_ESPERA = 28

/** Valida o corpo da entrada na lista de espera: nome, telefone, consentimento, um dia de hoje até daqui a 28 dias e um turno. */
export function validarEspera(corpo: Record<string, unknown>, hojeISO: string): { ok: true; espera: EsperaValida } | { ok: false; erro: string } {
  const nome = typeof corpo.nome === 'string' ? limpa(corpo.nome) : ''
  if (nome.length < 2 || nome.length > 80) return { ok: false, erro: 'Informe seu nome.' }
  const telefone = normalizarTelefone(corpo.telefone)
  if (!telefone) return { ok: false, erro: 'Informe um telefone com DDD, de preferência com WhatsApp.' }
  if (corpo.consentimento !== true) return { ok: false, erro: 'Confirme que o personal pode chamar você pelo WhatsApp.' }
  const dataISO = corpo.data
  if (typeof dataISO !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dataISO) || dataISO < hojeISO || dataISO > somarDiasISO(hojeISO, MAX_DIAS_ESPERA)) {
    return { ok: false, erro: 'Escolha um dia nas próximas semanas.' }
  }
  const turno = TURNOS_ESPERA.find((t) => t === corpo.turno)
  if (!turno) return { ok: false, erro: 'Escolha o turno.' }
  return { ok: true, espera: { nome, telefone, dataISO, turno } }
}

export const MAX_ESPERA_POR_PERSONAL = 40

export const primeiroNome = (nome: string | null | undefined): string => (nome ?? '').trim().split(/\s+/)[0] ?? ''

/** O horário pedido ainda é uma das vagas abertas? (o visitante pode estar com a página velha). */
export const vagaDisponivel = (vagas: Vaga[], dataISO: string, hora: string): Vaga | null => vagas.find((v) => v.dataISO === dataISO && v.inicio === hora) ?? null

export const MAX_PENDENTES_POR_PERSONAL = 10
export const MAX_PEDIDOS_POR_TELEFONE_DIA = 3
export const MAX_PEDIDOS_POR_IP_HORA = 10
