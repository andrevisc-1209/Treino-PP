// Avaliação escrita pelo personal no fim do ciclo/pacote (conquistas, pontos de atenção, próximos objetivos). Sem I/O.

export const LIMITE_AVALIACAO = 500

export type AvaliacaoPersonal = { conquistas: string | null; atencao: string | null; proximos: string | null }

export type AvaliacaoTextos = { conquistas: string; atencao: string; proximos: string }

export const AVALIACAO_VAZIA: AvaliacaoTextos = { conquistas: '', atencao: '', proximos: '' }

type CamposFatura = { avaliacao_conquistas?: string | null; avaliacao_atencao?: string | null; avaliacao_proximos?: string | null }

/** Colunas da fatura → avaliação; null quando nada foi escrito (nenhuma seção aparece no relatório). */
export function avaliacaoDaFatura(f: CamposFatura): AvaliacaoPersonal | null {
  const a = { conquistas: f.avaliacao_conquistas?.trim() || null, atencao: f.avaliacao_atencao?.trim() || null, proximos: f.avaliacao_proximos?.trim() || null }
  return a.conquistas || a.atencao || a.proximos ? a : null
}

export function textosDaAvaliacao(f: CamposFatura): AvaliacaoTextos {
  return { conquistas: f.avaliacao_conquistas ?? '', atencao: f.avaliacao_atencao ?? '', proximos: f.avaliacao_proximos ?? '' }
}

/** Textos digitados → colunas (espaços nas pontas saem; vazio vira null). */
export function colunasDaAvaliacao(t: AvaliacaoTextos): { avaliacao_conquistas: string | null; avaliacao_atencao: string | null; avaliacao_proximos: string | null } {
  return { avaliacao_conquistas: t.conquistas.trim() || null, avaliacao_atencao: t.atencao.trim() || null, avaliacao_proximos: t.proximos.trim() || null }
}

export function avaliacaoAlterada(a: AvaliacaoTextos, b: AvaliacaoTextos): boolean {
  return a.conquistas.trim() !== b.conquistas.trim() || a.atencao.trim() !== b.atencao.trim() || a.proximos.trim() !== b.proximos.trim()
}

export function validarAvaliacao(t: AvaliacaoTextos): string | null {
  for (const [rotulo, texto] of [['Conquistas', t.conquistas], ['Pontos de atenção', t.atencao], ['Próximos objetivos', t.proximos]] as const) {
    if (texto.trim().length > LIMITE_AVALIACAO) return `${rotulo}: no máximo ${LIMITE_AVALIACAO} caracteres`
  }
  return null
}

const SEM_ACENTO = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const PALAVRAS_DE_SAUDE = /\b(lesao|lesoes|lesionad[oa]|cirurgia|cirurgias|operad[oa]|medicamento|medicamentos|remedio|remedios|medicacao|diagnostico|doenca|hernia|fratura|tendinite|diabetes|hipertensao|pressao alta|depress|ansiedade)\b/

/** O texto parece citar saúde (lesão, cirurgia, medicamento…)? Esses dados não devem ir no relatório que o personal compartilha. */
export function citaDadoDeSaude(t: AvaliacaoTextos): boolean {
  return PALAVRAS_DE_SAUDE.test(SEM_ACENTO(`${t.conquistas} ${t.atencao} ${t.proximos}`))
}
