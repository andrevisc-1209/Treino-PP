import { formatarNumero } from '@/lib/format'

export type AmbienteNatacao = 'piscina' | 'mar'
export type GrupoNatacao = 'estilo' | 'educativo' | 'acessorio' | 'serie' | 'mar'

export interface BlocoNatacao {
  id: string // uuid gerado no front
  exercicio_id: string // id da biblioteca ou do exercício próprio
  nome: string // cópia do nome: o treino não muda se o exercício for renomeado/apagado
  is_custom?: boolean
  parametros: {
    distancia?: number // metros (piscina)
    tempo?: number // segundos (mar, ou exercícios por tempo como o elástico)
    series: number
    descanso: number // segundos entre séries
    ritmo?: string // ex.: "1:30/100m"
    observacao?: string
  }
}

export interface DadosNatacao {
  ambiente: AmbienteNatacao
  blocos: BlocoNatacao[]
}

export const AMBIENTES_NATACAO: { valor: AmbienteNatacao; rotulo: string; emoji: string }[] = [
  { valor: 'piscina', rotulo: 'Piscina', emoji: '🏊' },
  { valor: 'mar', rotulo: 'Mar Aberto', emoji: '🌊' },
]

export const rotuloAmbiente = (a: AmbienteNatacao): string => (a === 'mar' ? 'Mar Aberto' : 'Piscina')

/** Segundos em texto legível: 45 → "45s", 1800 → "30min", 5400 → "1h30". */
export function formatarTempo(seg: number): string {
  if (seg < 60) return `${seg}s`
  const min = Math.floor(seg / 60)
  const resto = seg % 60
  if (min < 60) return resto ? `${min}min${String(resto).padStart(2, '0')}s` : `${min}min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`
}

/** Metros de nado de um treino de piscina: Σ distância × séries. */
export function distanciaTotalNatacao(blocos: BlocoNatacao[]): number {
  return blocos.reduce((a, b) => a + (b.parametros.distancia ?? 0) * (b.parametros.series || 1), 0)
}

/** Tempo estimado (segundos) de um treino de mar: Σ tempo × séries + descansos entre as séries. */
export function tempoTotalNatacao(blocos: BlocoNatacao[]): number {
  return blocos.reduce((a, b) => {
    const s = b.parametros.series || 1
    return a + (b.parametros.tempo ?? 0) * s + (b.parametros.descanso || 0) * Math.max(0, s - 1)
  }, 0)
}

/** "400 m · 1 série · 30s descanso · ritmo 1:30/100m" — o corpo de um bloco. */
export function descricaoBlocoNatacao(b: BlocoNatacao): string {
  const p = b.parametros
  const s = p.series || 1
  const principal = p.distancia != null ? `${formatarNumero(p.distancia)} m` : p.tempo != null ? formatarTempo(p.tempo) : null
  return [
    principal,
    `${s} ${s === 1 ? 'série' : 'séries'}`,
    s > 1 && p.descanso ? `${p.descanso}s descanso` : null,
    p.ritmo?.trim() ? `ritmo ${p.ritmo.trim()}` : null,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** Cabeçalho de resumo: "🏊 Natação — Piscina · Distância total: 1.800 m" (ou "Tempo estimado: 40min" no mar). */
export function resumoTotalNatacao(d: DadosNatacao): string {
  const total = d.ambiente === 'mar' ? tempoTotalNatacao(d.blocos) : distanciaTotalNatacao(d.blocos)
  if (total <= 0) return rotuloAmbiente(d.ambiente)
  return d.ambiente === 'mar' ? `Tempo estimado: ${formatarTempo(total)}` : `Distância total: ${formatarNumero(total)} m`
}

/** Estado inicial do formulário: o treino salvo, ou piscina vazia (inclui treino antigo, que não tem estrutura). */
export function natacaoInicial(d: Record<string, unknown> | null | undefined): DadosNatacao {
  return dadosNatacaoDe(d) ?? { ambiente: d?.ambiente === 'mar' ? 'mar' : 'piscina', blocos: [] }
}

const ehBloco = (b: unknown): b is BlocoNatacao => {
  const x = b as Partial<BlocoNatacao> | null
  return !!x && typeof x.exercicio_id === 'string' && typeof x.nome === 'string' && !!x.parametros && typeof x.parametros === 'object'
}

/**
 * Dados estruturados de natação salvos em `modalidade_detalhes` — ou null para treino no formato antigo
 * (blocos de texto livre da versão anterior ou campos únicos), que não têm `exercicio_id`/`parametros`.
 */
export function dadosNatacaoDe(d: Record<string, unknown> | null | undefined): DadosNatacao | null {
  if (!d || !Array.isArray(d.blocos)) return null
  const blocos = (d.blocos as unknown[]).filter(ehBloco)
  if (blocos.length === 0) return null
  return { ambiente: d.ambiente === 'mar' ? 'mar' : 'piscina', blocos }
}

/** O que gravar em `modalidade_detalhes`: ambiente + blocos limpos (sem ritmo/observação vazios). */
export function montarDetalhesNatacao(d: DadosNatacao): Record<string, unknown> {
  return {
    ambiente: d.ambiente,
    blocos: d.blocos.map((b) => {
      const p = b.parametros
      return {
        id: b.id || crypto.randomUUID(),
        exercicio_id: b.exercicio_id,
        nome: b.nome,
        ...(b.is_custom ? { is_custom: true } : {}),
        parametros: {
          ...(p.distancia != null ? { distancia: p.distancia } : {}),
          ...(p.tempo != null ? { tempo: p.tempo } : {}),
          series: p.series,
          descanso: p.descanso,
          ...(p.ritmo?.trim() ? { ritmo: p.ritmo.trim() } : {}),
          ...(p.observacao?.trim() ? { observacao: p.observacao.trim() } : {}),
        },
      }
    }),
  }
}

/** Mínimo 1 bloco; cada um com distância (ou tempo) maior que zero e 1–20 séries. */
export function validarNatacao(d: DadosNatacao): string | null {
  if (d.blocos.length === 0) return 'Adicione ao menos um exercício ao treino.'
  for (const b of d.blocos) {
    const p = b.parametros
    const principal = p.distancia ?? p.tempo
    if (!principal || principal <= 0) return `Informe ${p.tempo != null ? 'o tempo' : 'a distância'} de "${b.nome}".`
    if (!Number.isInteger(p.series) || p.series < 1 || p.series > 20) return `Séries de "${b.nome}" devem ser de 1 a 20.`
  }
  return null
}
