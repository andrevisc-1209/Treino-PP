/**
 * Hoje mostra um alerta de ação por vez, na ordem em que o personal precisa agir:
 *  1. aulas que já passaram e faltam registrar (a cobrança depende delas);
 *  2. ciclos de cobrança para fechar;
 *  3. nada urgente: aí cabem os convites (indicação).
 * "Para registrar" é a própria lista de aulas, então ela já ocupa o lugar do alerta e o aviso de ciclo espera a sua vez.
 */
export type AlertaDeAcao = 'registrar' | 'ciclos' | null

export function alertaDeAcao(args: { paraRegistrar: number; ciclosParaFechar: number }): AlertaDeAcao {
  if (args.paraRegistrar > 0) return 'registrar'
  if (args.ciclosParaFechar > 0) return 'ciclos'
  return null
}
