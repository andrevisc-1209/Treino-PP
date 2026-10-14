import type { TipoCorrida } from '@/types/corrida'

export interface ConfigTipoCorrida {
  id: TipoCorrida
  nome: string
  descricao: string
  parametroPrincipal: 'distancia' | 'tempo'
  temSeries: boolean
  chipsSugestao: number[] // km ou min (metros no intervalado/hill; nº de acelerações nos strides)
}

export const TIPOS_CORRIDA: ConfigTipoCorrida[] = [
  { id: 'regenerativo', nome: 'Regenerativo', descricao: 'Ritmo leve de recuperação ativa.', parametroPrincipal: 'tempo', temSeries: false, chipsSugestao: [20, 30, 40, 45] },
  { id: 'aerobico-base', nome: 'Aeróbico Base', descricao: 'Zona 2, constrói motor aeróbico.', parametroPrincipal: 'distancia', temSeries: false, chipsSugestao: [5, 8, 10, 12, 15] },
  { id: 'tempo-limiar', nome: 'Tempo / Limiar', descricao: 'Esforço sustentado no limiar anaeróbico.', parametroPrincipal: 'distancia', temSeries: false, chipsSugestao: [5, 8, 10, 12] },
  { id: 'fartlek', nome: 'Fartlek', descricao: 'Variações livres de ritmo durante a corrida.', parametroPrincipal: 'tempo', temSeries: false, chipsSugestao: [30, 40, 45, 60] },
  { id: 'progressivo', nome: 'Progressivo', descricao: 'Começa leve e termina no ritmo de prova.', parametroPrincipal: 'distancia', temSeries: false, chipsSugestao: [6, 8, 10, 12] },
  { id: 'intervalado-curto', nome: 'Intervalado Curto', descricao: 'Tiros de 200m–400m com descanso completo.', parametroPrincipal: 'distancia', temSeries: true, chipsSugestao: [200, 300, 400] },
  { id: 'intervalado-longo', nome: 'Intervalado Longo', descricao: 'Tiros de 800m–1200m no limiar.', parametroPrincipal: 'distancia', temSeries: true, chipsSugestao: [800, 1000, 1200, 1600] },
  { id: 'long-run', nome: 'Long Run', descricao: 'Corrida longa semanal, base do endurance.', parametroPrincipal: 'distancia', temSeries: false, chipsSugestao: [15, 18, 21, 25, 30, 32] },
  { id: 'race-pace', nome: 'Race Pace', descricao: 'Treino no ritmo exato da prova alvo.', parametroPrincipal: 'distancia', temSeries: false, chipsSugestao: [5, 8, 10, 12, 15] },
  { id: 'hill-repeats', nome: 'Hill Repeats (Subidas)', descricao: 'Tiros em aclive para força e potência.', parametroPrincipal: 'distancia', temSeries: true, chipsSugestao: [100, 200, 400, 600] },
  { id: 'strides', nome: 'Strides (Acelerações)', descricao: 'Acelerações curtas de 20s para ativar fibras.', parametroPrincipal: 'tempo', temSeries: true, chipsSugestao: [4, 6, 8, 10] },
]

export const configTipoCorrida = (id: TipoCorrida): ConfigTipoCorrida => TIPOS_CORRIDA.find((t) => t.id === id) ?? TIPOS_CORRIDA[1]
