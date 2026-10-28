// Por qual caminho o personal quer trazer os alunos: lista bagunçada (prompt para IA + texto colado) ou planilha (modelo + arquivo).
// O caminho da IA vem PRIMEIRO e é o padrão: é o mais fácil para quem tem os alunos em caderno, contatos ou conversas.
// Quem chega pelo botão "Tenho uma planilha" cai direto no outro (/alunos/importar?via=planilha).
export type Via = 'ia' | 'planilha'

export const viaInicial = (valor: string | null): Via => (valor === 'planilha' ? 'planilha' : 'ia')

export const ROTA_IMPORTAR = '/alunos/importar'
export const ROTA_IMPORTAR_COM_IA = `${ROTA_IMPORTAR}?via=ia`
export const ROTA_IMPORTAR_COM_PLANILHA = `${ROTA_IMPORTAR}?via=planilha`
