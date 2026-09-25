const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarBRL(valor: number): string {
  return BRL.format(valor)
}
