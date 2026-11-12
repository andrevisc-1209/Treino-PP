/** Totais da RPC `admin_taxa_registro`: nenhum personal nem aluno é identificado. */
export type TaxaRegistro = {
  aulasPassadas: number
  aulasRegistradas: number
  personaisComAulas: number
  personaisRegistrando: number
}

const n = (v: unknown): number => {
  const x = Number(v)
  return Number.isFinite(x) ? x : 0
}

export function normalizarTaxaRegistro(raw: unknown): TaxaRegistro {
  const o = (raw ?? {}) as Record<string, unknown>
  return {
    aulasPassadas: n(o.aulas_passadas_30d),
    aulasRegistradas: n(o.aulas_registradas_30d),
    personaisComAulas: n(o.personais_com_aulas_30d),
    personaisRegistrando: n(o.personais_registrando),
  }
}

/** Aulas já passadas que tiveram baixa, em %; null sem aulas passadas (aí a tela mostra "–", não "0%"). */
export const taxaDeRegistro = (r: Pick<TaxaRegistro, 'aulasPassadas' | 'aulasRegistradas'>): number | null =>
  r.aulasPassadas > 0 ? Math.round((r.aulasRegistradas / r.aulasPassadas) * 100) : null

/** Poucos personais: o número vira anedota. Abaixo disto a tela avisa que a amostra é pequena. */
export const PERSONAIS_MINIMOS = 5
