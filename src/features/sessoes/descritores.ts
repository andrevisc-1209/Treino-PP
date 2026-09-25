export type Descritor = { min: number; max: number; label: string }

export const DESCRITORES_SONO: Descritor[] = [
  { min: 0, max: 2, label: 'Péssimo' },
  { min: 3, max: 4, label: 'Ruim' },
  { min: 5, max: 6, label: 'Regular' },
  { min: 7, max: 8, label: 'Bom' },
  { min: 9, max: 10, label: 'Excelente' },
]

export const DESCRITORES_ESTRESSE: Descritor[] = [
  { min: 0, max: 2, label: 'Nenhum' },
  { min: 3, max: 4, label: 'Leve' },
  { min: 5, max: 6, label: 'Moderado' },
  { min: 7, max: 8, label: 'Alto' },
  { min: 9, max: 10, label: 'Máximo' },
]

export const DESCRITORES_FADIGA: Descritor[] = [
  { min: 0, max: 2, label: 'Nenhuma' },
  { min: 3, max: 4, label: 'Leve' },
  { min: 5, max: 6, label: 'Moderada' },
  { min: 7, max: 8, label: 'Alta' },
  { min: 9, max: 10, label: 'Muito alta' },
]

export const DESCRITORES_DOR: Descritor[] = [
  { min: 0, max: 2, label: 'Nenhuma' },
  { min: 3, max: 4, label: 'Leve' },
  { min: 5, max: 6, label: 'Moderada' },
  { min: 7, max: 8, label: 'Forte' },
  { min: 9, max: 10, label: 'Muito forte' },
]

export const DESCRITORES_PSE: Descritor[] = [
  { min: 0, max: 2, label: 'Repouso' },
  { min: 3, max: 4, label: 'Moderado' },
  { min: 5, max: 6, label: 'Difícil' },
  { min: 7, max: 8, label: 'Muito difícil' },
  { min: 9, max: 10, label: 'Máximo' },
]

export const DESCRITORES_NOTA: Descritor[] = [
  { min: 0, max: 2, label: 'Fraco' },
  { min: 3, max: 4, label: 'Regular' },
  { min: 5, max: 6, label: 'Bom' },
  { min: 7, max: 8, label: 'Muito bom' },
  { min: 9, max: 10, label: 'Excelente' },
]
