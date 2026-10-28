// Por qual caminho o personal quer trazer os alunos: planilha (modelo + arquivo) ou lista bagunçada (prompt para IA + texto colado).
// Quem chega pelo botão "Usar uma IA" cai direto no segundo (/alunos/importar?via=ia).
export type Via = 'planilha' | 'ia'

export const viaInicial = (valor: string | null): Via => (valor === 'ia' ? 'ia' : 'planilha')

export const ROTA_IMPORTAR = '/alunos/importar'
export const ROTA_IMPORTAR_COM_IA = `${ROTA_IMPORTAR}?via=ia`
