// Exportar alunos em CSV (portabilidade, LGPD art. 18, V). Mesmas colunas do modelo da importação, então o arquivo volta pela importação.
// SÓ dados básicos (nome, telefone, e-mail, nascimento, sexo, objetivos) + situação. Nada de saúde (lesão, cirurgia, medicamentos, altura):
// o CSV é um arquivo solto no aparelho, sem a proteção do app. Regras puras (sem I/O).

import { formatarDataBR } from '@/lib/format'

export const COLUNAS_EXPORTACAO = ['nome', 'telefone', 'email', 'nascimento', 'sexo', 'objetivos', 'situacao'] as const

export type AlunoParaExportar = {
  name: string
  phone: string | null
  email: string | null
  birth_date: string | null
  sex: 'M' | 'F' | 'outro' | null
  objetivos: string[]
  active: boolean
}

const SEXO: Record<string, string> = { M: 'M', F: 'F', outro: 'Outro' }

/**
 * Planilhas (Excel, Planilhas Google) executam como fórmula o texto que começa com = + - @ (ou tab/CR): um nome de aluno digitado
 * assim viraria um ataque ao abrir o arquivo. O apóstrofo na frente faz virar texto comum.
 */
export function neutralizarFormula(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor
}

/** Escapa a célula do CSV: entre aspas quando tem ; " ou quebra de linha, com aspas dobradas. */
export function celulaCsv(valor: string): string {
  const v = neutralizarFormula(valor)
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

export function montarCsvAlunos(alunos: AlunoParaExportar[]): string {
  const linhas = alunos.map((a) =>
    [
      a.name,
      a.phone ?? '',
      a.email ?? '',
      a.birth_date ? formatarDataBR(a.birth_date) : '',
      a.sex ? SEXO[a.sex] : '',
      a.objetivos.join('|'),
      a.active ? 'ativo' : 'arquivado',
    ]
      .map(celulaCsv)
      .join(';'),
  )
  return [COLUNAS_EXPORTACAO.join(';'), ...linhas].join('\r\n') + '\r\n'
}

/** Nome do arquivo com a data de hoje (aaaa-mm-dd): alunos-2026-10-28.csv */
export const nomeDoArquivoExportacao = (hojeISO: string): string => `alunos-${hojeISO}.csv`
