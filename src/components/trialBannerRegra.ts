// Como e quando o banner do teste grátis aparece. Antes: um bloco escuro com botão no topo de TODAS as telas, o tempo todo (~60 px fixos que
// empurram listas e agenda). Agora (auditoria de UX de 28/10/2026, BACKLOG item 96):
//   - tela Hoje: uma linha compacta "Teste grátis: N dias restantes ›" (toca e abre os planos);
//   - nas outras telas: nada, até os últimos dias;
//   - nos últimos 5 dias, em qualquer tela: o banner COMPLETO, com o botão "Assinar agora".
// A condição comercial continua acessível em Configurações → Assinatura.
export const DIAS_AVISO_FIM_DO_TESTE = 5

export type VarianteBannerTeste = 'completo' | 'compacto' | null

export function varianteDoBannerDoTeste(pathname: string, diasRestantes: number | null): VarianteBannerTeste {
  if (diasRestantes === null || diasRestantes <= 0) return null
  if (diasRestantes <= DIAS_AVISO_FIM_DO_TESTE) return 'completo'
  return pathname === '/' ? 'compacto' : null
}
