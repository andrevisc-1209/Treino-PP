import type { AmbienteNatacao, GrupoNatacao } from '@/types/natacao'

export interface ExercicioNatacao {
  id: string
  nome: string
  grupo: GrupoNatacao
  ambiente: AmbienteNatacao | 'ambos'
  descricao?: string
  parametroPrincipal: 'distancia' | 'tempo' // metros ou segundos
  valorSugerido?: number
  chipsSugestao?: number[] // valores rápidos
  /** exercício criado pelo personal (tabela exercicios_natacao_custom) */
  is_custom?: boolean
}

type Linha = [string, string, ExercicioNatacao['ambiente'], ExercicioNatacao['parametroPrincipal'], number, number[]]

const montar = (grupo: GrupoNatacao, linhas: Linha[]): ExercicioNatacao[] =>
  linhas.map(([id, nome, ambiente, parametroPrincipal, valorSugerido, chipsSugestao]) => ({ id, nome, grupo, ambiente, parametroPrincipal, valorSugerido, chipsSugestao }))

export const EXERCICIOS_NATACAO: ExercicioNatacao[] = [
  ...montar('estilo', [
    ['crawl', 'Crawl (Livre)', 'piscina', 'distancia', 400, [100, 200, 400, 800, 1500]],
    ['costas', 'Costas', 'piscina', 'distancia', 200, [50, 100, 200, 400]],
    ['peito', 'Peito', 'piscina', 'distancia', 200, [50, 100, 200, 400]],
    ['borboleta', 'Borboleta (Fly)', 'piscina', 'distancia', 100, [25, 50, 100, 200]],
    ['medley', 'Medley Individual (IM)', 'piscina', 'distancia', 200, [100, 200, 400]],
    ['head-up', 'Nado Polo (Head-up)', 'ambos', 'distancia', 200, [50, 100, 200]],
    ['submerso', 'Nado Submerso (Apneia)', 'piscina', 'distancia', 25, [15, 25, 50]],
  ]),
  ...montar('educativo', [
    ['catch-up', 'Catch-up (Piteira)', 'piscina', 'distancia', 200, [100, 200, 400]],
    ['punho-fechado', 'Punho Fechado (Fist)', 'piscina', 'distancia', 200, [100, 200, 400]],
    ['um-braco', '1 Braço (Alternado)', 'piscina', 'distancia', 200, [100, 200, 400]],
    ['perna-lateral', '6-Kick Switch (Perna Lateral)', 'piscina', 'distancia', 200, [100, 200, 400]],
  ]),
  ...montar('acessorio', [
    ['prancha', 'Prancha', 'piscina', 'distancia', 400, [200, 400, 800]],
    ['prancha-lateral', 'Prancha Lateral', 'piscina', 'distancia', 200, [100, 200, 400]],
    ['boia-pull', 'Boia (Pull Buoy)', 'piscina', 'distancia', 400, [200, 400, 800]],
    ['palmar', 'Palmar', 'piscina', 'distancia', 400, [200, 400, 800]],
    ['boia-palmar', 'Boia + Palmar', 'piscina', 'distancia', 400, [200, 400, 800]],
    ['pe-de-pato', 'Nadadeiras (Pé de Pato)', 'piscina', 'distancia', 800, [400, 800, 1500]],
    ['pe-pato-palmar', 'Nadadeiras (Pé de Pato) + Palmar', 'piscina', 'distancia', 800, [400, 800, 1500]],
    ['paraquedas', 'Paraquedas de Arraste', 'piscina', 'distancia', 200, [50, 100, 200]],
    ['elastico', 'Elástico Estático (Tethered)', 'piscina', 'tempo', 30, [15, 30, 45, 60]],
  ]),
  ...montar('serie', [
    ['sprint', 'Sprint (Velocidade Pura)', 'piscina', 'distancia', 50, [15, 25, 50]],
    ['aerobico', 'Série Aeróbica (Endurance)', 'piscina', 'distancia', 1000, [400, 800, 1000, 1500]],
    ['negative-split', 'Negative Split (Progressivo)', 'piscina', 'distancia', 200, [100, 200, 400]],
    ['race-pace', 'Race Pace (Ritmo de Prova)', 'piscina', 'distancia', 200, [100, 200, 400]],
    ['hipoxia', 'Hipóxia (Respiração Restrita)', 'piscina', 'distancia', 400, [200, 400, 800]],
    ['descendente', 'Série Descendente', 'piscina', 'distancia', 100, [50, 100, 200]],
  ]),
  ...montar('mar', [
    ['mar-crawl', 'Crawl em Mar Aberto', 'mar', 'tempo', 1800, [600, 1200, 1800, 3600]],
    ['mar-head-up', 'Head-up em Mar Aberto', 'mar', 'tempo', 600, [300, 600, 900]],
    ['mar-sprint', 'Sprint em Mar Aberto', 'mar', 'tempo', 60, [30, 60, 90, 120]],
    ['mar-percurso', 'Percurso Definido', 'mar', 'tempo', 3600, [1800, 3600, 5400, 7200]],
    ['mar-ondas', 'Treinamento em Ondas', 'mar', 'tempo', 900, [300, 600, 900, 1800]],
    ['mar-fartlek', 'Fartlek em Mar Aberto', 'mar', 'tempo', 2400, [1200, 1800, 2400, 3600]],
  ]),
]

export const GRUPOS_NATACAO: { key: GrupoNatacao; label: string }[] = [
  { key: 'estilo', label: 'Estilos' },
  { key: 'educativo', label: 'Educativos' },
  { key: 'acessorio', label: 'Acessórios' },
  { key: 'serie', label: 'Séries' },
  { key: 'mar', label: 'Mar Aberto' },
]

export const CHIPS_PADRAO = { distancia: [50, 100, 200, 400, 800, 1500], tempo: [60, 300, 600, 1800, 3600] }

/** Exercício serve ao ambiente? ('ambos' serve aos dois.) */
export const serveAoAmbiente = (e: Pick<ExercicioNatacao, 'ambiente'>, ambiente: AmbienteNatacao): boolean => e.ambiente === 'ambos' || e.ambiente === ambiente
