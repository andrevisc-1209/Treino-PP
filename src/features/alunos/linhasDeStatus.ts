/** Linhas de status do topo do Resumo da ficha (próxima aula, último treino). Helpers puros, sem I/O. */
import { dataSP, horaSP, nomeDiaCurto, somarDias } from '@/lib/datas'
import { localCurto } from '@/features/agenda/proximaAula'
import { diasSemTreino, estaNaFila } from './filaAlunos'

export type ProximaAula = { starts_at: string; duration_min: number; local: string | null }

/** "Hoje · 18:00", "Amanhã · 07:00" ou "Qui 12/11 · 18:00", com o local curto quando há. */
export function textoProximaAula(a: ProximaAula | null, hojeISO: string): { texto: string; detalhe: string | null } {
  if (!a) return { texto: 'Nenhuma aula marcada', detalhe: null }
  const dia = dataSP(a.starts_at)
  const rotuloDia = dia === hojeISO ? 'Hoje' : dia === somarDias(hojeISO, 1) ? 'Amanhã' : `${nomeDiaCurto(dia)} ${dia.slice(8, 10)}/${dia.slice(5, 7)}`
  const local = localCurto(a.local)
  return { texto: `${rotuloDia} · ${horaSP(a.starts_at)}`, detalhe: local || null }
}

/** A aula mais próxima que ainda não começou, entre as do aluno (a consulta devolve poucas; a ordem aqui não depende do banco). */
export function proximaAulaDe(aulas: ProximaAula[], agora: number): ProximaAula | null {
  return aulas.filter((a) => new Date(a.starts_at).getTime() >= agora).toSorted((a, b) => a.starts_at.localeCompare(b.starts_at))[0] ?? null
}

/** "Hoje", "Ontem", "há 5 dias" ou "Nunca treinou"; `alerta` quando passou de 7 dias ou nunca treinou (a mesma regra da fila de Alunos). */
export function textoUltimoTreino(ultimaSessao: string | undefined | null, hojeISO: string): { texto: string; alerta: boolean } {
  const dias = diasSemTreino(ultimaSessao ?? undefined, hojeISO)
  if (dias === null) return { texto: 'Nunca treinou', alerta: true }
  const texto = dias === 0 ? 'Hoje' : dias === 1 ? 'Ontem' : `há ${dias} dias`
  return { texto, alerta: estaNaFila(dias) }
}
