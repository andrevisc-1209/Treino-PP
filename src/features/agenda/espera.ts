/** Lista de espera da página pública (tabela `lista_espera_agenda`, migration 20261094). Helpers puros, sem I/O. */
import { formatarDataCompleta, somarDias } from '@/lib/datas'
import { turnoDaHora, ROTULO_TURNO, tituloDoDia, type Turno } from './publica'
import type { Vaga } from './vagas'

export type TurnoEspera = Turno | 'qualquer'

export const TURNOS_ESPERA: { valor: TurnoEspera; rotulo: string }[] = [
  { valor: 'qualquer', rotulo: 'Qualquer horário' },
  { valor: 'manha', rotulo: ROTULO_TURNO.manha },
  { valor: 'tarde', rotulo: ROTULO_TURNO.tarde },
  { valor: 'noite', rotulo: ROTULO_TURNO.noite },
]

export const rotuloTurnoEspera = (t: TurnoEspera): string => TURNOS_ESPERA.find((x) => x.valor === t)?.rotulo ?? 'Qualquer horário'

/** Os próximos `quantos` dias (a partir de hoje) para o visitante escolher, com o rótulo "Sexta, 30 de outubro". */
export function diasParaEspera(hojeISO: string, quantos = 14): { dataISO: string; rotulo: string }[] {
  return Array.from({ length: quantos }, (_, i) => {
    const dataISO = somarDias(hojeISO, i)
    return { dataISO, rotulo: tituloDoDia(dataISO) }
  })
}

export type EsperaAgenda = {
  id: string
  visitante_nome: string
  /** 55 + DDD + número */
  visitante_telefone: string
  data: string
  turno: TurnoEspera
  chamado_em: string | null
  created_at: string
}

export function normalizarEspera(raw: unknown): EsperaAgenda[] {
  return ((raw as Record<string, unknown>[] | null) ?? []).map((r) => ({
    id: String(r.id),
    visitante_nome: String(r.visitante_nome ?? ''),
    visitante_telefone: String(r.visitante_telefone ?? ''),
    data: String(r.data),
    turno: (['manha', 'tarde', 'noite'].includes(String(r.turno)) ? r.turno : 'qualquer') as TurnoEspera,
    chamado_em: (r.chamado_em as string | null) ?? null,
    created_at: String(r.created_at),
  }))
}

/** As vagas livres que servem a quem está na espera: do mesmo dia e, se escolheu um turno, desse turno. */
export function vagasQueCasam(e: Pick<EsperaAgenda, 'data' | 'turno'>, vagas: Vaga[]): Vaga[] {
  return vagas
    .filter((v) => v.dataISO === e.data && (e.turno === 'qualquer' || turnoDaHora(v.inicio) === e.turno))
    .sort((a, b) => a.inicio.localeCompare(b.inicio))
}

/** Mensagem de WhatsApp para chamar quem estava na espera (só o primeiro nome; nada de dado de saúde). */
export function mensagemDaEspera(o: { nome: string; personalNome: string; data: string; vagas: Pick<Vaga, 'inicio'>[] }): string {
  const primeiro = o.nome.trim().split(/\s+/)[0] || 'tudo bem'
  const dia = formatarDataCompleta(o.data).toLowerCase()
  const horas = o.vagas.slice(0, 3).map((v) => v.inicio)
  const quando = horas.length === 1 ? `às ${horas[0]}` : `às ${horas.slice(0, -1).join(', ')} ou ${horas[horas.length - 1]}`
  const assinatura = o.personalNome.trim() ? ` — ${o.personalNome.trim()}` : ''
  return `Oi, ${primeiro}! Você estava na minha lista de espera e abriu um horário: ${dia}, ${quando}. Se quiser, me responda aqui que eu confirmo.${assinatura}`
}
