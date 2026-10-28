// Faixa de dias da Agenda (visão Dia): os 7 dias da semana da data atual, com o dia aberto em destaque, "hoje" marcado e um ponto nos dias com aula.
// Regras puras (sem I/O). Auditoria de UX de 28/10/2026 (wireframe do ChatGPT, BACKLOG item 98).
import { diaSemanaISO, nomeDiaCurto, somarDias } from '@/lib/datas'

export type DiaDaFaixa = {
  iso: string
  sigla: string
  numero: number
  hoje: boolean
  selecionado: boolean
  aulas: number
}

/** `contagem`: aulas (não canceladas) por data aaaa-mm-dd. A semana começa na segunda (`inicioSemanaISO`). */
export function montarFaixa(inicioSemanaISO: string, hojeISO: string, selecionadoISO: string, contagem: ReadonlyMap<string, number>): DiaDaFaixa[] {
  return Array.from({ length: 7 }, (_, i) => {
    const iso = somarDias(inicioSemanaISO, i)
    return { iso, sigla: nomeDiaCurto(iso), numero: Number(iso.slice(8, 10)), hoje: iso === hojeISO, selecionado: iso === selecionadoISO, aulas: contagem.get(iso) ?? 0 }
  })
}

/** Texto lido pelo leitor de tela: "Quarta, 28 de outubro: 2 aulas (hoje)". */
export function rotuloAcessivelDoDia(d: DiaDaFaixa, dataCompleta: string): string {
  const aulas = d.aulas === 0 ? 'sem aulas' : d.aulas === 1 ? '1 aula' : `${d.aulas} aulas`
  return `${dataCompleta}: ${aulas}${d.hoje ? ' (hoje)' : ''}`
}

/** Arrastar a faixa para o lado: -1 = semana anterior, 1 = próxima, 0 = movimento curto demais (era um toque). */
export function direcaoDoDeslize(deltaX: number, minimo = 60): -1 | 0 | 1 {
  if (deltaX <= -minimo) return 1
  if (deltaX >= minimo) return -1
  return 0
}

// o weekday de uma data qualquer não é usado aqui, mas mantemos a exportação para os testes conferirem que a semana começa na segunda
export const ehSegunda = (iso: string): boolean => diaSemanaISO(iso) === 1
