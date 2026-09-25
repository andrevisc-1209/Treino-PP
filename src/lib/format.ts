// Formatação de valores exibidos ao usuário: datas em dd/mm/aaaa, sexo por
// extenso, números decimais com vírgula (pt-BR). Ponto único de import para
// não espalhar toISOString/toFixed/Number cru pela UI.

const NUMERO_FMT = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** 'YYYY-MM-DD' (ou prefixo de um timestamp) → 'dd/mm/aaaa'. */
export function formatarDataBR(dataISO: string | null | undefined): string {
  if (!dataISO) return '—'
  const [ano, mes, dia] = dataISO.slice(0, 10).split('-')
  if (!ano || !mes || !dia) return '—'
  return `${dia}/${mes}/${ano}`
}

export function formatarSexo(sexo: 'M' | 'F' | 'outro' | null | undefined): string {
  if (sexo === 'M') return 'Masculino'
  if (sexo === 'F') return 'Feminino'
  if (sexo === 'outro') return 'Outro'
  return '—'
}

/** Número com vírgula decimal, pt-BR (ex.: 68,5). */
export function formatarNumero(valor: number | null | undefined, casasMax = 1): string {
  if (valor == null || Number.isNaN(valor)) return '—'
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: casasMax }).format(valor)
}

/** Peso em kg formatado com vírgula (ex.: "68,5 kg"). */
export function formatarPesoKg(valor: number | null | undefined): string {
  if (valor == null) return '—'
  return `${NUMERO_FMT.format(valor)} kg`
}
