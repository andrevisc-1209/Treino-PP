// Aviso de renovação para quem JÁ paga (o pagamento é avulso: não renova sozinho). Espelha o aviso do teste grátis:
//   - 7 a 4 dias do fim: só uma linha compacta na tela Hoje;
//   - nos últimos 3 dias: banner completo, com o botão "Renovar", em qualquer tela.
// Os mesmos prazos pedidos por e-mail/WhatsApp (5, 3 e 1 dia) ficam em supabase/functions/_shared/renovacao.ts.
export const DIAS_AVISO_RENOVACAO = 7
export const DIAS_AVISO_RENOVACAO_FORTE = 3

export type VarianteAvisoRenovacao = 'completo' | 'compacto' | null

/** Dias (arredondados para cima) até o fim do acesso, considerando o mês grátis de indicação; null sem data, ≤ 0 se já acabou. */
export function diasParaFimDoAcesso(assinaturaFim: Date | null, bonusAte: Date | null, agora: number = Date.now()): number | null {
  const fins = [assinaturaFim, bonusAte].filter((d): d is Date => !!d).map((d) => d.getTime())
  if (fins.length === 0) return null
  return Math.ceil((Math.max(...fins) - agora) / 86_400_000)
}

export function varianteDoAvisoDeRenovacao(pathname: string, diasRestantes: number | null): VarianteAvisoRenovacao {
  if (diasRestantes === null || diasRestantes <= 0 || diasRestantes > DIAS_AVISO_RENOVACAO) return null
  if (diasRestantes <= DIAS_AVISO_RENOVACAO_FORTE) return 'completo'
  return pathname === '/' ? 'compacto' : null
}
