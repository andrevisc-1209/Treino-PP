import type { AmbienteCiclismo, TipoCiclismo } from '@/types/ciclismo'

export interface ConfigTipoCiclismo {
  id: TipoCiclismo
  nome: string
  descricao: string
  parametroPrincipal: 'distancia' | 'tempo'
  temSeries: boolean
}

export const TIPOS_CICLISMO_INDOOR: ConfigTipoCiclismo[] = [
  { id: 'recuperacao', nome: 'Recuperação', descricao: 'Pedalada leve, baixa intensidade.', parametroPrincipal: 'tempo', temSeries: false },
  { id: 'resistencia-base', nome: 'Resistência Base', descricao: 'Zona 2, longa duração e watts constantes.', parametroPrincipal: 'tempo', temSeries: false },
  { id: 'tempo', nome: 'Tempo (FTP)', descricao: 'Esforço sustentado próximo ao FTP.', parametroPrincipal: 'tempo', temSeries: false },
  { id: 'hiit', nome: 'HIIT', descricao: 'Blocos de alta intensidade com descanso.', parametroPrincipal: 'tempo', temSeries: true },
  { id: 'piramide', nome: 'Pirâmide', descricao: 'Intensidade cresce e decresce em blocos.', parametroPrincipal: 'tempo', temSeries: true },
]

export const TIPOS_CICLISMO_OUTDOOR: ConfigTipoCiclismo[] = [
  { id: 'recuperacao', nome: 'Recuperação', descricao: 'Pedalada leve, zona 1.', parametroPrincipal: 'distancia', temSeries: false },
  { id: 'resistencia-base', nome: 'Fundo (Base)', descricao: 'Volume longo em zona 2.', parametroPrincipal: 'distancia', temSeries: false },
  { id: 'subidas', nome: 'Subidas', descricao: 'Repetições em aclive.', parametroPrincipal: 'distancia', temSeries: true },
  { id: 'sprints', nome: 'Sprints', descricao: 'Tiros curtos de potência máxima.', parametroPrincipal: 'distancia', temSeries: true },
  { id: 'fartlek', nome: 'Fartlek', descricao: 'Variações livres de intensidade.', parametroPrincipal: 'tempo', temSeries: false },
  { id: 'longo', nome: 'Longo', descricao: 'Saída longa de resistência.', parametroPrincipal: 'distancia', temSeries: false },
]

export const tiposCiclismo = (a: AmbienteCiclismo): ConfigTipoCiclismo[] => (a === 'indoor' ? TIPOS_CICLISMO_INDOOR : TIPOS_CICLISMO_OUTDOOR)

export const CHIPS_CICLISMO = { tempo: [20, 30, 45, 60, 90, 120], distancia: [20, 40, 60, 100, 150] }
