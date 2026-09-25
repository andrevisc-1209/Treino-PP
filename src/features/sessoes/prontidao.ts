import type { Descritor } from './descritores'

export type FaixaProntidao = { label: string; cor: string }

/** 0–3,9 Baixa · 4–6,9 Moderada · 7–10 Boa. */
export function faixaProntidao(valor: number): FaixaProntidao {
  if (valor < 4) return { label: 'Baixa', cor: 'text-red-600' }
  if (valor < 7) return { label: 'Moderada', cor: 'text-amber-600' }
  return { label: 'Boa', cor: 'text-emerald-600' }
}

export function descritorPara(descritores: Descritor[], valor: number): string {
  return descritores.find((d) => valor >= d.min && valor <= d.max)?.label ?? ''
}
