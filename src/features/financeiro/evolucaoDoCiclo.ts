// Evolução do aluno dentro do ciclo, por modalidade, a partir do que o personal e o aluno já registraram.
// Só compara quando há pelo menos dois registros da mesma coisa e só mostra o que melhorou: nada de peso, medidas ou saúde.
// Sem I/O.

import { formatarNumero } from '@/lib/format'
import { dataSP, formatarDataCurta } from '@/lib/datas'
import { ehModalidade, MODALIDADES_CONFIG } from '@/types/modalidades'
import { ordenarItens, type ItemRecibo } from './recibo'

export type LinhaEvolucao = {
  /** "Musculação", "Corrida"… */
  modalidade: string
  /** o que foi comparado: "Agachamento", "Distância por treino", "Pace médio" */
  assunto: string
  /** "40 kg (06/10)" */
  de: string
  /** "50 kg (27/10)" */
  para: string
  /** "+25%" */
  variacao: string
}

/** "5:29" → 329 segundos por km; null se não for um pace válido. */
export function paceEmSegundos(texto: unknown): number | null {
  if (typeof texto !== 'string') return null
  const m = texto.trim().match(/^(\d{1,2}):([0-5]\d)$/)
  if (!m) return null
  const seg = Number(m[1]) * 60 + Number(m[2])
  return seg > 0 ? seg : null
}

const paceTexto = (seg: number) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}/km`
const km = (v: number) => `${formatarNumero(Math.round(v * 10) / 10)} km`
const diaDe = (i: ItemRecibo) => formatarDataCurta(dataSP(i.starts_at))
const percentual = (de: number, para: number) => `${para >= de ? '+' : '−'}${Math.round((Math.abs(para - de) / de) * 100)}%`

/** Mínimo de melhora para aparecer (abaixo disso é variação normal de um treino para o outro). */
const MELHORA_MINIMA = 0.05

type Ponto = { item: ItemRecibo; valor: number }

/** Primeiro e último registro de uma série de pontos, se houver pelo menos dois. */
function extremos(pontos: Ponto[]): { primeiro: Ponto; ultimo: Ponto } | null {
  return pontos.length >= 2 ? { primeiro: pontos[0], ultimo: pontos[pontos.length - 1] } : null
}

function maiorQue(de: number, para: number): boolean {
  return de > 0 && para >= de * (1 + MELHORA_MINIMA)
}

/**
 * Evolução do ciclo: primeiro × último registro de cada coisa que o aluno repetiu.
 *  - Musculação: maior carga em cada exercício feito em 2 treinos ou mais (até 4 exercícios, os que mais subiram).
 *  - Corrida: distância por treino e pace (mais rápido). Natação: metros por treino. Ciclismo: km por treino. Brick: bike e corrida.
 * Só entra o que melhorou pelo menos 5%; sem registros comparáveis, a lista vem vazia e a seção some do relatório.
 */
export function evolucaoDoCiclo(itens: ItemRecibo[]): LinhaEvolucao[] {
  const feitos = ordenarItens(itens).filter((i) => i.status === 'presente' && ehModalidade(i.modalidade))
  const linhas: LinhaEvolucao[] = []
  const rotulo = (m: string) => MODALIDADES_CONFIG[m as keyof typeof MODALIDADES_CONFIG].label

  // Musculação: carga por exercício
  const porExercicio = new Map<string, { nome: string; pontos: Ponto[] }>()
  for (const i of feitos.filter((x) => x.modalidade === 'musculacao')) {
    for (const c of i.cargas ?? []) {
      const e = porExercicio.get(c.exercicio_id) ?? { nome: c.nome, pontos: [] }
      e.pontos.push({ item: i, valor: c.carga_kg })
      porExercicio.set(c.exercicio_id, e)
    }
  }
  const musculacao: (LinhaEvolucao & { ganho: number })[] = []
  for (const e of porExercicio.values()) {
    const x = extremos(e.pontos)
    if (!x || !maiorQue(x.primeiro.valor, x.ultimo.valor)) continue
    musculacao.push({
      modalidade: rotulo('musculacao'),
      assunto: e.nome,
      de: `${formatarNumero(x.primeiro.valor)} kg (${diaDe(x.primeiro.item)})`,
      para: `${formatarNumero(x.ultimo.valor)} kg (${diaDe(x.ultimo.item)})`,
      variacao: percentual(x.primeiro.valor, x.ultimo.valor),
      ganho: x.ultimo.valor / x.primeiro.valor,
    })
  }
  linhas.push(...musculacao.sort((a, b) => b.ganho - a.ganho).slice(0, 4).map(({ ganho: _g, ...l }) => (void _g, l)))

  // Distância por treino (corrida, natação, ciclismo, brick)
  const distancia = (modalidade: string, assunto: string, valorDe: (i: ItemRecibo) => number, texto: (v: number) => string) => {
    const pontos = feitos.filter((i) => i.modalidade === modalidade).map((i) => ({ item: i, valor: valorDe(i) })).filter((p) => p.valor > 0)
    const x = extremos(pontos)
    if (!x || !maiorQue(x.primeiro.valor, x.ultimo.valor)) return
    linhas.push({ modalidade: rotulo(modalidade), assunto, de: `${texto(x.primeiro.valor)} (${diaDe(x.primeiro.item)})`, para: `${texto(x.ultimo.valor)} (${diaDe(x.ultimo.item)})`, variacao: percentual(x.primeiro.valor, x.ultimo.valor) })
  }
  distancia('corrida', 'Distância por treino', (i) => i.volume?.corridaKm ?? 0, km)
  distancia('natacao', 'Distância por treino', (i) => (i.volume?.natacaoKm ?? 0) * 1000, (v) => `${formatarNumero(Math.round(v))} m`)
  distancia('ciclismo', 'Distância por treino', (i) => i.volume?.ciclismoKm ?? 0, km)
  distancia('brick', 'Bike por treino', (i) => i.volume?.ciclismoKm ?? 0, km)
  distancia('brick', 'Corrida por treino', (i) => i.volume?.corridaKm ?? 0, km)

  // Pace da corrida: menor é melhor
  const paces = feitos.filter((i) => i.modalidade === 'corrida' && i.pace_seg_km).map((i) => ({ item: i, valor: i.pace_seg_km as number }))
  const p = extremos(paces)
  if (p && p.ultimo.valor <= p.primeiro.valor * (1 - MELHORA_MINIMA)) {
    linhas.push({
      modalidade: rotulo('corrida'),
      assunto: 'Pace médio',
      de: `${paceTexto(p.primeiro.valor)} (${diaDe(p.primeiro.item)})`,
      para: `${paceTexto(p.ultimo.valor)} (${diaDe(p.ultimo.item)})`,
      variacao: `${Math.round(((p.primeiro.valor - p.ultimo.valor) / p.primeiro.valor) * 100)}% mais rápido`,
    })
  }
  return linhas
}
