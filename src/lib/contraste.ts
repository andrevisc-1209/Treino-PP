// Cálculo de contraste WCAG (relative luminance / contrast ratio), usado
// pelo teste do design system pra garantir AA (4.5:1 texto normal, 3:1
// texto grande / componentes de UI) nos pares de cor do tema.

function hexParaRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function luminancia([r, g, b]: [number, number, number]): number {
  const canal = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const [R, G, B] = [canal(r), canal(g), canal(b)]
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

/** Razão de contraste WCAG entre duas cores hex (1 a 21). */
export function contrasteWCAG(corA: string, corB: string): number {
  const lA = luminancia(hexParaRgb(corA))
  const lB = luminancia(hexParaRgb(corB))
  const [claro, escuro] = lA > lB ? [lA, lB] : [lB, lA]
  return (claro + 0.05) / (escuro + 0.05)
}

export const AA_TEXTO_NORMAL = 4.5
export const AA_TEXTO_GRANDE_OU_UI = 3
