// Ativação: o personal novo precisa chegar a 3 alunos cadastrados. Enquanto não chega, a tela Hoje mostra UM cartão de ativação (em vez de
// checklist de 4 itens, três contadores zerados, Pix e clima disputando atenção). Regras puras; a tela só mostra.
// (Auditoria de UX de 28/10/2026: ChatGPT e Gemini apontaram o mesmo problema; docs/BACKLOG.md item 96.)

export const ALUNOS_PARA_ATIVAR = 3
export const CHAVE_ATIVACAO_DISPENSADA = 'treino_ativacao_dispensada'

/** Mostra o cartão enquanto há menos de 3 alunos e a pessoa não dispensou. `total` indefinido = ainda carregando (não mostra). */
export const emAtivacao = (total: number | undefined, dispensada: boolean): boolean => total !== undefined && total < ALUNOS_PARA_ATIVAR && !dispensada

export const textoProgresso = (total: number): string => `${Math.min(total, ALUNOS_PARA_ATIVAR)} de ${ALUNOS_PARA_ATIVAR} cadastrados`

/** 0 a 100, para a barra de progresso. */
export const percentualAtivacao = (total: number): number => Math.round((Math.min(Math.max(total, 0), ALUNOS_PARA_ATIVAR) / ALUNOS_PARA_ATIVAR) * 100)

export function lerDispensada(): boolean {
  try {
    return localStorage.getItem(CHAVE_ATIVACAO_DISPENSADA) === '1'
  } catch {
    return false
  }
}

export function gravarDispensada(): void {
  try {
    localStorage.setItem(CHAVE_ATIVACAO_DISPENSADA, '1')
  } catch {
    /* sem armazenamento: o cartão volta na próxima abertura, e tudo bem */
  }
}
