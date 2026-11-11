/** "vence no fechamento", "vence 1 dia após fechar", "vence 5 dias após fechar" (antes: "vence 0 dias após fechar"). */
export function textoVencimento(dias: number): string {
  if (dias <= 0) return 'vence no fechamento'
  return `vence ${dias} ${dias === 1 ? 'dia' : 'dias'} após fechar`
}
