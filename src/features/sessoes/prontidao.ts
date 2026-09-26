import type { Descritor } from './descritores'

export type FaixaProntidao = { label: string; cor: string }

/** 0–10: sono conta a favor, estresse/fadiga/dor contam contra. */
export function calcularProntidao(r: {
  pre_sleep?: number | null
  pre_stress?: number | null
  pre_fatigue?: number | null
  pre_muscle_pain?: number | null
}): number | null {
  if (r.pre_sleep == null || r.pre_stress == null || r.pre_fatigue == null || r.pre_muscle_pain == null) return null
  return (r.pre_sleep + (10 - r.pre_stress) + (10 - r.pre_fatigue) + (10 - r.pre_muscle_pain)) / 4
}

/** 0–3,9 Baixa · 4–6,9 Moderada · 7–10 Boa. */
export function faixaProntidao(valor: number): FaixaProntidao {
  if (valor < 4) return { label: 'Baixa', cor: 'text-red-600' }
  if (valor < 7) return { label: 'Moderada', cor: 'text-amber-600' }
  return { label: 'Boa', cor: 'text-emerald-600' }
}

export function descritorPara(descritores: Descritor[], valor: number): string {
  return descritores.find((d) => valor >= d.min && valor <= d.max)?.label ?? ''
}
