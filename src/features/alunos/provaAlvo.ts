import { diasEntre } from '@/lib/datas'

export type ModalidadeFoco = 'ciclismo' | 'corrida' | 'futebol' | 'futevolei' | 'natacao' | 'triathlon' | 'trilha_caminhada' | 'volei' | 'outros'

/** Ordem alfabética (pt-BR); "Outros" sempre por último. Os valores têm CHECK no banco (migration 20261042). */
export const MODALIDADES_FOCO: { valor: ModalidadeFoco; rotulo: string }[] = [
  { valor: 'ciclismo', rotulo: 'Ciclismo' },
  { valor: 'corrida', rotulo: 'Corrida' },
  { valor: 'futebol', rotulo: 'Futebol' },
  { valor: 'futevolei', rotulo: 'Futevôlei' },
  { valor: 'natacao', rotulo: 'Natação' },
  { valor: 'triathlon', rotulo: 'Triathlon' },
  { valor: 'trilha_caminhada', rotulo: 'Trilha / Caminhada' },
  { valor: 'volei', rotulo: 'Vôlei' },
  { valor: 'outros', rotulo: 'Outros' },
]

const PROVAS_TRIATHLON = [
  { valor: 'sprint', rotulo: 'Sprint' },
  { valor: 'olimpico', rotulo: 'Olímpico' },
  { valor: '70.3', rotulo: '70.3' },
  { valor: 'ironman', rotulo: 'Ironman' },
]
const PROVAS_CORRIDA = [
  { valor: '5k', rotulo: '5 km' },
  { valor: '10k', rotulo: '10 km' },
  { valor: '21k', rotulo: 'Meia maratona (21 km)' },
  { valor: '42k', rotulo: 'Maratona (42 km)' },
]

/** Provas oferecidas para a modalidade foco (só triathlon e corrida têm prova alvo). */
export function provasDoFoco(foco: string | null | undefined): { valor: string; rotulo: string }[] {
  if (foco === 'triathlon') return PROVAS_TRIATHLON
  if (foco === 'corrida') return PROVAS_CORRIDA
  return []
}

export function rotuloProva(prova: string | null | undefined): string | null {
  return [...PROVAS_TRIATHLON, ...PROVAS_CORRIDA].find((p) => p.valor === prova)?.rotulo ?? null
}

export const rotuloFoco = (foco: string | null | undefined): string | null => MODALIDADES_FOCO.find((f) => f.valor === foco)?.rotulo ?? null

/** Dias até a prova (hoje conta 0); null se não há data ou se já passou. */
export function diasParaProva(dataProva: string | null | undefined, hojeISO: string): number | null {
  if (!dataProva) return null
  const d = diasEntre(hojeISO, dataProva)
  return d >= 0 ? d : null
}

/** "🏁 Ironman Floripa 2027 · 47 dias" (com nome) / "🏁 Ironman · 47 dias" / "🏁 Prova · hoje". null se a prova não está no futuro. */
export function badgeProva(prova: string | null | undefined, dataProva: string | null | undefined, hojeISO: string, nomeProva?: string | null): string | null {
  const dias = diasParaProva(dataProva, hojeISO)
  if (dias === null) return null
  const quando = dias === 0 ? 'hoje' : dias === 1 ? 'amanhã' : `${dias} dias`
  return `🏁 ${nomeProva?.trim() || rotuloProva(prova) || 'Prova'} · ${quando}`
}
